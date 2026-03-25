/**
 * FPE-FF1 (Format-preserving encryption algorithm) specified in
 * [NIST 800-38G](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-38G.pdf).
 * @module
 */
import { unsafe } from './aes.ts';
import { type Cipher, abytes, anumber, bytesToNumberBE, clean, numberToBytesBE } from './utils.ts';

// NOTE: no point in inlining encrypt instead of encryptBlock, since BigInt stuff will be slow
const { expandKeyLE, encryptBlock } = unsafe;

// Format-preserving encryption algorithm (FPE-FF1) specified in NIST Special Publication 800-38G.
// https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-38G.pdf

const BLOCK_LEN = 16;

// Calculates a modulo b
function mod(a: number, b: number): number;
function mod(a: bigint, b: bigint): bigint;
function mod(a: any, b: any): number | bigint {
  const result = a % b;
  return result >= 0 ? result : b + result;
}

function NUMradix(radix: number, data: number[]): bigint {
  let res = BigInt(0);
  for (let i of data) res = res * BigInt(radix) + BigInt(i);
  return res;
}

function getRound(radix: number, key: Uint8Array, tweak: Uint8Array, x: number[]) {
  if (radix > 2 ** 16 - 1) throw new Error('invalid radix ' + radix);
  // radix**minlen ≥ 100
  const minLen = Math.ceil(Math.log(100) / Math.log(radix));
  const maxLen = 2 ** 32 - 1;
  // 2 ≤ minlen ≤ maxlen < 2**32
  if (2 > minLen || minLen > maxLen || maxLen >= 2 ** 32)
    throw new Error('Invalid radix: 2 ≤ minlen ≤ maxlen < 2**32');
  if (!Array.isArray(x)) throw new Error('invalid X');
  if (x.length < minLen || x.length > maxLen) throw new Error('X is outside minLen..maxLen bounds');
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
  clean(P);
  PQ.set(tweak, P.length);
  const xk = expandKeyLE(key);
  const round = (A: number[], B: number[], i: number, decrypt = false) => {
    // Q = ... || [i]1 || [NUMradix(B)]b.
    PQ[PQ.length - b - 1] = i;
    if (b) PQ.set(numberToBytesBE(NUMradix(radix, B), b), PQ.length - b);
    // PRF
    let r = new Uint8Array(16);
    for (let j = 0; j < PQ.length / BLOCK_LEN; j++) {
      for (let i = 0; i < BLOCK_LEN; i++) r[i] ^= PQ[j * BLOCK_LEN + i];
      encryptBlock(xk, r);
    }
    // Let S be the first d bytes of the following string of ⎡d/16⎤ blocks:
    // R || CIPHK(R ⊕[1]16) || CIPHK(R ⊕[2]16) ...CIPHK(R ⊕[⎡d / 16⎤ – 1]16).
    let s = Array.from(r);
    for (let j = 1; s.length < d; j++) {
      const block = numberToBytesBE(BigInt(j), 16);
      for (let k = 0; k < BLOCK_LEN; k++) block[k] ^= r[k];
      s.push(...Array.from(encryptBlock(xk, block)));
    }
    let y = bytesToNumberBE(Uint8Array.from(s.slice(0, d)));
    s.fill(0);
    if (decrypt) y = -y;
    const m = i % 2 === 0 ? u : v;
    let c = mod(NUMradix(radix, A) + y, BigInt(radix) ** BigInt(m));
    // STR(radix, m, c)
    const C = Array(m).fill(0);
    for (let i = 0; i < m; i++, c /= BigInt(radix)) C[m - 1 - i] = Number(c % BigInt(radix));
    A.fill(0);
    A = B;
    B = C;
    return [A, B];
  };
  const destroy = () => {
    clean(xk, PQ);
  };
  return { u, round, destroy };
}

const EMPTY_BUF = /* @__PURE__ */ Uint8Array.of();

/** FPE-FF1 format-preserving encryption */
export function FF1(
  radix: number,
  key: Uint8Array,
  tweak: Uint8Array = EMPTY_BUF
): { encrypt(x: number[]): number[]; decrypt(x: number[]): number[] } {
  anumber(radix);
  abytes(key);
  abytes(tweak);
  const PQ = getRound.bind(null, radix, key, tweak);
  return {
    encrypt(x: number[]): number[] {
      const { u, round, destroy } = PQ(x);
      let [A, B] = [x.slice(0, u), x.slice(u)];
      for (let i = 0; i < 10; i++) [A, B] = round(A, B, i);
      destroy();
      const res = A.concat(B);
      A.fill(0);
      B.fill(0);
      return res;
    },
    decrypt(x: number[]): number[] {
      const { u, round, destroy } = PQ(x);
      // The FF1.Decrypt algorithm is similar to the FF1.Encrypt algorithm;
      // the differences are in Step 6, where:
      // 1) the order of the indices is reversed,
      // 2) the roles of A and B are swapped
      // 3) modular addition is replaced by modular subtraction, in Step 6vi.
      let [B, A] = [x.slice(0, u), x.slice(u)];
      for (let i = 9; i >= 0; i--) [A, B] = round(A, B, i, true);
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
  encode(bytes: Uint8Array): number[] {
    const x = [];
    for (let i = 0; i < bytes.length; i++) {
      for (let j = 0, tmp = bytes[i]; j < 8; j++, tmp >>= 1) x.push(tmp & 1);
    }
    return x;
  },
  decode(b: number[]): Uint8Array {
    if (!Array.isArray(b) || b.length % 8) throw new Error('Invalid binary string');
    const res = new Uint8Array(b.length / 8);
    for (let i = 0, j = 0; i < res.length; i++) {
      res[i] = b[j++] | (b[j++] << 1) | (b[j++] << 2) | (b[j++] << 3);
      res[i] |= (b[j++] << 4) | (b[j++] << 5) | (b[j++] << 6) | (b[j++] << 7);
    }
    return res;
  },
};

/** Binary version of FPE-FF1 format-preserving encryption. */
export function BinaryFF1(key: Uint8Array, tweak: Uint8Array = EMPTY_BUF): Cipher {
  const ff1 = FF1(2, key, tweak);
  return {
    encrypt: (x: Uint8Array) => binLE.decode(ff1.encrypt(binLE.encode(x))),
    decrypt: (x: Uint8Array) => binLE.decode(ff1.decrypt(binLE.encode(x))),
  };
}
