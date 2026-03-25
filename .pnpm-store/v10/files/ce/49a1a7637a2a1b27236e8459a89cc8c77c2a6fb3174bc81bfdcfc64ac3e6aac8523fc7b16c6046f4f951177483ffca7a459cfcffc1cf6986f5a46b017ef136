/**
 * [AES](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)
 * a.k.a. Advanced Encryption Standard
 * is a variant of Rijndael block cipher, standardized by NIST in 2001.
 * We provide the fastest available pure JS implementation.
 *
 * Data is split into 128-bit blocks. Encrypted in 10/12/14 rounds (128/192/256 bits). In every round:
 * 1. **S-box**, table substitution
 * 2. **Shift rows**, cyclic shift left of all rows of data array
 * 3. **Mix columns**, multiplying every column by fixed polynomial
 * 4. **Add round key**, round_key xor i-th column of array
 *
 * Check out [FIPS-197](https://csrc.nist.gov/files/pubs/fips/197/final/docs/fips-197.pdf)
 * and [original proposal](https://csrc.nist.gov/csrc/media/projects/cryptographic-standards-and-guidelines/documents/aes-development/rijndael-ammended.pdf)
 * @module
 */
import { ghash, polyval } from './_polyval.ts';
// prettier-ignore
import {
  abytes, clean, complexOverlapBytes, concatBytes,
  copyBytes, createView, equalBytes, getOutput, isAligned32, overlapBytes,
  setBigUint64, u32, u64Lengths, u8, wrapCipher,
  type Cipher, type CipherWithOutput,
} from './utils.ts';

const BLOCK_SIZE = 16;
const BLOCK_SIZE32 = 4;
const EMPTY_BLOCK = /* @__PURE__ */ new Uint8Array(BLOCK_SIZE);
const POLY = 0x11b; // 1 + x + x**3 + x**4 + x**8

// TODO: remove multiplication, binary ops only
function mul2(n: number) {
  return (n << 1) ^ (POLY & -(n >> 7));
}

function mul(a: number, b: number) {
  let res = 0;
  for (; b > 0; b >>= 1) {
    // Montgomery ladder
    res ^= a & -(b & 1); // if (b&1) res ^=a (but const-time).
    a = mul2(a); // a = 2*a
  }
  return res;
}

// AES S-box is generated using finite field inversion,
// an affine transform, and xor of a constant 0x63.
const sbox = /* @__PURE__ */ (() => {
  const t = new Uint8Array(256);
  for (let i = 0, x = 1; i < 256; i++, x ^= mul2(x)) t[i] = x;
  const box = new Uint8Array(256);
  box[0] = 0x63; // first elm
  for (let i = 0; i < 255; i++) {
    let x = t[255 - i];
    x |= x << 8;
    box[t[i]] = (x ^ (x >> 4) ^ (x >> 5) ^ (x >> 6) ^ (x >> 7) ^ 0x63) & 0xff;
  }
  clean(t);
  return box;
})();

// Inverted S-box
const invSbox = /* @__PURE__ */ sbox.map((_, j) => sbox.indexOf(j));

// Rotate u32 by 8
const rotr32_8 = (n: number) => (n << 24) | (n >>> 8);
const rotl32_8 = (n: number) => (n << 8) | (n >>> 24);
// The byte swap operation for uint32 (LE<->BE)
const byteSwap = (word: number) =>
  ((word << 24) & 0xff000000) |
  ((word << 8) & 0xff0000) |
  ((word >>> 8) & 0xff00) |
  ((word >>> 24) & 0xff);

// T-table is optimization suggested in 5.2 of original proposal (missed from FIPS-197). Changes:
// - LE instead of BE
// - bigger tables: T0 and T1 are merged into T01 table and T2 & T3 into T23;
//   so index is u16, instead of u8. This speeds up things, unexpectedly
function genTtable(sbox: Uint8Array, fn: (n: number) => number) {
  if (sbox.length !== 256) throw new Error('Wrong sbox length');
  const T0 = new Uint32Array(256).map((_, j) => fn(sbox[j]));
  const T1 = T0.map(rotl32_8);
  const T2 = T1.map(rotl32_8);
  const T3 = T2.map(rotl32_8);
  const T01 = new Uint32Array(256 * 256);
  const T23 = new Uint32Array(256 * 256);
  const sbox2 = new Uint16Array(256 * 256);
  for (let i = 0; i < 256; i++) {
    for (let j = 0; j < 256; j++) {
      const idx = i * 256 + j;
      T01[idx] = T0[i] ^ T1[j];
      T23[idx] = T2[i] ^ T3[j];
      sbox2[idx] = (sbox[i] << 8) | sbox[j];
    }
  }
  return { sbox, sbox2, T0, T1, T2, T3, T01, T23 };
}

const tableEncoding = /* @__PURE__ */ genTtable(
  sbox,
  (s: number) => (mul(s, 3) << 24) | (s << 16) | (s << 8) | mul(s, 2)
);
const tableDecoding = /* @__PURE__ */ genTtable(
  invSbox,
  (s) => (mul(s, 11) << 24) | (mul(s, 13) << 16) | (mul(s, 9) << 8) | mul(s, 14)
);

const xPowers = /* @__PURE__ */ (() => {
  const p = new Uint8Array(16);
  for (let i = 0, x = 1; i < 16; i++, x = mul2(x)) p[i] = x;
  return p;
})();

/** Key expansion used in CTR. */
function expandKeyLE(key: Uint8Array): Uint32Array {
  abytes(key);
  const len = key.length;
  if (![16, 24, 32].includes(len))
    throw new Error('aes: invalid key size, should be 16, 24 or 32, got ' + len);
  const { sbox2 } = tableEncoding;
  const toClean = [];
  if (!isAligned32(key)) toClean.push((key = copyBytes(key)));
  const k32 = u32(key);
  const Nk = k32.length;
  const subByte = (n: number) => applySbox(sbox2, n, n, n, n);
  const xk = new Uint32Array(len + 28); // expanded key
  xk.set(k32);
  // 4.3.1 Key expansion
  for (let i = Nk; i < xk.length; i++) {
    let t = xk[i - 1];
    if (i % Nk === 0) t = subByte(rotr32_8(t)) ^ xPowers[i / Nk - 1];
    else if (Nk > 6 && i % Nk === 4) t = subByte(t);
    xk[i] = xk[i - Nk] ^ t;
  }
  clean(...toClean);
  return xk;
}

