const WINDOWS_1252_EXTRA = {
    0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†",
    0x87: "‡", 0x88: "ˆ", 0x89: "‰", 0x8a: "Š", 0x8b: "‹", 0x8c: "Œ",
    0x8e: "Ž", 0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•",
    0x96: "–", 0x97: "—", 0x98: "˜", 0x99: "™", 0x9a: "š", 0x9b: "›",
    0x9c: "œ", 0x9e: "ž", 0x9f: "Ÿ",
};
const WINDOWS_1252_REVERSE = {};
for (const [code, char] of Object.entries(WINDOWS_1252_EXTRA)) {
    WINDOWS_1252_REVERSE[char] = Number.parseInt(code, 10);
}
let _utf8Decoder;
let _utf8Encoder;
function utf8Decoder() {
    if (typeof globalThis.TextDecoder === "undefined")
        return undefined;
    return (_utf8Decoder !== null && _utf8Decoder !== void 0 ? _utf8Decoder : (_utf8Decoder = new globalThis.TextDecoder("utf-8")));
}
function utf8Encoder() {
    if (typeof globalThis.TextEncoder === "undefined")
        return undefined;
    return (_utf8Encoder !== null && _utf8Encoder !== void 0 ? _utf8Encoder : (_utf8Encoder = new globalThis.TextEncoder()));
}
const CHUNK = 32 * 1024;
const REPLACEMENT = 0xfffd;
/**
 * Decode text from binary data
 */
