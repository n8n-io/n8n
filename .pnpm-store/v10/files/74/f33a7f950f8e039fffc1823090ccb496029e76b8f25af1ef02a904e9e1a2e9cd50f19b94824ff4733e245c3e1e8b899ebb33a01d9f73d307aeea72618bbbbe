// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// Original from: https://github.com/i404788/xxh3-ts
// Vendored for compatibility (remove Buffer use in favor of Uint8Array)
const n = (n) => BigInt(n);
const PRIME32_1 = n("0x9E3779B1"); // 0b10011110001101110111100110110001
const PRIME32_2 = n("0x85EBCA77"); // 0b10000101111010111100101001110111
const PRIME32_3 = n("0xC2B2AE3D"); // 0b11000010101100101010111000111101
const PRIME64_1 = n("0x9E3779B185EBCA87"); // 0b1001111000110111011110011011000110000101111010111100101010000111
const PRIME64_2 = n("0xC2B2AE3D27D4EB4F"); // 0b1100001010110010101011100011110100100111110101001110101101001111
const PRIME64_3 = n("0x165667B19E3779F9"); // 0b0001011001010110011001111011000110011110001101110111100111111001
const PRIME64_4 = n("0x85EBCA77C2B2AE63"); // 0b1000010111101011110010100111011111000010101100101010111001100011
const PRIME64_5 = n("0x27D4EB2F165667C5"); // 0b0010011111010100111010110010111100010110010101100110011111000101
const PRIME_MX1 = n("0x165667919E3779F9"); // 0b0001011001010110011001111001000110011110001101110111100111111001
const PRIME_MX2 = n("0x9FB21C651E98DF25"); // 0b1001111110110010000111000110010100011110100110001101111100100101
// Convert hex string to Uint8Array
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}
const kkey = hexToBytes("b8fe6c3923a44bbe7c01812cf721ad1cded46de9839097db7240a4a4b7b3671fcb79e64eccc0e578825ad07dccff7221b8084674f743248ee03590e6813a264c3c2852bb91c300cb88d0658b1b532ea371644897a20df94e3819ef46a9deacd8a8fa763fe39c343ff9dcbbc7c70b4f1d8a51e04bcdb45931c89f7ec9d9787364eac5ac8334d3ebc3c581a0fffa1363eb170ddd51b7f0da49d316552629d4689e2b16be587d47a1fc8ff8b8d17ad031ce45cb3a8f95160428afd7fbcabb4b407e");
const mask128 = (n(1) << n(128)) - n(1);
const mask64 = (n(1) << n(64)) - n(1);
const mask32 = (n(1) << n(32)) - n(1);
const STRIPE_LEN = 64;
const ACC_NB = STRIPE_LEN / 8;
const _U64 = 8;
const _U32 = 4;
// Create a view into a Uint8Array at an offset
function getView(buf, offset = 0) {
    return new Uint8Array(buf.buffer, buf.byteOffset + offset, buf.length - offset);
}
// Read BigInt from Uint8Array in little-endian
function readBigUInt64LE(buf, offset = 0) {
    const view = new DataView(buf.buffer, buf.byteOffset + offset);
    return view.getBigUint64(0, true);
}
// Read UInt32 from Uint8Array in little-endian
function readUInt32LE(buf, offset = 0) {
    const view = new DataView(buf.buffer, buf.byteOffset + offset);
    return view.getUint32(0, true);
}
// Read UInt8 from Uint8Array
function readUInt8(buf, offset = 0) {
    return buf[offset];
}
const bswap64 = (a) => {
    return (((a & n(0xff)) << n(56)) |
        ((a & n(0xff00)) << n(40)) |
        ((a & n(0xff0000)) << n(24)) |
        ((a & n(0xff000000)) << n(8)) |
        ((a & n(0xff00000000)) >> n(8)) |
        ((a & n(0xff0000000000)) >> n(24)) |
        ((a & n(0xff000000000000)) >> n(40)) |
        ((a & n(0xff00000000000000)) >> n(56)));
};
const bswap32 = (a) => {
    a = ((a & n(0x0000ffff)) << n(16)) | ((a & n(0xffff0000)) >> n(16));
    a = ((a & n(0x00ff00ff)) << n(8)) | ((a & n(0xff00ff00)) >> n(8));
    return a;
};
const XXH_mult32to64 = (a, b) => ((a & mask32) * (b & mask32)) & mask64;
const assert = (a) => {
    if (!a)
        throw new Error("Assert failed");
};
function rotl32(a, b) {
    return ((a << b) | (a >> (n(32) - b))) & mask32;
}
function XXH3_accumulate_512(acc, data, key) {
    for (let i = 0; i < ACC_NB; i++) {
        const data_val = readBigUInt64LE(data, i * 8);
        const data_key = data_val ^ readBigUInt64LE(key, i * 8);
        acc[i ^ 1] += data_val;
        acc[i] += XXH_mult32to64(data_key, data_key >> n(32));
    }
    return acc;
}
function XXH3_accumulate(acc, data, key, nbStripes) {
    for (let n = 0; n < nbStripes; n++) {
        XXH3_accumulate_512(acc, getView(data, n * STRIPE_LEN), getView(key, n * 8));
    }
    return acc;
}
function XXH3_scrambleAcc(acc, key) {
    for (let i = 0; i < ACC_NB; i++) {
        const key64 = readBigUInt64LE(key, i * 8);
        let acc64 = acc[i];
        acc64 = xorshift64(acc64, n(47));
        acc64 ^= key64;
        acc64 *= PRIME32_1;
        acc[i] = acc64 & mask64;
    }
    return acc;
}
function XXH3_mix2Accs(acc, key) {
    return XXH3_mul128_fold64(acc[0] ^ readBigUInt64LE(key, 0), acc[1] ^ readBigUInt64LE(key, _U64));
}
function XXH3_mergeAccs(acc, key, start) {
    let result64 = start;
    result64 += XXH3_mix2Accs(acc.slice(0), getView(key, 0 * _U32));
    result64 += XXH3_mix2Accs(acc.slice(2), getView(key, 4 * _U32));
    result64 += XXH3_mix2Accs(acc.slice(4), getView(key, 8 * _U32));
    result64 += XXH3_mix2Accs(acc.slice(6), getView(key, 12 * _U32));
    return XXH3_avalanche(result64 & mask64);
}
function XXH3_hashLong(acc, data, secret, f_acc, f_scramble) {
    const nbStripesPerBlock = Math.floor((secret.byteLength - STRIPE_LEN) / 8);
    const block_len = STRIPE_LEN * nbStripesPerBlock;
    const nb_blocks = Math.floor((data.byteLength - 1) / block_len);
    for (let n = 0; n < nb_blocks; n++) {
        acc = XXH3_accumulate(acc, getView(data, n * block_len), secret, nbStripesPerBlock);
        acc = f_scramble(acc, getView(secret, secret.byteLength - STRIPE_LEN));
    }
    {
        // Partial block
        const nbStripes = Math.floor((data.byteLength - 1 - block_len * nb_blocks) / STRIPE_LEN);
        acc = XXH3_accumulate(acc, getView(data, nb_blocks * block_len), secret, nbStripes);
        // Last Stripe
        acc = f_acc(acc, getView(data, data.byteLength - STRIPE_LEN), getView(secret, secret.byteLength - STRIPE_LEN - 7));
    }
    return acc;
}
function XXH3_hashLong_128b(data, secret, seed) {
    let acc = new BigUint64Array([
        PRIME32_3,
        PRIME64_1,
        PRIME64_2,
        PRIME64_3,
        PRIME64_4,
        PRIME32_2,
        PRIME64_5,
        PRIME32_1,
    ]);
    assert(data.length > 128);
    acc = XXH3_hashLong(acc, data, secret, XXH3_accumulate_512, XXH3_scrambleAcc);
    /* converge into final hash */
    assert(acc.length * 8 == 64);
    {
        const low64 = XXH3_mergeAccs(acc, getView(secret, 11), (n(data.byteLength) * PRIME64_1) & mask64);
        const high64 = XXH3_mergeAccs(acc, getView(secret, secret.byteLength - STRIPE_LEN - 11), ~(n(data.byteLength) * PRIME64_2) & mask64);
        return (high64 << n(64)) | low64;
    }
}
function XXH3_mul128_fold64(a, b) {
    const lll = (a * b) & mask128;
    return (lll & mask64) ^ (lll >> n(64));
}
function XXH3_mix16B(data, key, seed) {
    return XXH3_mul128_fold64((readBigUInt64LE(data, 0) ^ (readBigUInt64LE(key, 0) + seed)) & mask64, (readBigUInt64LE(data, 8) ^ (readBigUInt64LE(key, 8) - seed)) & mask64);
}
function XXH3_mix32B(acc, data1, data2, key, seed) {
    let accl = acc & mask64;
    let acch = (acc >> n(64)) & mask64;
    accl += XXH3_mix16B(data1, key, seed);
    accl ^= readBigUInt64LE(data2, 0) + readBigUInt64LE(data2, 8);
    accl &= mask64;
    acch += XXH3_mix16B(data2, getView(key, 16), seed);
    acch ^= readBigUInt64LE(data1, 0) + readBigUInt64LE(data1, 8);
    acch &= mask64;
    return (acch << n(64)) | accl;
}
function XXH3_avalanche(h64) {
    h64 ^= h64 >> n(37);
    h64 *= PRIME_MX1;
    h64 &= mask64;
    h64 ^= h64 >> n(32);
    return h64;
}
function XXH3_avalanche64(h64) {
    h64 ^= h64 >> n(33);
    h64 *= PRIME64_2;
    h64 &= mask64;
    h64 ^= h64 >> n(29);
    h64 *= PRIME64_3;
    h64 &= mask64;
    h64 ^= h64 >> n(32);
    return h64;
}
function XXH3_len_1to3_128b(data, key32, seed) {
    const len = data.byteLength;
    assert(len > 0 && len <= 3);
    const combined = n(readUInt8(data, len - 1)) |
        n(len << 8) |
        n(readUInt8(data, 0) << 16) |
        n(readUInt8(data, len >> 1) << 24);
    const blow = (n(readUInt32LE(key32, 0)) ^ n(readUInt32LE(key32, 4))) + seed;
    const low = (combined ^ blow) & mask64;
    const bhigh = (n(readUInt32LE(key32, 8)) ^ n(readUInt32LE(key32, 12))) - seed;
    const high = (rotl32(bswap32(combined), n(13)) ^ bhigh) & mask64;
    return ((XXH3_avalanche64(high) & mask64) << n(64)) | XXH3_avalanche64(low);
}
function xorshift64(b, shift) {
    return b ^ (b >> shift);
}
function XXH3_len_4to8_128b(data, key32, seed) {
    const len = data.byteLength;
    assert(len >= 4 && len <= 8);
    {
        const l1 = readUInt32LE(data, 0);
        const l2 = readUInt32LE(data, len - 4);
        const l64 = n(l1) | (n(l2) << n(32));
        const bitflip = ((readBigUInt64LE(key32, 16) ^ readBigUInt64LE(key32, 24)) + seed) &
            mask64;
        const keyed = l64 ^ bitflip;
        let m128 = (keyed * (PRIME64_1 + (n(len) << n(2)))) & mask128;
        m128 += (m128 & mask64) << n(65);
        m128 &= mask128;
        m128 ^= m128 >> n(67);
        return (xorshift64((xorshift64(m128 & mask64, n(35)) * PRIME_MX2) & mask64, n(28)) |
            (XXH3_avalanche(m128 >> n(64)) << n(64)));
    }
}
function XXH3_len_9to16_128b(data, key64, seed) {
    const len = data.byteLength;
    assert(len >= 9 && len <= 16);
    {
        const bitflipl = ((readBigUInt64LE(key64, 32) ^ readBigUInt64LE(key64, 40)) + seed) &
            mask64;
        const bitfliph = ((readBigUInt64LE(key64, 48) ^ readBigUInt64LE(key64, 56)) - seed) &
            mask64;
        const ll1 = readBigUInt64LE(data);
        let ll2 = readBigUInt64LE(data, len - 8);
        let m128 = (ll1 ^ ll2 ^ bitflipl) * PRIME64_1;
        const m128_l = (m128 & mask64) + (n(len - 1) << n(54));
        m128 = (m128 & (mask128 ^ mask64)) | m128_l; // eqv. to adding only to lower 64b
        ll2 ^= bitfliph;
        m128 += (ll2 + (ll2 & mask32) * (PRIME32_2 - n(1))) << n(64);
        m128 &= mask128;
        m128 ^= bswap64(m128 >> n(64));
        let h128 = (m128 & mask64) * PRIME64_2;
        h128 += ((m128 >> n(64)) * PRIME64_2) << n(64);
        h128 &= mask128;
        return (XXH3_avalanche(h128 & mask64) | (XXH3_avalanche(h128 >> n(64)) << n(64)));
    }
}
function XXH3_len_0to16_128b(data, seed) {
    const len = data.byteLength;
    assert(len <= 16);
    if (len > 8)
        return XXH3_len_9to16_128b(data, kkey, seed);
    if (len >= 4)
        return XXH3_len_4to8_128b(data, kkey, seed);
    if (len > 0)
        return XXH3_len_1to3_128b(data, kkey, seed);
    return (XXH3_avalanche64(seed ^ readBigUInt64LE(kkey, 64) ^ readBigUInt64LE(kkey, 72)) |
        (XXH3_avalanche64(seed ^ readBigUInt64LE(kkey, 80) ^ readBigUInt64LE(kkey, 88)) <<
            n(64)));
}
function inv64(x) {
    // NOTE: `AND` fixes signedness (but because of 2's complement we need to re-add 1)
    return (~x + n(1)) & mask64;
}
function XXH3_len_17to128_128b(data, secret, seed) {
    let acc = (n(data.byteLength) * PRIME64_1) & mask64;
    let i = n(data.byteLength - 1) / n(32);
    while (i >= 0) {
        const ni = Number(i);
        acc = XXH3_mix32B(acc, getView(data, 16 * ni), getView(data, data.byteLength - 16 * (ni + 1)), getView(secret, 32 * ni), seed);
        i--;
    }
    let h128l = (acc + (acc >> n(64))) & mask64;
    h128l = XXH3_avalanche(h128l);
    let h128h = (acc & mask64) * PRIME64_1 +
        (acc >> n(64)) * PRIME64_4 +
        ((n(data.byteLength) - seed) & mask64) * PRIME64_2;
    h128h &= mask64;
    h128h = inv64(XXH3_avalanche(h128h));
    return h128l | (h128h << n(64));
}
function XXH3_len_129to240_128b(data, secret, seed) {
    let acc = (n(data.byteLength) * PRIME64_1) & mask64;
    for (let i = 32; i < 160; i += 32) {
        acc = XXH3_mix32B(acc, getView(data, i - 32), getView(data, i - 16), getView(secret, i - 32), seed);
    }
    acc = XXH3_avalanche(acc & mask64) | (XXH3_avalanche(acc >> n(64)) << n(64));
    for (let i = 160; i <= data.byteLength; i += 32) {
        acc = XXH3_mix32B(acc, getView(data, i - 32), getView(data, i - 16), getView(secret, 3 + i - 160), seed);
    }
    acc = XXH3_mix32B(acc, getView(data, data.byteLength - 16), getView(data, data.byteLength - 32), getView(secret, 136 - 17 - 16), inv64(seed));
    let h128l = (acc + (acc >> n(64))) & mask64;
    h128l = XXH3_avalanche(h128l);
    let h128h = (acc & mask64) * PRIME64_1 +
        (acc >> n(64)) * PRIME64_4 +
        ((n(data.byteLength) - seed) & mask64) * PRIME64_2;
    h128h &= mask64;
    h128h = inv64(XXH3_avalanche(h128h));
    return h128l | (h128h << n(64));
}
/**
 * Compute XXH3 128-bit hash of the input data.
 *
 * @param data - Input data as Uint8Array
 * @param seed - Optional seed value (default: 0)
 * @returns 128-bit hash as a single BigInt (high 64 bits << 64 | low 64 bits)
 */
export function XXH3_128(data, seed = n(0)) {
    const len = data.byteLength;
    if (len <= 16)
        return XXH3_len_0to16_128b(data, seed);
    if (len <= 128)
        return XXH3_len_17to128_128b(data, kkey, seed);
    if (len <= 240)
        return XXH3_len_129to240_128b(data, kkey, seed);
    return XXH3_hashLong_128b(data, kkey, seed);
}
/**
 * Convert a 128-bit hash (BigInt) to a 16-byte Uint8Array.
 *
 * @param hash128 - 128-bit hash as BigInt
 * @returns 16-byte Uint8Array in little-endian byte order
 */
export function xxh128ToBytes(hash128) {
    const result = new Uint8Array(16);
    const view = new DataView(result.buffer);
    // Extract low and high 64-bit values
    const low64 = hash128 & mask64;
    const high64 = hash128 >> n(64);
    // Write in big-endian order to match Python's xxhash.digest() output
    // Python outputs: [high64 bytes][low64 bytes], each in big-endian
    view.setBigUint64(0, high64, false); // high 64 bits, big-endian
    view.setBigUint64(8, low64, false); // low 64 bits, big-endian
    return result;
}