function expandKeyDecLE(key: Uint8Array): Uint32Array {
  const encKey = expandKeyLE(key);
  const xk = encKey.slice();
  const Nk = encKey.length;
  const { sbox2 } = tableEncoding;
  const { T0, T1, T2, T3 } = tableDecoding;
  // Inverse key by chunks of 4 (rounds)
  for (let i = 0; i < Nk; i += 4) {
    for (let j = 0; j < 4; j++) xk[i + j] = encKey[Nk - i - 4 + j];
  }
  clean(encKey);
  // apply InvMixColumn except first & last round
  for (let i = 4; i < Nk - 4; i++) {
    const x = xk[i];
    const w = applySbox(sbox2, x, x, x, x);
    xk[i] = T0[w & 0xff] ^ T1[(w >>> 8) & 0xff] ^ T2[(w >>> 16) & 0xff] ^ T3[w >>> 24];
  }
  return xk;
}

// Apply tables
function apply0123(
  T01: Uint32Array,
  T23: Uint32Array,
  s0: number,
  s1: number,
  s2: number,
  s3: number
) {
  return (
    T01[((s0 << 8) & 0xff00) | ((s1 >>> 8) & 0xff)] ^
    T23[((s2 >>> 8) & 0xff00) | ((s3 >>> 24) & 0xff)]
  );
}

function applySbox(sbox2: Uint16Array, s0: number, s1: number, s2: number, s3: number) {
  return (
    sbox2[(s0 & 0xff) | (s1 & 0xff00)] |
    (sbox2[((s2 >>> 16) & 0xff) | ((s3 >>> 16) & 0xff00)] << 16)
  );
}

function encrypt(
  xk: Uint32Array,
  s0: number,
  s1: number,
  s2: number,
  s3: number
): { s0: number; s1: number; s2: number; s3: number } {
  const { sbox2, T01, T23 } = tableEncoding;
  let k = 0;
  (s0 ^= xk[k++]), (s1 ^= xk[k++]), (s2 ^= xk[k++]), (s3 ^= xk[k++]);
  const rounds = xk.length / 4 - 2;
  for (let i = 0; i < rounds; i++) {
    const t0 = xk[k++] ^ apply0123(T01, T23, s0, s1, s2, s3);
    const t1 = xk[k++] ^ apply0123(T01, T23, s1, s2, s3, s0);
    const t2 = xk[k++] ^ apply0123(T01, T23, s2, s3, s0, s1);
    const t3 = xk[k++] ^ apply0123(T01, T23, s3, s0, s1, s2);
    (s0 = t0), (s1 = t1), (s2 = t2), (s3 = t3);
  }
  // last round (without mixcolumns, so using SBOX2 table)
  const t0 = xk[k++] ^ applySbox(sbox2, s0, s1, s2, s3);
  const t1 = xk[k++] ^ applySbox(sbox2, s1, s2, s3, s0);
  const t2 = xk[k++] ^ applySbox(sbox2, s2, s3, s0, s1);
  const t3 = xk[k++] ^ applySbox(sbox2, s3, s0, s1, s2);
  return { s0: t0, s1: t1, s2: t2, s3: t3 };
}

// Can't be merged with encrypt: arg positions for apply0123 / applySbox are different
function decrypt(
  xk: Uint32Array,
  s0: number,
  s1: number,
  s2: number,
  s3: number
): {
  s0: number;
  s1: number;
  s2: number;
  s3: number;
} {
  const { sbox2, T01, T23 } = tableDecoding;
  let k = 0;
  (s0 ^= xk[k++]), (s1 ^= xk[k++]), (s2 ^= xk[k++]), (s3 ^= xk[k++]);
  const rounds = xk.length / 4 - 2;
  for (let i = 0; i < rounds; i++) {
    const t0 = xk[k++] ^ apply0123(T01, T23, s0, s3, s2, s1);
    const t1 = xk[k++] ^ apply0123(T01, T23, s1, s0, s3, s2);
    const t2 = xk[k++] ^ apply0123(T01, T23, s2, s1, s0, s3);
    const t3 = xk[k++] ^ apply0123(T01, T23, s3, s2, s1, s0);
    (s0 = t0), (s1 = t1), (s2 = t2), (s3 = t3);
  }
  // Last round
  const t0: number = xk[k++] ^ applySbox(sbox2, s0, s3, s2, s1);
  const t1: number = xk[k++] ^ applySbox(sbox2, s1, s0, s3, s2);
  const t2: number = xk[k++] ^ applySbox(sbox2, s2, s1, s0, s3);
  const t3: number = xk[k++] ^ applySbox(sbox2, s3, s2, s1, s0);
  return { s0: t0, s1: t1, s2: t2, s3: t3 };
}

