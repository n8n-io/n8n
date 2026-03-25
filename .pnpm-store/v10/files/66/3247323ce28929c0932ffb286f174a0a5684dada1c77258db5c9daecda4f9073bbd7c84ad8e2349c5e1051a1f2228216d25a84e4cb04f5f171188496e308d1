/**
 * blake2b (64-bit) & blake2s (8 to 32-bit) hash functions.
 * b could have been faster, but there is no fast u64 in js, so s is 1.5x faster.
 * @module
 */
import { BSIGMA, G1s, G2s } from "./_blake.js";
import { SHA256_IV } from "./_md.js";
import * as u64 from "./_u64.js";
// prettier-ignore
import { abytes, aexists, anumber, aoutput, clean, createOptHasher, Hash, swap32IfBE, swap8IfBE, toBytes, u32 } from "./utils.js";
// Same as SHA512_IV, but swapped endianness: LE instead of BE. iv[1] is iv[0], etc.
const B2B_IV = /* @__PURE__ */ Uint32Array.from([
    0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85, 0xfe94f82b, 0x3c6ef372, 0x5f1d36f1, 0xa54ff53a,
    0xade682d1, 0x510e527f, 0x2b3e6c1f, 0x9b05688c, 0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19,
]);
// Temporary buffer
const BBUF = /* @__PURE__ */ new Uint32Array(32);
// Mixing function G splitted in two halfs
function G1b(a, b, c, d, msg, x) {
    // NOTE: V is LE here
    const Xl = msg[x], Xh = msg[x + 1]; // prettier-ignore
    let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1]; // prettier-ignore
    let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1]; // prettier-ignore
    let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1]; // prettier-ignore
    let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1]; // prettier-ignore
    // v[a] = (v[a] + v[b] + x) | 0;
    let ll = u64.add3L(Al, Bl, Xl);
    Ah = u64.add3H(ll, Ah, Bh, Xh);
    Al = ll | 0;
    // v[d] = rotr(v[d] ^ v[a], 32)
    ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
    ({ Dh, Dl } = { Dh: u64.rotr32H(Dh, Dl), Dl: u64.rotr32L(Dh, Dl) });
    // v[c] = (v[c] + v[d]) | 0;
    ({ h: Ch, l: Cl } = u64.add(Ch, Cl, Dh, Dl));
    // v[b] = rotr(v[b] ^ v[c], 24)
    ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
    ({ Bh, Bl } = { Bh: u64.rotrSH(Bh, Bl, 24), Bl: u64.rotrSL(Bh, Bl, 24) });
    (BBUF[2 * a] = Al), (BBUF[2 * a + 1] = Ah);
    (BBUF[2 * b] = Bl), (BBUF[2 * b + 1] = Bh);
    (BBUF[2 * c] = Cl), (BBUF[2 * c + 1] = Ch);
    (BBUF[2 * d] = Dl), (BBUF[2 * d + 1] = Dh);
}
function G2b(a, b, c, d, msg, x) {
    // NOTE: V is LE here
    const Xl = msg[x], Xh = msg[x + 1]; // prettier-ignore
    let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1]; // prettier-ignore
    let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1]; // prettier-ignore
    let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1]; // prettier-ignore
    let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1]; // prettier-ignore
    // v[a] = (v[a] + v[b] + x) | 0;
    let ll = u64.add3L(Al, Bl, Xl);
    Ah = u64.add3H(ll, Ah, Bh, Xh);
    Al = ll | 0;
    // v[d] = rotr(v[d] ^ v[a], 16)
    ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
    ({ Dh, Dl } = { Dh: u64.rotrSH(Dh, Dl, 16), Dl: u64.rotrSL(Dh, Dl, 16) });
    // v[c] = (v[c] + v[d]) | 0;
    ({ h: Ch, l: Cl } = u64.add(Ch, Cl, Dh, Dl));
    // v[b] = rotr(v[b] ^ v[c], 63)
    ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
    ({ Bh, Bl } = { Bh: u64.rotrBH(Bh, Bl, 63), Bl: u64.rotrBL(Bh, Bl, 63) });
    (BBUF[2 * a] = Al), (BBUF[2 * a + 1] = Ah);
    (BBUF[2 * b] = Bl), (BBUF[2 * b + 1] = Bh);
    (BBUF[2 * c] = Cl), (BBUF[2 * c + 1] = Ch);
    (BBUF[2 * d] = Dl), (BBUF[2 * d + 1] = Dh);
}
function checkBlake2Opts(outputLen, opts = {}, keyLen, saltLen, persLen) {
    anumber(keyLen);
    if (outputLen < 0 || outputLen > keyLen)
        throw new Error('outputLen bigger than keyLen');
    const { key, salt, personalization } = opts;
    if (key !== undefined && (key.length < 1 || key.length > keyLen))
        throw new Error('key length must be undefined or 1..' + keyLen);
    if (salt !== undefined && salt.length !== saltLen)
        throw new Error('salt must be undefined or ' + saltLen);
    if (personalization !== undefined && personalization.length !== persLen)
        throw new Error('personalization must be undefined or ' + persLen);
}
/** Class, from which others are subclassed. */
export class BLAKE2 extends Hash {
    constructor(blockLen, outputLen) {
        super();
        this.finished = false;
        this.destroyed = false;
        this.length = 0;
        this.pos = 0;
        anumber(blockLen);
        anumber(outputLen);
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.buffer = new Uint8Array(blockLen);
        this.buffer32 = u32(this.buffer);
    }
    update(data) {
        aexists(this);
        data = toBytes(data);
        abytes(data);
        // Main difference with other hashes: there is flag for last block,
        // so we cannot process current block before we know that there
        // is the next one. This significantly complicates logic and reduces ability
        // to do zero-copy processing
        const { blockLen, buffer, buffer32 } = this;
        const len = data.length;
        const offset = data.byteOffset;
        const buf = data.buffer;
        for (let pos = 0; pos < len;) {
            // If buffer is full and we still have input (don't process last block, same as blake2s)
            if (this.pos === blockLen) {
                swap32IfBE(buffer32);
                this.compress(buffer32, 0, false);
                swap32IfBE(buffer32);
                this.pos = 0;
            }
            const take = Math.min(blockLen - this.pos, len - pos);
            const dataOffset = offset + pos;
            // full block && aligned to 4 bytes && not last in input
            if (take === blockLen && !(dataOffset % 4) && pos + take < len) {
                const data32 = new Uint32Array(buf, dataOffset, Math.floor((len - pos) / 4));
                swap32IfBE(data32);
                for (let pos32 = 0; pos + blockLen < len; pos32 += buffer32.length, pos += blockLen) {
                    this.length += blockLen;
                    this.compress(data32, pos32, false);
                }
                swap32IfBE(data32);
                continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            this.length += take;
            pos += take;
        }
        return this;
    }
    digestInto(out) {
        aexists(this);
        aoutput(out, this);
        const { pos, buffer32 } = this;
        this.finished = true;
        // Padding
        clean(this.buffer.subarray(pos));
        swap32IfBE(buffer32);
        this.compress(buffer32, 0, true);
        swap32IfBE(buffer32);
        const out32 = u32(out);
        this.get().forEach((v, i) => (out32[i] = swap8IfBE(v)));
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
    _cloneInto(to) {
        const { buffer, length, finished, destroyed, outputLen, pos } = this;
        to || (to = new this.constructor({ dkLen: outputLen }));
        to.set(...this.get());
        to.buffer.set(buffer);
        to.destroyed = destroyed;
        to.finished = finished;
        to.length = length;
        to.pos = pos;
        // @ts-ignore
        to.outputLen = outputLen;
        return to;
    }
    clone() {
        return this._cloneInto();
    }
}
export class BLAKE2b extends BLAKE2 {
    constructor(opts = {}) {
        const olen = opts.dkLen === undefined ? 64 : opts.dkLen;
        super(128, olen);
        // Same as SHA-512, but LE
        this.v0l = B2B_IV[0] | 0;
        this.v0h = B2B_IV[1] | 0;
        this.v1l = B2B_IV[2] | 0;
        this.v1h = B2B_IV[3] | 0;
        this.v2l = B2B_IV[4] | 0;
        this.v2h = B2B_IV[5] | 0;
        this.v3l = B2B_IV[6] | 0;
        this.v3h = B2B_IV[7] | 0;
        this.v4l = B2B_IV[8] | 0;
        this.v4h = B2B_IV[9] | 0;
        this.v5l = B2B_IV[10] | 0;
        this.v5h = B2B_IV[11] | 0;
        this.v6l = B2B_IV[12] | 0;
        this.v6h = B2B_IV[13] | 0;
        this.v7l = B2B_IV[14] | 0;
        this.v7h = B2B_IV[15] | 0;
        checkBlake2Opts(olen, opts, 64, 16, 16);
        let { key, personalization, salt } = opts;
        let keyLength = 0;
        if (key !== undefined) {
            key = toBytes(key);
            keyLength = key.length;
        }
        this.v0l ^= this.outputLen | (keyLength << 8) | (0x01 << 16) | (0x01 << 24);
        if (salt !== undefined) {
            salt = toBytes(salt);
            const slt = u32(salt);
            this.v4l ^= swap8IfBE(slt[0]);
            this.v4h ^= swap8IfBE(slt[1]);
            this.v5l ^= swap8IfBE(slt[2]);
            this.v5h ^= swap8IfBE(slt[3]);
        }
        if (personalization !== undefined) {
            personalization = toBytes(personalization);
            const pers = u32(personalization);
            this.v6l ^= swap8IfBE(pers[0]);
            this.v6h ^= swap8IfBE(pers[1]);
            this.v7l ^= swap8IfBE(pers[2]);
            this.v7h ^= swap8IfBE(pers[3]);
        }
        if (key !== undefined) {
            // Pad to blockLen and update
            const tmp = new Uint8Array(this.blockLen);
            tmp.set(key);
            this.update(tmp);
        }
    }
    // prettier-ignore
    get() {
        let { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
        return [v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h];
    }
    // prettier-ignore
    set(v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h) {
        this.v0l = v0l | 0;
        this.v0h = v0h | 0;
        this.v1l = v1l | 0;
        this.v1h = v1h | 0;
        this.v2l = v2l | 0;
        this.v2h = v2h | 0;
        this.v3l = v3l | 0;
        this.v3h = v3h | 0;
        this.v4l = v4l | 0;
        this.v4h = v4h | 0;
        this.v5l = v5l | 0;
        this.v5h = v5h | 0;
        this.v6l = v6l | 0;
        this.v6h = v6h | 0;
        this.v7l = v7l | 0;
        this.v7h = v7h | 0;
    }
    compress(msg, offset, isLast) {
        this.get().forEach((v, i) => (BBUF[i] = v)); // First half from state.
        BBUF.set(B2B_IV, 16); // Second half from IV.
        let { h, l } = u64.fromBig(BigInt(this.length));
        BBUF[24] = B2B_IV[8] ^ l; // Low word of the offset.
        BBUF[25] = B2B_IV[9] ^ h; // High word.
        // Invert all bits for last block
        if (isLast) {
            BBUF[28] = ~BBUF[28];
            BBUF[29] = ~BBUF[29];
        }
        let j = 0;
        const s = BSIGMA;
        for (let i = 0; i < 12; i++) {
            G1b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
            G2b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
            G1b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
            G2b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
            G1b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
            G2b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
            G1b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
            G2b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
            G1b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
            G2b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
            G1b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
            G2b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
            G1b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
            G2b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
            G1b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
            G2b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
        }
        this.v0l ^= BBUF[0] ^ BBUF[16];
        this.v0h ^= BBUF[1] ^ BBUF[17];
        this.v1l ^= BBUF[2] ^ BBUF[18];
        this.v1h ^= BBUF[3] ^ BBUF[19];
        this.v2l ^= BBUF[4] ^ BBUF[20];
        this.v2h ^= BBUF[5] ^ BBUF[21];
        this.v3l ^= BBUF[6] ^ BBUF[22];
        this.v3h ^= BBUF[7] ^ BBUF[23];
        this.v4l ^= BBUF[8] ^ BBUF[24];
        this.v4h ^= BBUF[9] ^ BBUF[25];
        this.v5l ^= BBUF[10] ^ BBUF[26];
        this.v5h ^= BBUF[11] ^ BBUF[27];
        this.v6l ^= BBUF[12] ^ BBUF[28];
        this.v6h ^= BBUF[13] ^ BBUF[29];
        this.v7l ^= BBUF[14] ^ BBUF[30];
        this.v7h ^= BBUF[15] ^ BBUF[31];
        clean(BBUF);
    }
    destroy() {
        this.destroyed = true;
        clean(this.buffer32);
        this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
}
/**
 * Blake2b hash function. 64-bit. 1.5x slower than blake2s in JS.
 * @param msg - message that would be hashed
 * @param opts - dkLen output length, key for MAC mode, salt, personalization
 */
export const blake2b = /* @__PURE__ */ createOptHasher((opts) => new BLAKE2b(opts));
// prettier-ignore
export function compress(s, offset, msg, rounds, v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15) {
    let j = 0;
    for (let i = 0; i < rounds; i++) {
        ({ a: v0, b: v4, c: v8, d: v12 } = G1s(v0, v4, v8, v12, msg[offset + s[j++]]));
        ({ a: v0, b: v4, c: v8, d: v12 } = G2s(v0, v4, v8, v12, msg[offset + s[j++]]));
        ({ a: v1, b: v5, c: v9, d: v13 } = G1s(v1, v5, v9, v13, msg[offset + s[j++]]));
        ({ a: v1, b: v5, c: v9, d: v13 } = G2s(v1, v5, v9, v13, msg[offset + s[j++]]));
        ({ a: v2, b: v6, c: v10, d: v14 } = G1s(v2, v6, v10, v14, msg[offset + s[j++]]));
        ({ a: v2, b: v6, c: v10, d: v14 } = G2s(v2, v6, v10, v14, msg[offset + s[j++]]));
        ({ a: v3, b: v7, c: v11, d: v15 } = G1s(v3, v7, v11, v15, msg[offset + s[j++]]));
        ({ a: v3, b: v7, c: v11, d: v15 } = G2s(v3, v7, v11, v15, msg[offset + s[j++]]));
        ({ a: v0, b: v5, c: v10, d: v15 } = G1s(v0, v5, v10, v15, msg[offset + s[j++]]));
        ({ a: v0, b: v5, c: v10, d: v15 } = G2s(v0, v5, v10, v15, msg[offset + s[j++]]));
        ({ a: v1, b: v6, c: v11, d: v12 } = G1s(v1, v6, v11, v12, msg[offset + s[j++]]));
        ({ a: v1, b: v6, c: v11, d: v12 } = G2s(v1, v6, v11, v12, msg[offset + s[j++]]));
        ({ a: v2, b: v7, c: v8, d: v13 } = G1s(v2, v7, v8, v13, msg[offset + s[j++]]));
        ({ a: v2, b: v7, c: v8, d: v13 } = G2s(v2, v7, v8, v13, msg[offset + s[j++]]));
        ({ a: v3, b: v4, c: v9, d: v14 } = G1s(v3, v4, v9, v14, msg[offset + s[j++]]));
        ({ a: v3, b: v4, c: v9, d: v14 } = G2s(v3, v4, v9, v14, msg[offset + s[j++]]));
    }
    return { v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 };
}
const B2S_IV = SHA256_IV;
export class BLAKE2s extends BLAKE2 {
    constructor(opts = {}) {
        const olen = opts.dkLen === undefined ? 32 : opts.dkLen;
        super(64, olen);
        // Internal state, same as SHA-256
        this.v0 = B2S_IV[0] | 0;
        this.v1 = B2S_IV[1] | 0;
        this.v2 = B2S_IV[2] | 0;
        this.v3 = B2S_IV[3] | 0;
        this.v4 = B2S_IV[4] | 0;
        this.v5 = B2S_IV[5] | 0;
        this.v6 = B2S_IV[6] | 0;
        this.v7 = B2S_IV[7] | 0;
        checkBlake2Opts(olen, opts, 32, 8, 8);
        let { key, personalization, salt } = opts;
        let keyLength = 0;
        if (key !== undefined) {
            key = toBytes(key);
            keyLength = key.length;
        }
        this.v0 ^= this.outputLen | (keyLength << 8) | (0x01 << 16) | (0x01 << 24);
        if (salt !== undefined) {
            salt = toBytes(salt);
            const slt = u32(salt);
            this.v4 ^= swap8IfBE(slt[0]);
            this.v5 ^= swap8IfBE(slt[1]);
        }
        if (personalization !== undefined) {
            personalization = toBytes(personalization);
            const pers = u32(personalization);
            this.v6 ^= swap8IfBE(pers[0]);
            this.v7 ^= swap8IfBE(pers[1]);
        }
        if (key !== undefined) {
            // Pad to blockLen and update
            abytes(key);
            const tmp = new Uint8Array(this.blockLen);
            tmp.set(key);
            this.update(tmp);
        }
    }
    get() {
        const { v0, v1, v2, v3, v4, v5, v6, v7 } = this;
        return [v0, v1, v2, v3, v4, v5, v6, v7];
    }
    // prettier-ignore
    set(v0, v1, v2, v3, v4, v5, v6, v7) {
        this.v0 = v0 | 0;
        this.v1 = v1 | 0;
        this.v2 = v2 | 0;
        this.v3 = v3 | 0;
        this.v4 = v4 | 0;
        this.v5 = v5 | 0;
        this.v6 = v6 | 0;
        this.v7 = v7 | 0;
    }
    compress(msg, offset, isLast) {
        const { h, l } = u64.fromBig(BigInt(this.length));
        // prettier-ignore
        const { v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 } = compress(BSIGMA, offset, msg, 10, this.v0, this.v1, this.v2, this.v3, this.v4, this.v5, this.v6, this.v7, B2S_IV[0], B2S_IV[1], B2S_IV[2], B2S_IV[3], l ^ B2S_IV[4], h ^ B2S_IV[5], isLast ? ~B2S_IV[6] : B2S_IV[6], B2S_IV[7]);
        this.v0 ^= v0 ^ v8;
        this.v1 ^= v1 ^ v9;
        this.v2 ^= v2 ^ v10;
        this.v3 ^= v3 ^ v11;
        this.v4 ^= v4 ^ v12;
        this.v5 ^= v5 ^ v13;
        this.v6 ^= v6 ^ v14;
        this.v7 ^= v7 ^ v15;
    }
    destroy() {
        this.destroyed = true;
        clean(this.buffer32);
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
    }
}
/**
 * Blake2s hash function. Focuses on 8-bit to 32-bit platforms. 1.5x faster than blake2b in JS.
 * @param msg - message that would be hashed
 * @param opts - dkLen output length, key for MAC mode, salt, personalization
 */
export const blake2s = /* @__PURE__ */ createOptHasher((opts) => new BLAKE2s(opts));
//# sourceMappingURL=blake2.js.map