export function textDecode(bytes, encoding = "utf-8") {
    switch (encoding.toLowerCase()) {
        case "utf-8":
        case "utf8": {
            const dec = utf8Decoder();
            return dec ? dec.decode(bytes) : decodeUTF8(bytes);
        }
        case "utf-16le":
            return decodeUTF16LE(bytes);
        case "us-ascii":
        case "ascii":
            return decodeASCII(bytes);
        case "latin1":
        case "iso-8859-1":
            return decodeLatin1(bytes);
        case "windows-1252":
            return decodeWindows1252(bytes);
        default:
            throw new RangeError(`Encoding '${encoding}' not supported`);
    }
}
export function textEncode(input = "", encoding = "utf-8") {
    switch (encoding.toLowerCase()) {
        case "utf-8":
        case "utf8": {
            const enc = utf8Encoder();
            return enc ? enc.encode(input) : encodeUTF8(input);
        }
        case "utf-16le":
            return encodeUTF16LE(input);
        case "us-ascii":
        case "ascii":
            return encodeASCII(input);
        case "latin1":
        case "iso-8859-1":
            return encodeLatin1(input);
        case "windows-1252":
            return encodeWindows1252(input);
        default:
            throw new RangeError(`Encoding '${encoding}' not supported`);
    }
}
function appendCodePoint(out, cp) {
    if (cp <= 0xffff) {
        out.push(String.fromCharCode(cp));
        return;
    }
    cp -= 0x10000;
    out.push(String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff)));
}
function flushChunk(parts, chunk) {
    if (chunk.length === 0)
        return;
    parts.push(String.fromCharCode.apply(null, chunk));
    chunk.length = 0;
}
function pushCodeUnit(parts, chunk, codeUnit) {
    chunk.push(codeUnit);
    if (chunk.length >= CHUNK)
        flushChunk(parts, chunk);
}
function pushCodePoint(parts, chunk, cp) {
    if (cp <= 0xffff) {
        pushCodeUnit(parts, chunk, cp);
        return;
    }
    cp -= 0x10000;
    pushCodeUnit(parts, chunk, 0xd800 + (cp >> 10));
    pushCodeUnit(parts, chunk, 0xdc00 + (cp & 0x3ff));
}
function decodeUTF8(bytes) {
    const parts = [];
    const chunk = [];
    let i = 0;
    // Match TextDecoder("utf-8") default BOM handling
    if (bytes.length >= 3 &&
        bytes[0] === 0xef &&
        bytes[1] === 0xbb &&
        bytes[2] === 0xbf) {
        i = 3;
    }
    while (i < bytes.length) {
        const b1 = bytes[i];
        if (b1 <= 0x7f) {
            pushCodeUnit(parts, chunk, b1);
            i++;
            continue;
        }
        // Invalid leading bytes: continuation byte or impossible prefixes
        if (b1 < 0xc2 || b1 > 0xf4) {
            pushCodeUnit(parts, chunk, REPLACEMENT);
            i++;
            continue;
        }
        // 2-byte sequence
        if (b1 <= 0xdf) {
            if (i + 1 >= bytes.length) {
                pushCodeUnit(parts, chunk, REPLACEMENT);
                i++;
                continue;
            }
            const b2 = bytes[i + 1];
            if ((b2 & 0xc0) !== 0x80) {
                pushCodeUnit(parts, chunk, REPLACEMENT);
                i++;
                continue;
            }
            const cp = ((b1 & 0x1f) << 6) | (b2 & 0x3f);
            pushCodeUnit(parts, chunk, cp);
            i += 2;
            continue;
        }
        // 3-byte sequence
        if (b1 <= 0xef) {
            if (i + 2 >= bytes.length) {
                pushCodeUnit(parts, chunk, REPLACEMENT);
                i++;
                continue;
            }
            const b2 = bytes[i + 1];
            const b3 = bytes[i + 2];
            const valid = (b2 & 0xc0) === 0x80 &&
                (b3 & 0xc0) === 0x80 &&
                !(b1 === 0xe0 && b2 < 0xa0) && // overlong
                !(b1 === 0xed && b2 >= 0xa0); // surrogate range
            if (!valid) {
                pushCodeUnit(parts, chunk, REPLACEMENT);
                i++;
                continue;
            }
            const cp = ((b1 & 0x0f) << 12) |
                ((b2 & 0x3f) << 6) |
                (b3 & 0x3f);
            pushCodeUnit(parts, chunk, cp);
            i += 3;
            continue;
        }
        // 4-byte sequence
        if (i + 3 >= bytes.length) {
            pushCodeUnit(parts, chunk, REPLACEMENT);
            i++;
            continue;
        }
        const b2 = bytes[i + 1];
        const b3 = bytes[i + 2];
        const b4 = bytes[i + 3];
        const valid = (b2 & 0xc0) === 0x80 &&
            (b3 & 0xc0) === 0x80 &&
            (b4 & 0xc0) === 0x80 &&
            !(b1 === 0xf0 && b2 < 0x90) && // overlong
            !(b1 === 0xf4 && b2 > 0x8f); // > U+10FFFF
        if (!valid) {
            pushCodeUnit(parts, chunk, REPLACEMENT);
            i++;
            continue;
        }
        const cp = ((b1 & 0x07) << 18) |
            ((b2 & 0x3f) << 12) |
            ((b3 & 0x3f) << 6) |
            (b4 & 0x3f);
        pushCodePoint(parts, chunk, cp);
        i += 4;
    }
    flushChunk(parts, chunk);
    return parts.join("");
}
function decodeUTF16LE(bytes) {
    const parts = [];
    const chunk = [];
    const len = bytes.length;
    let i = 0;
    while (i + 1 < len) {
        const u1 = bytes[i] | (bytes[i + 1] << 8);
        i += 2;
        // High surrogate
        if (u1 >= 0xd800 && u1 <= 0xdbff) {
            if (i + 1 < len) {
                const u2 = bytes[i] | (bytes[i + 1] << 8);
                if (u2 >= 0xdc00 && u2 <= 0xdfff) {
                    pushCodeUnit(parts, chunk, u1);
                    pushCodeUnit(parts, chunk, u2);
                    i += 2;
                }
                else {
                    pushCodeUnit(parts, chunk, REPLACEMENT);
                }
            }
            else {
                pushCodeUnit(parts, chunk, REPLACEMENT);
            }
            continue;
        }
        // Lone low surrogate
        if (u1 >= 0xdc00 && u1 <= 0xdfff) {
            pushCodeUnit(parts, chunk, REPLACEMENT);
            continue;
        }
        pushCodeUnit(parts, chunk, u1);
    }
    // Odd trailing byte
    if (i < len) {
        pushCodeUnit(parts, chunk, REPLACEMENT);
    }
    flushChunk(parts, chunk);
    return parts.join("");
}
function decodeASCII(bytes) {
    const parts = [];
    for (let i = 0; i < bytes.length; i += CHUNK) {
        const end = Math.min(bytes.length, i + CHUNK);
        const codes = new Array(end - i);
        for (let j = i, k = 0; j < end; j++, k++) {
            codes[k] = bytes[j] & 0x7f;
        }
        parts.push(String.fromCharCode.apply(null, codes));
    }
    return parts.join("");
}
function decodeLatin1(bytes) {
    const parts = [];
    for (let i = 0; i < bytes.length; i += CHUNK) {
        const end = Math.min(bytes.length, i + CHUNK);
        const codes = new Array(end - i);
        for (let j = i, k = 0; j < end; j++, k++) {
            codes[k] = bytes[j];
        }
        parts.push(String.fromCharCode.apply(null, codes));
    }
    return parts.join("");
}
function decodeWindows1252(bytes) {
    const parts = [];
    let out = "";
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        const extra = b >= 0x80 && b <= 0x9f ? WINDOWS_1252_EXTRA[b] : undefined;
        out += extra !== null && extra !== void 0 ? extra : String.fromCharCode(b);
        if (out.length >= CHUNK) {
            parts.push(out);
            out = "";
        }
    }
    if (out)
        parts.push(out);
    return parts.join("");
}
function encodeUTF8(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
        let cp = str.charCodeAt(i);
        // Valid surrogate pair
        if (cp >= 0xd800 && cp <= 0xdbff) {
            if (i + 1 < str.length) {
                const lo = str.charCodeAt(i + 1);
                if (lo >= 0xdc00 && lo <= 0xdfff) {
                    cp = 0x10000 + ((cp - 0xd800) << 10) + (lo - 0xdc00);
                    i++;
                }
                else {
                    cp = REPLACEMENT;
                }
            }
            else {
                cp = REPLACEMENT;
            }
        }
        else if (cp >= 0xdc00 && cp <= 0xdfff) {
            // Lone low surrogate
            cp = REPLACEMENT;
        }
        if (cp < 0x80) {
            out.push(cp);
        }
        else if (cp < 0x800) {
            out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
        }
        else if (cp < 0x10000) {
            out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        }
        else {
            out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        }
    }
    return new Uint8Array(out);
}
function encodeUTF16LE(str) {
    // Preserve JS string code units, but do not emit non-well-formed UTF-16.
    // Replace lone surrogates with U+FFFD.
    const units = [];
    for (let i = 0; i < str.length; i++) {
        const u = str.charCodeAt(i);
        if (u >= 0xd800 && u <= 0xdbff) {
            if (i + 1 < str.length) {
                const lo = str.charCodeAt(i + 1);
                if (lo >= 0xdc00 && lo <= 0xdfff) {
                    units.push(u, lo);
                    i++;
                }
                else {
                    units.push(REPLACEMENT);
                }
            }
            else {
                units.push(REPLACEMENT);
            }
            continue;
        }
        if (u >= 0xdc00 && u <= 0xdfff) {
            units.push(REPLACEMENT);
            continue;
        }
        units.push(u);
    }
    const out = new Uint8Array(units.length * 2);
    for (let i = 0; i < units.length; i++) {
        const code = units[i];
        const o = i * 2;
        out[o] = code & 0xff;
        out[o + 1] = code >>> 8;
    }
    return out;
}
function encodeASCII(str) {
    const out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++)
        out[i] = str.charCodeAt(i) & 0x7f;
    return out;
}
function encodeLatin1(str) {
    const out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++)
        out[i] = str.charCodeAt(i) & 0xff;
    return out;
}
function encodeWindows1252(str) {
    const out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        const code = ch.charCodeAt(0);
        if (WINDOWS_1252_REVERSE[ch] !== undefined) {
            out[i] = WINDOWS_1252_REVERSE[ch];
            continue;
        }
        if ((code >= 0x00 && code <= 0x7f) ||
            (code >= 0xa0 && code <= 0xff)) {
            out[i] = code;
            continue;
        }
        out[i] = 0x3f; // '?'
    }
    return out;
}