// TODO: investigate merging with ctr32
function ctrCounter(
  xk: Uint32Array,
  nonce: Uint8Array,
  src: Uint8Array,
  dst?: Uint8Array
): Uint8Array {
  abytes(nonce, BLOCK_SIZE);
  abytes(src);
  const srcLen = src.length;
  dst = getOutput(srcLen, dst);
  complexOverlapBytes(src, dst);
  const ctr = nonce;
  const c32 = u32(ctr);
  // Fill block (empty, ctr=0)
  let { s0, s1, s2, s3 } = encrypt(xk, c32[0], c32[1], c32[2], c32[3]);
  const src32 = u32(src);
  const dst32 = u32(dst);
  // process blocks
  for (let i = 0; i + 4 <= src32.length; i += 4) {
    dst32[i + 0] = src32[i + 0] ^ s0;
    dst32[i + 1] = src32[i + 1] ^ s1;
    dst32[i + 2] = src32[i + 2] ^ s2;
    dst32[i + 3] = src32[i + 3] ^ s3;
    // Full 128 bit counter with wrap around
    let carry = 1;
    for (let i = ctr.length - 1; i >= 0; i--) {
      carry = (carry + (ctr[i] & 0xff)) | 0;
      ctr[i] = carry & 0xff;
      carry >>>= 8;
    }
    ({ s0, s1, s2, s3 } = encrypt(xk, c32[0], c32[1], c32[2], c32[3]));
  }
  // leftovers (less than block)
  // It's possible to handle > u32 fast, but is it worth it?
  const start = BLOCK_SIZE * Math.floor(src32.length / BLOCK_SIZE32);
  if (start < srcLen) {
    const b32 = new Uint32Array([s0, s1, s2, s3]);
    const buf = u8(b32);
    for (let i = start, pos = 0; i < srcLen; i++, pos++) dst[i] = src[i] ^ buf[pos];
    clean(b32);
  }
  return dst;
}

// AES CTR with overflowing 32 bit counter
// It's possible to do 32le significantly simpler (and probably faster) by using u32.
// But, we need both, and perf bottleneck is in ghash anyway.
function ctr32(
  xk: Uint32Array,
  isLE: boolean,
  nonce: Uint8Array,
  src: Uint8Array,
  dst?: Uint8Array
): Uint8Array {
  abytes(nonce, BLOCK_SIZE);
  abytes(src);
  dst = getOutput(src.length, dst);
  const ctr = nonce; // write new value to nonce, so it can be re-used
  const c32 = u32(ctr);
  const view = createView(ctr);
  const src32 = u32(src);
  const dst32 = u32(dst);
  const ctrPos = isLE ? 0 : 12;
  const srcLen = src.length;
  // Fill block (empty, ctr=0)
  let ctrNum = view.getUint32(ctrPos, isLE); // read current counter value
  let { s0, s1, s2, s3 } = encrypt(xk, c32[0], c32[1], c32[2], c32[3]);
  // process blocks
  for (let i = 0; i + 4 <= src32.length; i += 4) {
    dst32[i + 0] = src32[i + 0] ^ s0;
    dst32[i + 1] = src32[i + 1] ^ s1;
    dst32[i + 2] = src32[i + 2] ^ s2;
    dst32[i + 3] = src32[i + 3] ^ s3;
    ctrNum = (ctrNum + 1) >>> 0; // u32 wrap
    view.setUint32(ctrPos, ctrNum, isLE);
    ({ s0, s1, s2, s3 } = encrypt(xk, c32[0], c32[1], c32[2], c32[3]));
  }
  // leftovers (less than a block)
  const start = BLOCK_SIZE * Math.floor(src32.length / BLOCK_SIZE32);
  if (start < srcLen) {
    const b32 = new Uint32Array([s0, s1, s2, s3]);
    const buf = u8(b32);
    for (let i = start, pos = 0; i < srcLen; i++, pos++) dst[i] = src[i] ^ buf[pos];
    clean(b32);
  }
  return dst;
}

/**
 * CTR: counter mode. Creates stream cipher.
 * Requires good IV. Parallelizable. OK, but no MAC.
 */
export const ctr: ((key: Uint8Array, nonce: Uint8Array) => CipherWithOutput) & {
  blockSize: number;
  nonceLength: number;
} = /* @__PURE__ */ wrapCipher(
  { blockSize: 16, nonceLength: 16 },
  function aesctr(key: Uint8Array, nonce: Uint8Array): CipherWithOutput {
    function processCtr(buf: Uint8Array, dst?: Uint8Array) {
      abytes(buf);
      if (dst !== undefined) {
        abytes(dst);
        if (!isAligned32(dst)) throw new Error('unaligned destination');
      }
      const xk = expandKeyLE(key);
      const n = copyBytes(nonce); // align + avoid changing
      const toClean = [xk, n];
      if (!isAligned32(buf)) toClean.push((buf = copyBytes(buf)));
      const out = ctrCounter(xk, n, buf, dst);
      clean(...toClean);
      return out;
    }
    return {
      encrypt: (plaintext: Uint8Array, dst?: Uint8Array) => processCtr(plaintext, dst),
      decrypt: (ciphertext: Uint8Array, dst?: Uint8Array) => processCtr(ciphertext, dst),
    };
  }
);

function validateBlockDecrypt(data: Uint8Array) {
  abytes(data);
  if (data.length % BLOCK_SIZE !== 0) {
    throw new Error(
      'aes-(cbc/ecb).decrypt ciphertext should consist of blocks with size ' + BLOCK_SIZE
    );
  }
}

function validateBlockEncrypt(plaintext: Uint8Array, pcks5: boolean, dst?: Uint8Array) {
  abytes(plaintext);
  let outLen = plaintext.length;
  const remaining = outLen % BLOCK_SIZE;
  if (!pcks5 && remaining !== 0)
    throw new Error('aec/(cbc-ecb): unpadded plaintext with disabled padding');
  if (!isAligned32(plaintext)) plaintext = copyBytes(plaintext);
  const b = u32(plaintext);
  if (pcks5) {
    let left = BLOCK_SIZE - remaining;
    if (!left) left = BLOCK_SIZE; // if no bytes left, create empty padding block
    outLen = outLen + left;
  }
  dst = getOutput(outLen, dst);
  complexOverlapBytes(plaintext, dst);
  const o = u32(dst);
  return { b, o, out: dst };
}

function validatePCKS(data: Uint8Array, pcks5: boolean) {
  if (!pcks5) return data;
  const len = data.length;
  if (!len) throw new Error('aes/pcks5: empty ciphertext not allowed');
  const lastByte = data[len - 1];
  if (lastByte <= 0 || lastByte > 16) throw new Error('aes/pcks5: wrong padding');
  const out = data.subarray(0, -lastByte);
  for (let i = 0; i < lastByte; i++)
    if (data[len - i - 1] !== lastByte) throw new Error('aes/pcks5: wrong padding');
  return out;
}

