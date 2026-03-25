"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FF1 = FF1;
exports.BinaryFF1 = BinaryFF1;
/**
 * FPE-FF1 (Format-preserving encryption algorithm) specified in
 * [NIST 800-38G](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-38G.pdf).
 * @module
 */
const aes_ts_1 = require("./aes.js");
const utils_ts_1 = require("./utils.js");
// NOTE: no point in inlining encrypt instead of encryptBlock, since BigInt stuff will be slow
const { expandKeyLE, encryptBlock } = aes_ts_1.unsafe;
// Format-preserving encryption algorithm (FPE-FF1) specified in NIST Special Publication 800-38G.
// https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-38G.pdf
const BLOCK_LEN = 16;
function mod(a, b) {
    const result = a % b;
    return result >= 0 ? result : b + result;
}
function NUMradix(radix, data) {
    let res = BigInt(0);
    for (let i of data)
        res = res * BigInt(radix) + BigInt(i);
    return res;
}
function getRound(radix, key, tweak, x) {
    if (radix > 2 ** 16 - 1)
        throw new Error('invalid radix ' + radix);
    // radix**minlen ≥ 100
    const minLen = Math.ceil(Math.log(100) / Math.log(radix));
    const maxLen = 2 ** 32 - 1;
    // 2 ≤ minlen ≤ maxlen < 2**32
    if (2 > minLen || minLen > maxLen || maxLen >= 2 ** 32)
        throw new Error('Invalid radix: 2 ≤ minlen ≤ maxlen < 2**32');
    if (!Array.isArray(x))
        throw new Error('invalid X');
    if (x.length < minLen || x.length > maxLen)
        throw new Error('X is outside minLen..maxLen bounds');
    const u = Math.floor(x.length / 2);
    const v = x.length - u;
    const b = Math.ceil(Math.ceil(v * Math.log2(radix)) / 8);
    const d = 4 * Math.ceil(b / 4) + 4;
    const padding = mod(-tweak.length - b - 1, 16);
    // P = [1]1 || [2]1 || [1]1 || [radix]3 || [10]1 || [u mod 256]1 || [n]4 || [t]4.
    const P = Uint8Array.from([1, 2, 1, 0, 0, 0, 10, u, 0, 0, 0, 0, 0, 0, 0, 0]);
    const view = new DataView(P.buffer);
    view.setUint16(4, radix, false);
    view.setUint32(8, x.length, false);
    view.setUint32(12, tweak.length, false);
    // Q = T || [0](−t−b−1) mod 16 || [i]1 || [NUMradix(B)]b.
    const PQ = new Uint8Array(P.length + tweak.length + padding + 1 + b);
    PQ.set(P);
    (0, utils_ts_1.clean)(P);
    PQ.set(tweak, P.length);
    const xk = expandKeyLE(key);
    const round = (A, B, i, decrypt = false) => {
        // Q = ... || [i]1 || [NUMradix(B)]b.
        PQ[PQ.length - b - 1] = i;
        if (b)
            PQ.set((0, utils_ts_1.numberToBytesBE)(NUMradix(radix, B), b), PQ.length - b);
        // PRF
        let r = new Uint8Array(16);
        for (let j = 0; j < PQ.length / BLOCK_LEN; j++) {
            for (let i = 0; i < BLOCK_LEN; i++)
                r[i] ^= PQ[j * BLOCK_LEN + i];
            encryptBlock(xk, r);
        }
        // Let S be the first d bytes of the following string of ⎡d/16⎤ blocks:
        // R || CIPHK(R ⊕[1]16) || CIPHK(R ⊕[2]16) ...CIPHK(R ⊕[⎡d / 16⎤ – 1]16).
        let s = Array.from(r);
        for (let j = 1; s.length < d; j++) {
            const block = (0, utils_ts_1.numberToBytesBE)(BigInt(j), 16);
            for (let k = 0; k < BLOCK_LEN; k++)
                block[k] ^= r[k];
            s.push(...Array.from(encryptBlock(xk, block)));
        }
        let y = (0, utils_ts_1.bytesToNumberBE)(Uint8Array.from(s.slice(0, d)));
        s.fill(0);
        if (decrypt)
            y = -y;
        const m = i % 2 === 0 ? u : v;
        let c = mod(NUMradix(radix, A) + y, BigInt(radix) ** BigInt(m));
        // STR(radix, m, c)
        const C = Array(m).fill(0);
        for (let i = 0; i < m; i++, c /= BigInt(radix))
            C[m - 1 - i] = Number(c % BigInt(radix));
        A.fill(0);
        A = B;
        B = C;
        return [A, B];
    };
    const destroy = () => {
        (0, utils_ts_1.clean)(xk, PQ);
    };
    return { u, round, destroy };
}
const EMPTY_BUF = /* @__PURE__ */ Uint8Array.of();
/** FPE-FF1 format-preserving encryption */
function FF1(radix, key, tweak = EMPTY_BUF) {
    (0, utils_ts_1.anumber)(radix);
    (0, utils_ts_1.abytes)(key);
    (0, utils_ts_1.abytes)(tweak);
    const PQ = getRound.bind(null, radix, key, tweak);
    return {
        encrypt(x) {
            const { u, round, destroy } = PQ(x);
            let [A, B] = [x.slice(0, u), x.slice(u)];
            for (let i = 0; i < 10; i++)
                [A, B] = round(A, B, i);
            destroy();
            const res = A.concat(B);
            A.fill(0);
            B.fill(0);
            return res;
        },
        decrypt(x) {
            const { u, round, destroy } = PQ(x);
            // The FF1.Decrypt algorithm is similar to the FF1.Encrypt algorithm;
            // the differences are in Step 6, where:
            // 1) the order of the indices is reversed,
            // 2) the roles of A and B are swapped
            // 3) modular addition is replaced by modular subtraction, in Step 6vi.
            let [B, A] = [x.slice(0, u), x.slice(u)];
            for (let i = 9; i >= 0; i--)
                [A, B] = round(A, B, i, true);
            destroy();
            const res = B.concat(A);
            A.fill(0);
            B.fill(0);
            return res;
        },
    };
}
// Binary string which encodes each byte in little-endian byte order
const binLE = {
    encode(bytes) {
        const x = [];
        for (let i = 0; i < bytes.length; i++) {
            for (let j = 0, tmp = bytes[i]; j < 8; j++, tmp >>= 1)
                x.push(tmp & 1);
        }
        return x;
    },
    decode(b) {
        if (!Array.isArray(b) || b.length % 8)
            throw new Error('Invalid binary string');
        const res = new Uint8Array(b.length / 8);
        for (let i = 0, j = 0; i < res.length; i++) {
            res[i] = b[j++] | (b[j++] << 1) | (b[j++] << 2) | (b[j++] << 3);
            res[i] |= (b[j++] << 4) | (b[j++] << 5) | (b[j++] << 6) | (b[j++] << 7);
        }
        return res;
    },
};
/** Binary version of FPE-FF1 format-preserving encryption. */
function BinaryFF1(key, tweak = EMPTY_BUF) {
    const ff1 = FF1(2, key, tweak);
    return {
        encrypt: (x) => binLE.decode(ff1.encrypt(binLE.encode(x))),
        decrypt: (x) => binLE.decode(ff1.decrypt(binLE.encode(x))),
    };
}
//# sourceMappingURL=ff1.js.map