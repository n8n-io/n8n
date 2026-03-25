"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xchacha20poly1305 = exports.chacha20poly1305 = exports._poly1305_aead = exports.xsalsa20poly1305 = exports.chacha12 = exports.chacha8 = exports.xchacha20 = exports.chacha20 = exports.chacha20orig = exports.xsalsa20 = exports.salsa20 = void 0;
exports.hsalsa = hsalsa;
exports.hchacha = hchacha;
exports.poly1305 = poly1305;
exports.secretbox = secretbox;
/**
 * noble-ciphers-micro: more auditable, but 4x slower version of salsa20, chacha & poly1305.
 * Implements the same algorithms that are present in other files, but without
 * unrolled loops (https://en.wikipedia.org/wiki/Loop_unrolling).
 * @module
 */
/*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) */
// prettier-ignore
const _arx_ts_1 = require("./_arx.js");
const utils_ts_1 = require("./utils.js");
function bytesToNumberLE(bytes) {
    (0, utils_ts_1.abytes)(bytes);
    return (0, utils_ts_1.hexToNumber)((0, utils_ts_1.bytesToHex)(Uint8Array.from(bytes).reverse()));
}
function numberToBytesLE(n, len) {
    return (0, utils_ts_1.numberToBytesBE)(n, len).reverse();
}
function salsaQR(x, a, b, c, d) {
    x[b] ^= (0, _arx_ts_1.rotl)((x[a] + x[d]) | 0, 7);
    x[c] ^= (0, _arx_ts_1.rotl)((x[b] + x[a]) | 0, 9);
    x[d] ^= (0, _arx_ts_1.rotl)((x[c] + x[b]) | 0, 13);
    x[a] ^= (0, _arx_ts_1.rotl)((x[d] + x[c]) | 0, 18);
}
// prettier-ignore
function chachaQR(x, a, b, c, d) {
    x[a] = (x[a] + x[b]) | 0;
    x[d] = (0, _arx_ts_1.rotl)(x[d] ^ x[a], 16);
    x[c] = (x[c] + x[d]) | 0;
    x[b] = (0, _arx_ts_1.rotl)(x[b] ^ x[c], 12);
    x[a] = (x[a] + x[b]) | 0;
    x[d] = (0, _arx_ts_1.rotl)(x[d] ^ x[a], 8);
    x[c] = (x[c] + x[d]) | 0;
    x[b] = (0, _arx_ts_1.rotl)(x[b] ^ x[c], 7);
}
function salsaRound(x, rounds = 20) {
    for (let r = 0; r < rounds; r += 2) {
        salsaQR(x, 0, 4, 8, 12);
        salsaQR(x, 5, 9, 13, 1);
        salsaQR(x, 10, 14, 2, 6);
        salsaQR(x, 15, 3, 7, 11);
        salsaQR(x, 0, 1, 2, 3);
        salsaQR(x, 5, 6, 7, 4);
        salsaQR(x, 10, 11, 8, 9);
        salsaQR(x, 15, 12, 13, 14);
    }
}
function chachaRound(x, rounds = 20) {
    for (let r = 0; r < rounds; r += 2) {
        chachaQR(x, 0, 4, 8, 12);
        chachaQR(x, 1, 5, 9, 13);
        chachaQR(x, 2, 6, 10, 14);
        chachaQR(x, 3, 7, 11, 15);
        chachaQR(x, 0, 5, 10, 15);
        chachaQR(x, 1, 6, 11, 12);
        chachaQR(x, 2, 7, 8, 13);
        chachaQR(x, 3, 4, 9, 14);
    }
}
function salsaCore(s, k, n, out, cnt, rounds = 20) {
    // prettier-ignore
    const y = new Uint32Array([
        s[0], k[0], k[1], k[2], // "expa" Key     Key     Key
        k[3], s[1], n[0], n[1], // Key    "nd 3"  Nonce   Nonce
        cnt, 0, s[2], k[4], // Pos.   Pos.    "2-by"  Key
        k[5], k[6], k[7], s[3], // Key    Key     Key     "te k"
    ]);
    const x = y.slice();
    salsaRound(x, rounds);
    for (let i = 0; i < 16; i++)
        out[i] = (y[i] + x[i]) | 0;
}
/** hsalsa hashes key and nonce into key' and nonce'. */
// prettier-ignore
function hsalsa(s, k, i, o32) {
    const x = new Uint32Array([
        s[0], k[0], k[1], k[2],
        k[3], s[1], i[0], i[1],
        i[2], i[3], s[2], k[4],
        k[5], k[6], k[7], s[3]
    ]);
    salsaRound(x, 20);
    let oi = 0;
    o32[oi++] = x[0];
    o32[oi++] = x[5];
    o32[oi++] = x[10];
    o32[oi++] = x[15];
    o32[oi++] = x[6];
    o32[oi++] = x[7];
    o32[oi++] = x[8];
    o32[oi++] = x[9];
}
function chachaCore(s, k, n, out, cnt, rounds = 20) {
    // prettier-ignore
    const y = new Uint32Array([
        s[0], s[1], s[2], s[3], // "expa"   "nd 3"  "2-by"  "te k"
        k[0], k[1], k[2], k[3], // Key      Key     Key     Key
        k[4], k[5], k[6], k[7], // Key      Key     Key     Key
        cnt, n[0], n[1], n[2], // Counter  Counter Nonce   Nonce
    ]);
    const x = y.slice();
    chachaRound(x, rounds);
    for (let i = 0; i < 16; i++)
        out[i] = (y[i] + x[i]) | 0;
}
/** hchacha hashes key and nonce into key' and nonce'. */
// prettier-ignore
function hchacha(s, k, i, o32) {
    const x = new Uint32Array([
        s[0], s[1], s[2], s[3],
        k[0], k[1], k[2], k[3],
        k[4], k[5], k[6], k[7],
        i[0], i[1], i[2], i[3],
    ]);
    chachaRound(x, 20);
    let oi = 0;
    o32[oi++] = x[0];
    o32[oi++] = x[1];
    o32[oi++] = x[2];
    o32[oi++] = x[3];
    o32[oi++] = x[12];
    o32[oi++] = x[13];
    o32[oi++] = x[14];
    o32[oi++] = x[15];
}
/** salsa20, 12-byte nonce. */
exports.salsa20 = (0, _arx_ts_1.createCipher)(salsaCore, {
    allowShortKeys: true,
    counterRight: true,
});
/** xsalsa20, 24-byte nonce. */
exports.xsalsa20 = (0, _arx_ts_1.createCipher)(salsaCore, {
    counterRight: true,
    extendNonceFn: hsalsa,
});
/** chacha20 non-RFC, original version by djb. 8-byte nonce, 8-byte counter. */
exports.chacha20orig = (0, _arx_ts_1.createCipher)(chachaCore, {
    allowShortKeys: true,
    counterRight: false,
    counterLength: 8,
});
/** chacha20 RFC 8439 (IETF / TLS). 12-byte nonce, 4-byte counter. */
exports.chacha20 = (0, _arx_ts_1.createCipher)(chachaCore, {
    counterRight: false,
    counterLength: 4,
});
/** xchacha20 eXtended-nonce. https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha */
exports.xchacha20 = (0, _arx_ts_1.createCipher)(chachaCore, {
    counterRight: false,
    counterLength: 8,
    extendNonceFn: hchacha,
});
/** 8-round chacha from the original paper. */
exports.chacha8 = (0, _arx_ts_1.createCipher)(chachaCore, {
    counterRight: false,
    counterLength: 4,
    rounds: 8,
});
/** 12-round chacha from the original paper. */
exports.chacha12 = (0, _arx_ts_1.createCipher)(chachaCore, {
    counterRight: false,
    counterLength: 4,
    rounds: 12,
});
const POW_2_130_5 = BigInt(2) ** BigInt(130) - BigInt(5);
const POW_2_128_1 = BigInt(2) ** BigInt(16 * 8) - BigInt(1);
const CLAMP_R = BigInt('0x0ffffffc0ffffffc0ffffffc0fffffff');
const _0 = BigInt(0);
const _1 = BigInt(1);
/** Poly1305 polynomial MAC. Can be speed-up using BigUint64Array, at the cost of complexity. */
function poly1305(msg, key) {
    (0, utils_ts_1.abytes)(msg);
    (0, utils_ts_1.abytes)(key, 32);
    let acc = _0;
    const r = bytesToNumberLE(key.subarray(0, 16)) & CLAMP_R;
    const s = bytesToNumberLE(key.subarray(16));
    // Process by 16 byte chunks
    for (let i = 0; i < msg.length; i += 16) {
        const m = msg.subarray(i, i + 16);
        const n = bytesToNumberLE(m) | (_1 << BigInt(8 * m.length));
        acc = ((acc + n) * r) % POW_2_130_5;
    }
    const res = (acc + s) & POW_2_128_1;
    return numberToBytesLE(res, 16);
}
function computeTag(fn, key, nonce, ciphertext, AAD) {
    const res = [];
    if (AAD) {
        res.push(AAD);
        const leftover = AAD.length % 16;
        if (leftover > 0)
            res.push(new Uint8Array(16 - leftover));
    }
    res.push(ciphertext);
    const leftover = ciphertext.length % 16;
    if (leftover > 0)
        res.push(new Uint8Array(16 - leftover));
    res.push((0, utils_ts_1.u64Lengths)(ciphertext.length, AAD ? AAD.length : 0, true));
    const authKey = fn(key, nonce, new Uint8Array(32));
    return poly1305((0, utils_ts_1.concatBytes)(...res), authKey);
}
/** xsalsa20-poly1305 eXtended-nonce (24 bytes) salsa. */
exports.xsalsa20poly1305 = (0, utils_ts_1.wrapCipher)({ blockSize: 64, nonceLength: 24, tagLength: 16 }, function xsalsapoly(key, nonce) {
    return {
        encrypt(plaintext) {
            const m = (0, utils_ts_1.concatBytes)(new Uint8Array(32), plaintext);
            const c = (0, exports.xsalsa20)(key, nonce, m);
            const authKey = c.subarray(0, 32);
            const data = c.subarray(32);
            const tag = poly1305(data, authKey);
            return (0, utils_ts_1.concatBytes)(tag, data);
        },
        decrypt(ciphertext) {
            const c = (0, utils_ts_1.concatBytes)(new Uint8Array(16), ciphertext);
            const passedTag = c.subarray(16, 32);
            const authKey = (0, exports.xsalsa20)(key, nonce, new Uint8Array(32));
            const tag = poly1305(c.subarray(32), authKey);
            if (!(0, utils_ts_1.equalBytes)(tag, passedTag))
                throw new Error('invalid poly1305 tag');
            return (0, exports.xsalsa20)(key, nonce, c).subarray(32);
        },
    };
});
/** Alias to `xsalsa20poly1305`. */
function secretbox(key, nonce) {
    const xs = (0, exports.xsalsa20poly1305)(key, nonce);
    return { seal: xs.encrypt, open: xs.decrypt };
}
const _poly1305_aead = (fn) => (key, nonce, AAD) => {
    const tagLength = 16;
    return {
        encrypt(plaintext) {
            const data = fn(key, nonce, plaintext, undefined, 1); // stream from i=1
            const tag = computeTag(fn, key, nonce, data, AAD);
            return (0, utils_ts_1.concatBytes)(data, tag);
        },
        decrypt(ciphertext) {
            const passedTag = ciphertext.subarray(-tagLength);
            const data = ciphertext.subarray(0, -tagLength);
            const tag = computeTag(fn, key, nonce, data, AAD);
            if (!(0, utils_ts_1.equalBytes)(tag, passedTag))
                throw new Error('invalid poly1305 tag');
            return fn(key, nonce, data, undefined, 1); // stream from i=1
        },
    };
};
exports._poly1305_aead = _poly1305_aead;
/** chacha20-poly1305 12-byte-nonce chacha. */
exports.chacha20poly1305 = (0, utils_ts_1.wrapCipher)({ blockSize: 64, nonceLength: 12, tagLength: 16 }, (0, exports._poly1305_aead)(exports.chacha20));
/**
 * XChaCha20-Poly1305 extended-nonce chacha. Can be safely used with random nonces (CSPRNG).
 */
exports.xchacha20poly1305 = (0, utils_ts_1.wrapCipher)({ blockSize: 64, nonceLength: 24, tagLength: 16 }, (0, exports._poly1305_aead)(exports.xchacha20));
//# sourceMappingURL=_micro.js.map