function padPCKS(left: Uint8Array) {
  const tmp = new Uint8Array(16);
  const tmp32 = u32(tmp);
  tmp.set(left);
  const paddingByte = BLOCK_SIZE - left.length;
  for (let i = BLOCK_SIZE - paddingByte; i < BLOCK_SIZE; i++) tmp[i] = paddingByte;
  return tmp32;
}

/** Options for ECB and CBC. */
export type BlockOpts = { disablePadding?: boolean };

/**
 * ECB: Electronic CodeBook. Simple deterministic replacement.
 * Dangerous: always map x to y. See [AES Penguin](https://words.filippo.io/the-ecb-penguin/).
 */
export const ecb: ((key: Uint8Array, opts?: BlockOpts) => CipherWithOutput) & {
  blockSize: number;
} = /* @__PURE__ */ wrapCipher(
  { blockSize: 16 },
  function aesecb(key: Uint8Array, opts: BlockOpts = {}): CipherWithOutput {
    const pcks5 = !opts.disablePadding;
    return {
      encrypt(plaintext: Uint8Array, dst?: Uint8Array) {
        const { b, o, out: _out } = validateBlockEncrypt(plaintext, pcks5, dst);
        const xk = expandKeyLE(key);
        let i = 0;
        for (; i + 4 <= b.length; ) {
          const { s0, s1, s2, s3 } = encrypt(xk, b[i + 0], b[i + 1], b[i + 2], b[i + 3]);
          (o[i++] = s0), (o[i++] = s1), (o[i++] = s2), (o[i++] = s3);
        }
        if (pcks5) {
          const tmp32 = padPCKS(plaintext.subarray(i * 4));
          const { s0, s1, s2, s3 } = encrypt(xk, tmp32[0], tmp32[1], tmp32[2], tmp32[3]);
          (o[i++] = s0), (o[i++] = s1), (o[i++] = s2), (o[i++] = s3);
        }
        clean(xk);
        return _out;
      },
      decrypt(ciphertext: Uint8Array, dst?: Uint8Array) {
        validateBlockDecrypt(ciphertext);
        const xk = expandKeyDecLE(key);
        dst = getOutput(ciphertext.length, dst);
        const toClean: (Uint8Array | Uint32Array)[] = [xk];
        if (!isAligned32(ciphertext)) toClean.push((ciphertext = copyBytes(ciphertext)));
        complexOverlapBytes(ciphertext, dst);
        const b = u32(ciphertext);
        const o = u32(dst);
        for (let i = 0; i + 4 <= b.length; ) {
          const { s0, s1, s2, s3 } = decrypt(xk, b[i + 0], b[i + 1], b[i + 2], b[i + 3]);
          (o[i++] = s0), (o[i++] = s1), (o[i++] = s2), (o[i++] = s3);
        }
        clean(...toClean);
        return validatePCKS(dst, pcks5);
      },
    };
  }
);

/**
 * CBC: Cipher-Block-Chaining. Key is previous round’s block.
 * Fragile: needs proper padding. Unauthenticated: needs MAC.
 */
export const cbc: ((key: Uint8Array, iv: Uint8Array, opts?: BlockOpts) => CipherWithOutput) & {
  blockSize: number;
  nonceLength: number;
} = /* @__PURE__ */ wrapCipher(
  { blockSize: 16, nonceLength: 16 },
  function aescbc(key: Uint8Array, iv: Uint8Array, opts: BlockOpts = {}): CipherWithOutput {
    const pcks5 = !opts.disablePadding;
    return {
      encrypt(plaintext: Uint8Array, dst?: Uint8Array) {
        const xk = expandKeyLE(key);
        const { b, o, out: _out } = validateBlockEncrypt(plaintext, pcks5, dst);
        let _iv = iv;
        const toClean: (Uint8Array | Uint32Array)[] = [xk];
        if (!isAligned32(_iv)) toClean.push((_iv = copyBytes(_iv)));
        const n32 = u32(_iv);
        // prettier-ignore
        let s0 = n32[0], s1 = n32[1], s2 = n32[2], s3 = n32[3];
        let i = 0;
        for (; i + 4 <= b.length; ) {
          (s0 ^= b[i + 0]), (s1 ^= b[i + 1]), (s2 ^= b[i + 2]), (s3 ^= b[i + 3]);
          ({ s0, s1, s2, s3 } = encrypt(xk, s0, s1, s2, s3));
          (o[i++] = s0), (o[i++] = s1), (o[i++] = s2), (o[i++] = s3);
        }
        if (pcks5) {
          const tmp32 = padPCKS(plaintext.subarray(i * 4));
          (s0 ^= tmp32[0]), (s1 ^= tmp32[1]), (s2 ^= tmp32[2]), (s3 ^= tmp32[3]);
          ({ s0, s1, s2, s3 } = encrypt(xk, s0, s1, s2, s3));
          (o[i++] = s0), (o[i++] = s1), (o[i++] = s2), (o[i++] = s3);
        }
        clean(...toClean);
        return _out;
      },
      decrypt(ciphertext: Uint8Array, dst?: Uint8Array) {
        validateBlockDecrypt(ciphertext);
        const xk = expandKeyDecLE(key);
        let _iv = iv;
        const toClean: (Uint8Array | Uint32Array)[] = [xk];
        if (!isAligned32(_iv)) toClean.push((_iv = copyBytes(_iv)));
        const n32 = u32(_iv);
        dst = getOutput(ciphertext.length, dst);
        if (!isAligned32(ciphertext)) toClean.push((ciphertext = copyBytes(ciphertext)));
        complexOverlapBytes(ciphertext, dst);
        const b = u32(ciphertext);
        const o = u32(dst);
        // prettier-ignore
        let s0 = n32[0], s1 = n32[1], s2 = n32[2], s3 = n32[3];
        for (let i = 0; i + 4 <= b.length; ) {
          // prettier-ignore
          const ps0 = s0, ps1 = s1, ps2 = s2, ps3 = s3;
          (s0 = b[i + 0]), (s1 = b[i + 1]), (s2 = b[i + 2]), (s3 = b[i + 3]);
          const { s0: o0, s1: o1, s2: o2, s3: o3 } = decrypt(xk, s0, s1, s2, s3);
          (o[i++] = o0 ^ ps0), (o[i++] = o1 ^ ps1), (o[i++] = o2 ^ ps2), (o[i++] = o3 ^ ps3);
        }
        clean(...toClean);
        return validatePCKS(dst, pcks5);
      },
    };
  }
);

/**
 * CFB: Cipher Feedback Mode. The input for the block cipher is the previous cipher output.
 * Unauthenticated: needs MAC.
 */
export const cfb: ((key: Uint8Array, iv: Uint8Array) => CipherWithOutput) & {
  blockSize: number;
  nonceLength: number;
} = /* @__PURE__ */ wrapCipher(
  { blockSize: 16, nonceLength: 16 },
  function aescfb(key: Uint8Array, iv: Uint8Array): CipherWithOutput {
    function processCfb(src: Uint8Array, isEncrypt: boolean, dst?: Uint8Array) {
      abytes(src);
      const srcLen = src.length;
      dst = getOutput(srcLen, dst);
      if (overlapBytes(src, dst)) throw new Error('overlapping src and dst not supported.');
      const xk = expandKeyLE(key);
      let _iv = iv;
      const toClean: (Uint8Array | Uint32Array)[] = [xk];
      if (!isAligned32(_iv)) toClean.push((_iv = copyBytes(_iv)));
      if (!isAligned32(src)) toClean.push((src = copyBytes(src)));
      const src32 = u32(src);
      const dst32 = u32(dst);
      const next32 = isEncrypt ? dst32 : src32;
      const n32 = u32(_iv);
      // prettier-ignore
      let s0 = n32[0], s1 = n32[1], s2 = n32[2], s3 = n32[3];
      for (let i = 0; i + 4 <= src32.length; ) {
        const { s0: e0, s1: e1, s2: e2, s3: e3 } = encrypt(xk, s0, s1, s2, s3);
        dst32[i + 0] = src32[i + 0] ^ e0;
        dst32[i + 1] = src32[i + 1] ^ e1;
        dst32[i + 2] = src32[i + 2] ^ e2;
        dst32[i + 3] = src32[i + 3] ^ e3;
        (s0 = next32[i++]), (s1 = next32[i++]), (s2 = next32[i++]), (s3 = next32[i++]);
      }
      // leftovers (less than block)
      const start = BLOCK_SIZE * Math.floor(src32.length / BLOCK_SIZE32);
      if (start < srcLen) {
        ({ s0, s1, s2, s3 } = encrypt(xk, s0, s1, s2, s3));
        const buf = u8(new Uint32Array([s0, s1, s2, s3]));
        for (let i = start, pos = 0; i < srcLen; i++, pos++) dst[i] = src[i] ^ buf[pos];
        clean(buf);
      }
      clean(...toClean);
      return dst;
    }
    return {
      encrypt: (plaintext: Uint8Array, dst?: Uint8Array) => processCfb(plaintext, true, dst),
      decrypt: (ciphertext: Uint8Array, dst?: Uint8Array) => processCfb(ciphertext, false, dst),
    };
  }
);

// TODO: merge with chacha, however gcm has bitLen while chacha has byteLen
function computeTag(
  fn: typeof ghash,
  isLE: boolean,
  key: Uint8Array,
  data: Uint8Array,
  AAD?: Uint8Array
) {
  const aadLength = AAD ? AAD.length : 0;
  const h = fn.create(key, data.length + aadLength);
  if (AAD) h.update(AAD);
  const num = u64Lengths(8 * data.length, 8 * aadLength, isLE);
  h.update(data);
  h.update(num);
  const res = h.digest();
  clean(num);
  return res;
}

/**
 * GCM: Galois/Counter Mode.
 * Modern, parallel version of CTR, with MAC.
 * Be careful: MACs can be forged.
 * Unsafe to use random nonces under the same key, due to collision chance.
 * As for nonce size, prefer 12-byte, instead of 8-byte.
 */
export const gcm: ((key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array) => Cipher) & {
  blockSize: number;
  nonceLength: number;
  tagLength: number;
  varSizeNonce: true;
} = /* @__PURE__ */ wrapCipher(
  { blockSize: 16, nonceLength: 12, tagLength: 16, varSizeNonce: true },
  function aesgcm(key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array): Cipher {
    // NIST 800-38d doesn't enforce minimum nonce length.
    // We enforce 8 bytes for compat with openssl.
    // 12 bytes are recommended. More than 12 bytes would be converted into 12.
    if (nonce.length < 8) throw new Error('aes/gcm: invalid nonce length');
    const tagLength = 16;
    function _computeTag(authKey: Uint8Array, tagMask: Uint8Array, data: Uint8Array) {
      const tag = computeTag(ghash, false, authKey, data, AAD);
      for (let i = 0; i < tagMask.length; i++) tag[i] ^= tagMask[i];
      return tag;
    }
    function deriveKeys() {
      const xk = expandKeyLE(key);
      const authKey = EMPTY_BLOCK.slice();
      const counter = EMPTY_BLOCK.slice();
      ctr32(xk, false, counter, counter, authKey);
      // NIST 800-38d, page 15: different behavior for 96-bit and non-96-bit nonces
      if (nonce.length === 12) {
        counter.set(nonce);
      } else {
        const nonceLen = EMPTY_BLOCK.slice();
        const view = createView(nonceLen);
        setBigUint64(view, 8, BigInt(nonce.length * 8), false);
        // ghash(nonce || u64be(0) || u64be(nonceLen*8))
        const g = ghash.create(authKey).update(nonce).update(nonceLen);
        g.digestInto(counter); // digestInto doesn't trigger '.destroy'
        g.destroy();
      }
      const tagMask = ctr32(xk, false, counter, EMPTY_BLOCK);
      return { xk, authKey, counter, tagMask };
    }
    return {
      encrypt(plaintext: Uint8Array) {
        const { xk, authKey, counter, tagMask } = deriveKeys();
        const out = new Uint8Array(plaintext.length + tagLength);
        const toClean: (Uint8Array | Uint32Array)[] = [xk, authKey, counter, tagMask];
        if (!isAligned32(plaintext)) toClean.push((plaintext = copyBytes(plaintext)));
        ctr32(xk, false, counter, plaintext, out.subarray(0, plaintext.length));
        const tag = _computeTag(authKey, tagMask, out.subarray(0, out.length - tagLength));
        toClean.push(tag);
        out.set(tag, plaintext.length);
        clean(...toClean);
        return out;
      },
      decrypt(ciphertext: Uint8Array) {
        const { xk, authKey, counter, tagMask } = deriveKeys();
        const toClean: (Uint8Array | Uint32Array)[] = [xk, authKey, tagMask, counter];
        if (!isAligned32(ciphertext)) toClean.push((ciphertext = copyBytes(ciphertext)));
        const data = ciphertext.subarray(0, -tagLength);
        const passedTag = ciphertext.subarray(-tagLength);
        const tag = _computeTag(authKey, tagMask, data);
        toClean.push(tag);
        if (!equalBytes(tag, passedTag)) throw new Error('aes/gcm: invalid ghash tag');
        const out = ctr32(xk, false, counter, data);
        clean(...toClean);
        return out;
      },
    };
  }
);

const limit = (name: string, min: number, max: number) => (value: number) => {
  if (!Number.isSafeInteger(value) || min > value || value > max) {
    const minmax = '[' + min + '..' + max + ']';
    throw new Error('' + name + ': expected value in range ' + minmax + ', got ' + value);
  }
};

/**
 * AES-GCM-SIV: classic AES-GCM with nonce-misuse resistance.
 * Guarantees that, when a nonce is repeated, the only security loss is that identical
 * plaintexts will produce identical ciphertexts.
 * RFC 8452, https://datatracker.ietf.org/doc/html/rfc8452
 */
export const gcmsiv: ((key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array) => Cipher) & {
  blockSize: number;
  nonceLength: number;
  tagLength: number;
  varSizeNonce: true;
} = /* @__PURE__ */ wrapCipher(
  { blockSize: 16, nonceLength: 12, tagLength: 16, varSizeNonce: true },
  function aessiv(key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array): Cipher {
    const tagLength = 16;
    // From RFC 8452: Section 6
    const AAD_LIMIT = limit('AAD', 0, 2 ** 36);
    const PLAIN_LIMIT = limit('plaintext', 0, 2 ** 36);
    const NONCE_LIMIT = limit('nonce', 12, 12);
    const CIPHER_LIMIT = limit('ciphertext', 16, 2 ** 36 + 16);
    abytes(key, 16, 24, 32);
    NONCE_LIMIT(nonce.length);
    if (AAD !== undefined) AAD_LIMIT(AAD.length);
    function deriveKeys() {
      const xk = expandKeyLE(key);
      const encKey = new Uint8Array(key.length);
      const authKey = new Uint8Array(16);
      const toClean: (Uint8Array | Uint32Array)[] = [xk, encKey];
      let _nonce = nonce;
      if (!isAligned32(_nonce)) toClean.push((_nonce = copyBytes(_nonce)));
      const n32 = u32(_nonce);
      // prettier-ignore
      let s0 = 0, s1 = n32[0], s2 = n32[1], s3 = n32[2];
      let counter = 0;
      for (const derivedKey of [authKey, encKey].map(u32)) {
        const d32 = u32(derivedKey);
        for (let i = 0; i < d32.length; i += 2) {
          // aes(u32le(0) || nonce)[:8] || aes(u32le(1) || nonce)[:8] ...
          const { s0: o0, s1: o1 } = encrypt(xk, s0, s1, s2, s3);
          d32[i + 0] = o0;
          d32[i + 1] = o1;
          s0 = ++counter; // increment counter inside state
        }
      }
      const res = { authKey, encKey: expandKeyLE(encKey) };
      // Cleanup
      clean(...toClean);
      return res;
    }
    function _computeTag(encKey: Uint32Array, authKey: Uint8Array, data: Uint8Array) {
      const tag = computeTag(polyval, true, authKey, data, AAD);
      // Compute the expected tag by XORing S_s and the nonce, clearing the
      // most significant bit of the last byte and encrypting with the
      // message-encryption key.
      for (let i = 0; i < 12; i++) tag[i] ^= nonce[i];
      tag[15] &= 0x7f; // Clear the highest bit
      // encrypt tag as block
      const t32 = u32(tag);
      // prettier-ignore
      let s0 = t32[0], s1 = t32[1], s2 = t32[2], s3 = t32[3];
      ({ s0, s1, s2, s3 } = encrypt(encKey, s0, s1, s2, s3));
      (t32[0] = s0), (t32[1] = s1), (t32[2] = s2), (t32[3] = s3);
      return tag;
    }
    // actual decrypt/encrypt of message.
    function processSiv(encKey: Uint32Array, tag: Uint8Array, input: Uint8Array) {
      let block = copyBytes(tag);
      block[15] |= 0x80; // Force highest bit
      const res = ctr32(encKey, true, block, input);
      // Cleanup
      clean(block);
      return res;
    }
    return {
      encrypt(plaintext: Uint8Array) {
        PLAIN_LIMIT(plaintext.length);
        const { encKey, authKey } = deriveKeys();
        const tag = _computeTag(encKey, authKey, plaintext);
        const toClean: (Uint8Array | Uint32Array)[] = [encKey, authKey, tag];
        if (!isAligned32(plaintext)) toClean.push((plaintext = copyBytes(plaintext)));
        const out = new Uint8Array(plaintext.length + tagLength);
        out.set(tag, plaintext.length);
        out.set(processSiv(encKey, tag, plaintext));
        // Cleanup
        clean(...toClean);
        return out;
      },
      decrypt(ciphertext: Uint8Array) {
        CIPHER_LIMIT(ciphertext.length);
        const tag = ciphertext.subarray(-tagLength);
        const { encKey, authKey } = deriveKeys();
        const toClean: (Uint8Array | Uint32Array)[] = [encKey, authKey];
        if (!isAligned32(ciphertext)) toClean.push((ciphertext = copyBytes(ciphertext)));
        const plaintext = processSiv(encKey, tag, ciphertext.subarray(0, -tagLength));
        const expectedTag = _computeTag(encKey, authKey, plaintext);
        toClean.push(expectedTag);
        if (!equalBytes(tag, expectedTag)) {
          clean(...toClean);
          throw new Error('invalid polyval tag');
        }
        // Cleanup
        clean(...toClean);
        return plaintext;
      },
    };
  }
);

/**
 * AES-GCM-SIV, not AES-SIV.
 * This is legace name, use `gcmsiv` export instead.
 * @deprecated
 */
export const siv: typeof gcmsiv = gcmsiv;

function isBytes32(a: unknown): a is Uint32Array {
  return (
    a instanceof Uint32Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint32Array')
  );
}

function encryptBlock(xk: Uint32Array, block: Uint8Array): Uint8Array {
  abytes(block, 16);
  if (!isBytes32(xk)) throw new Error('_encryptBlock accepts result of expandKeyLE');
  const b32 = u32(block);
  let { s0, s1, s2, s3 } = encrypt(xk, b32[0], b32[1], b32[2], b32[3]);
  (b32[0] = s0), (b32[1] = s1), (b32[2] = s2), (b32[3] = s3);
  return block;
}

function decryptBlock(xk: Uint32Array, block: Uint8Array): Uint8Array {
  abytes(block, 16);
  if (!isBytes32(xk)) throw new Error('_decryptBlock accepts result of expandKeyLE');
  const b32 = u32(block);
  let { s0, s1, s2, s3 } = decrypt(xk, b32[0], b32[1], b32[2], b32[3]);
  (b32[0] = s0), (b32[1] = s1), (b32[2] = s2), (b32[3] = s3);
  return block;
}

/**
 * AES-W (base for AESKW/AESKWP).
 * Specs: [SP800-38F](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-38F.pdf),
 * [RFC 3394](https://datatracker.ietf.org/doc/rfc3394/),
 * [RFC 5649](https://datatracker.ietf.org/doc/rfc5649/).
 */
const AESW = {
  /*
  High-level pseudocode:
  ```
  A: u64 = IV
  out = []
  for (let i=0, ctr = 0; i<6; i++) {
    for (const chunk of chunks(plaintext, 8)) {
      A ^= swapEndianess(ctr++)
      [A, res] = chunks(encrypt(A || chunk), 8);
      out ||= res
    }
  }
  out = A || out
  ```
  Decrypt is the same, but reversed.
  */
  encrypt(kek: Uint8Array, out: Uint8Array) {
    // Size is limited to 4GB, otherwise ctr will overflow and we'll need to switch to bigints.
    // If you need it larger, open an issue.
    if (out.length >= 2 ** 32) throw new Error('plaintext should be less than 4gb');
    const xk = expandKeyLE(kek);
    if (out.length === 16) encryptBlock(xk, out);
    else {
      const o32 = u32(out);
      // prettier-ignore
      let a0 = o32[0], a1 = o32[1]; // A
      for (let j = 0, ctr = 1; j < 6; j++) {
        for (let pos = 2; pos < o32.length; pos += 2, ctr++) {
          const { s0, s1, s2, s3 } = encrypt(xk, a0, a1, o32[pos], o32[pos + 1]);
          // A = MSB(64, B) ^ t where t = (n*j)+i
          (a0 = s0), (a1 = s1 ^ byteSwap(ctr)), (o32[pos] = s2), (o32[pos + 1] = s3);
        }
      }
      (o32[0] = a0), (o32[1] = a1); // out = A || out
    }
    xk.fill(0);
  },
  decrypt(kek: Uint8Array, out: Uint8Array) {
    if (out.length - 8 >= 2 ** 32) throw new Error('ciphertext should be less than 4gb');
    const xk = expandKeyDecLE(kek);
    const chunks = out.length / 8 - 1; // first chunk is IV
    if (chunks === 1) decryptBlock(xk, out);
    else {
      const o32 = u32(out);
      // prettier-ignore
      let a0 = o32[0], a1 = o32[1]; // A
      for (let j = 0, ctr = chunks * 6; j < 6; j++) {
        for (let pos = chunks * 2; pos >= 1; pos -= 2, ctr--) {
          a1 ^= byteSwap(ctr);
          const { s0, s1, s2, s3 } = decrypt(xk, a0, a1, o32[pos], o32[pos + 1]);
          (a0 = s0), (a1 = s1), (o32[pos] = s2), (o32[pos + 1] = s3);
        }
      }
      (o32[0] = a0), (o32[1] = a1);
    }
    xk.fill(0);
  },
};

const AESKW_IV = /* @__PURE__ */ new Uint8Array(8).fill(0xa6); // A6A6A6A6A6A6A6A6

/**
 * AES-KW (key-wrap). Injects static IV into plaintext, adds counter, encrypts 6 times.
 * Reduces block size from 16 to 8 bytes.
 * For padded version, use aeskwp.
 * [RFC 3394](https://datatracker.ietf.org/doc/rfc3394/),
 * [NIST.SP.800-38F](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-38F.pdf).
 */
export const aeskw: ((kek: Uint8Array) => Cipher) & {
  blockSize: number;
} = /* @__PURE__ */ wrapCipher(
  { blockSize: 8 },
  (kek: Uint8Array): Cipher => ({
    encrypt(plaintext: Uint8Array) {
      if (!plaintext.length || plaintext.length % 8 !== 0)
        throw new Error('invalid plaintext length');
      if (plaintext.length === 8)
        throw new Error('8-byte keys not allowed in AESKW, use AESKWP instead');
      const out = concatBytes(AESKW_IV, plaintext);
      AESW.encrypt(kek, out);
      return out;
    },
    decrypt(ciphertext: Uint8Array) {
      // ciphertext must be at least 24 bytes and a multiple of 8 bytes
      // 24 because should have at least two block (1 iv + 2).
      // Replace with 16 to enable '8-byte keys'
      if (ciphertext.length % 8 !== 0 || ciphertext.length < 3 * 8)
        throw new Error('invalid ciphertext length');
      const out = copyBytes(ciphertext);
      AESW.decrypt(kek, out);
      if (!equalBytes(out.subarray(0, 8), AESKW_IV)) throw new Error('integrity check failed');
      out.subarray(0, 8).fill(0); // ciphertext.subarray(0, 8) === IV, but we clean it anyway
      return out.subarray(8);
    },
  })
);

/*
We don't support 8-byte keys. The rabbit hole:

- Wycheproof says: "NIST SP 800-38F does not define the wrapping of 8 byte keys.
  RFC 3394 Section 2  on the other hand specifies that 8 byte keys are wrapped
  by directly encrypting one block with AES."
    - https://github.com/C2SP/wycheproof/blob/master/doc/key_wrap.md
    - "RFC 3394 specifies in Section 2, that the input for the key wrap
      algorithm must be at least two blocks and otherwise the constant
      field and key are simply encrypted with ECB as a single block"
- What RFC 3394 actually says (in Section 2):
    - "Before being wrapped, the key data is parsed into n blocks of 64 bits.
      The only restriction the key wrap algorithm places on n is that n be
      at least two"
    - "For key data with length less than or equal to 64 bits, the constant
      field used in this specification and the key data form a single
      128-bit codebook input making this key wrap unnecessary."
- Which means "assert(n >= 2)" and "use something else for 8 byte keys"
- NIST SP800-38F actually prohibits 8-byte in "5.3.1 Mandatory Limits".
  It states that plaintext for KW should be "2 to 2^54 -1 semiblocks".
- So, where does "directly encrypt single block with AES" come from?
    - Not RFC 3394. Pseudocode of key wrap in 2.2 explicitly uses
      loop of 6 for any code path
    - There is a weird W3C spec:
      https://www.w3.org/TR/2002/REC-xmlenc-core-20021210/Overview.html#kw-aes128
    - This spec is outdated, as admitted by Wycheproof authors
    - There is RFC 5649 for padded key wrap, which is padding construction on
      top of AESKW. In '4.1.2' it says: "If the padded plaintext contains exactly
      eight octets, then prepend the AIV as defined in Section 3 above to P[1] and
      encrypt the resulting 128-bit block using AES in ECB mode [Modes] with key
      K (the KEK).  In this case, the output is two 64-bit blocks C[0] and C[1]:"
    - Browser subtle crypto is actually crashes on wrapping keys less than 16 bytes:
      `Error: error:1C8000E6:Provider routines::invalid input length] { opensslErrorStack: [ 'error:030000BD:digital envelope routines::update error' ]`

In the end, seems like a bug in Wycheproof.
The 8-byte check can be easily disabled inside of AES_W.
*/

const AESKWP_IV = 0xa65959a6; // single u32le value

/**
 * AES-KW, but with padding and allows random keys.
 * Second u32 of IV is used as counter for length.
 * [RFC 5649](https://www.rfc-editor.org/rfc/rfc5649)
 */
export const aeskwp: ((kek: Uint8Array) => Cipher) & {
  blockSize: number;
} = /* @__PURE__ */ wrapCipher(
  { blockSize: 8 },
  (kek: Uint8Array): Cipher => ({
    encrypt(plaintext: Uint8Array) {
      if (!plaintext.length) throw new Error('invalid plaintext length');
      const padded = Math.ceil(plaintext.length / 8) * 8;
      const out = new Uint8Array(8 + padded);
      out.set(plaintext, 8);
      const out32 = u32(out);
      out32[0] = AESKWP_IV;
      out32[1] = byteSwap(plaintext.length);
      AESW.encrypt(kek, out);
      return out;
    },
    decrypt(ciphertext: Uint8Array) {
      // 16 because should have at least one block
      if (ciphertext.length < 16) throw new Error('invalid ciphertext length');
      const out = copyBytes(ciphertext);
      const o32 = u32(out);
      AESW.decrypt(kek, out);
      const len = byteSwap(o32[1]) >>> 0;
      const padded = Math.ceil(len / 8) * 8;
      if (o32[0] !== AESKWP_IV || out.length - 8 !== padded)
        throw new Error('integrity check failed');
      for (let i = len; i < padded; i++)
        if (out[8 + i] !== 0) throw new Error('integrity check failed');
      out.subarray(0, 8).fill(0); // ciphertext.subarray(0, 8) === IV, but we clean it anyway
      return out.subarray(8, 8 + len);
    },
  })
);

/** Unsafe low-level internal methods. May change at any time. */
export const unsafe: {
  expandKeyLE: typeof expandKeyLE;
  expandKeyDecLE: typeof expandKeyDecLE;
  encrypt: typeof encrypt;
  decrypt: typeof decrypt;
  encryptBlock: typeof encryptBlock;
  decryptBlock: typeof decryptBlock;
  ctrCounter: typeof ctrCounter;
  ctr32: typeof ctr32;
} = {
  expandKeyLE,
  expandKeyDecLE,
  encrypt,
  decrypt,
  encryptBlock,
  decryptBlock,
  ctrCounter,
  ctr32,
};
