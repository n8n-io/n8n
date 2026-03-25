/**
 * noble-ciphers-micro: more auditable, but 4x slower version of salsa20, chacha & poly1305.
 * Implements the same algorithms that are present in other files, but without
 * unrolled loops (https://en.wikipedia.org/wiki/Loop_unrolling).
 * @module
 */
/*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) */
// prettier-ignore
import { createCipher, rotl } from './_arx.ts';
import {
  type Cipher,
  type XorStream,
  abytes,
  bytesToHex,
  concatBytes,
  equalBytes,
  hexToNumber,
  numberToBytesBE,
  u64Lengths,
  wrapCipher,
} from './utils.ts';

export type ARXCipherN = ((key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array) => Cipher) & {
  blockSize: number;
  nonceLength: number;
  tagLength: number;
};

function bytesToNumberLE(bytes: Uint8Array): bigint {
  abytes(bytes);
  return hexToNumber(bytesToHex(Uint8Array.from(bytes).reverse()));
}

function numberToBytesLE(n: number | bigint, len: number): Uint8Array {
  return numberToBytesBE(n, len).reverse();
}

function salsaQR(x: Uint32Array, a: number, b: number, c: number, d: number) {
  x[b] ^= rotl((x[a] + x[d]) | 0, 7);
  x[c] ^= rotl((x[b] + x[a]) | 0, 9);
  x[d] ^= rotl((x[c] + x[b]) | 0, 13);
  x[a] ^= rotl((x[d] + x[c]) | 0, 18);
}
// prettier-ignore
function chachaQR(x: Uint32Array, a: number, b: number, c: number, d: number) {
  x[a] = (x[a] + x[b]) | 0; x[d] = rotl(x[d] ^ x[a], 16);
  x[c] = (x[c] + x[d]) | 0; x[b] = rotl(x[b] ^ x[c], 12);
  x[a] = (x[a] + x[b]) | 0; x[d] = rotl(x[d] ^ x[a], 8);
  x[c] = (x[c] + x[d]) | 0; x[b] = rotl(x[b] ^ x[c], 7);
}

function salsaRound(x: Uint32Array, rounds = 20) {
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

function chachaRound(x: Uint32Array, rounds = 20) {
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

function salsaCore(
  s: Uint32Array,
  k: Uint32Array,
  n: Uint32Array,
  out: Uint32Array,
  cnt: number,
  rounds = 20
): void {
  // prettier-ignore
  const y = new Uint32Array([
    s[0], k[0], k[1], k[2], // "expa" Key     Key     Key
    k[3], s[1], n[0], n[1], // Key    "nd 3"  Nonce   Nonce
    cnt, 0, s[2], k[4],     // Pos.   Pos.    "2-by"  Key
    k[5], k[6], k[7], s[3], // Key    Key     Key     "te k"
  ]);
  const x = y.slice();
  salsaRound(x, rounds);
  for (let i = 0; i < 16; i++) out[i] = (y[i] + x[i]) | 0;
}

/** hsalsa hashes key and nonce into key' and nonce'. */
// prettier-ignore
export function hsalsa(s: Uint32Array, k: Uint32Array, i: Uint32Array, o32: Uint32Array): void {
  const x = new Uint32Array([
    s[0], k[0], k[1], k[2],
    k[3], s[1], i[0], i[1],
    i[2], i[3], s[2], k[4],
    k[5], k[6], k[7], s[3]
  ]);
  salsaRound(x, 20);
  let oi = 0;
  o32[oi++] = x[0]; o32[oi++] = x[5];
  o32[oi++] = x[10]; o32[oi++] = x[15];
  o32[oi++] = x[6]; o32[oi++] = x[7];
  o32[oi++] = x[8]; o32[oi++] = x[9];
}

function chachaCore(
  s: Uint32Array,
  k: Uint32Array,
  n: Uint32Array,
  out: Uint32Array,
  cnt: number,
  rounds = 20
): void {
  // prettier-ignore
  const y = new Uint32Array([
    s[0], s[1], s[2], s[3], // "expa"   "nd 3"  "2-by"  "te k"
    k[0], k[1], k[2], k[3], // Key      Key     Key     Key
    k[4], k[5], k[6], k[7], // Key      Key     Key     Key
    cnt, n[0], n[1], n[2],  // Counter  Counter Nonce   Nonce
  ]);
  const x = y.slice();
  chachaRound(x, rounds);
  for (let i = 0; i < 16; i++) out[i] = (y[i] + x[i]) | 0;
}

/** hchacha hashes key and nonce into key' and nonce'. */
// prettier-ignore
export function hchacha(s: Uint32Array, k: Uint32Array, i: Uint32Array, o32: Uint32Array): void {
  const x = new Uint32Array([
    s[0], s[1], s[2], s[3],
    k[0], k[1], k[2], k[3],
    k[4], k[5], k[6], k[7],
    i[0], i[1], i[2], i[3],
  ]);
  chachaRound(x, 20);
  let oi = 0;
  o32[oi++] = x[0]; o32[oi++] = x[1];
  o32[oi++] = x[2]; o32[oi++] = x[3];
  o32[oi++] = x[12]; o32[oi++] = x[13];
  o32[oi++] = x[14]; o32[oi++] = x[15];
}

/** salsa20, 12-byte nonce. */
export const salsa20: XorStream = /* @__PURE__ */ createCipher(salsaCore, {
  allowShortKeys: true,
  counterRight: true,
});

/** xsalsa20, 24-byte nonce. */
export const xsalsa20: XorStream = /* @__PURE__ */ createCipher(salsaCore, {
  counterRight: true,
  extendNonceFn: hsalsa,
});

/** chacha20 non-RFC, original version by djb. 8-byte nonce, 8-byte counter. */
export const chacha20orig: XorStream = /* @__PURE__ */ createCipher(chachaCore, {
  allowShortKeys: true,
  counterRight: false,
  counterLength: 8,
});

/** chacha20 RFC 8439 (IETF / TLS). 12-byte nonce, 4-byte counter. */
export const chacha20: XorStream = /* @__PURE__ */ createCipher(chachaCore, {
  counterRight: false,
  counterLength: 4,
});

/** xchacha20 eXtended-nonce. https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha */
export const xchacha20: XorStream = /* @__PURE__ */ createCipher(chachaCore, {
  counterRight: false,
  counterLength: 8,
  extendNonceFn: hchacha,
});

/** 8-round chacha from the original paper. */
export const chacha8: XorStream = /* @__PURE__ */ createCipher(chachaCore, {
  counterRight: false,
  counterLength: 4,
  rounds: 8,
});

/** 12-round chacha from the original paper. */
export const chacha12: XorStream = /* @__PURE__ */ createCipher(chachaCore, {
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
export function poly1305(msg: Uint8Array, key: Uint8Array): Uint8Array {
  abytes(msg);
  abytes(key, 32);
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

function computeTag(
  fn: XorStream,
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  AAD?: Uint8Array
): Uint8Array {
  const res = [];
  if (AAD) {
    res.push(AAD);
    const leftover = AAD.length % 16;
    if (leftover > 0) res.push(new Uint8Array(16 - leftover));
  }
  res.push(ciphertext);
  const leftover = ciphertext.length % 16;
  if (leftover > 0) res.push(new Uint8Array(16 - leftover));
  res.push(u64Lengths(ciphertext.length, AAD ? AAD.length : 0, true));
  const authKey = fn(key, nonce, new Uint8Array(32));
  return poly1305(concatBytes(...res), authKey);
}

/** xsalsa20-poly1305 eXtended-nonce (24 bytes) salsa. */
export const xsalsa20poly1305: ARXCipherN = /* @__PURE__ */ wrapCipher(
  { blockSize: 64, nonceLength: 24, tagLength: 16 },
  function xsalsapoly(key: Uint8Array, nonce: Uint8Array) {
    return {
      encrypt(plaintext: Uint8Array) {
        const m = concatBytes(new Uint8Array(32), plaintext);
        const c = xsalsa20(key, nonce, m);
        const authKey = c.subarray(0, 32);
        const data = c.subarray(32);
        const tag = poly1305(data, authKey);
        return concatBytes(tag, data);
      },
      decrypt(ciphertext: Uint8Array) {
        const c = concatBytes(new Uint8Array(16), ciphertext);
        const passedTag = c.subarray(16, 32);
        const authKey = xsalsa20(key, nonce, new Uint8Array(32));
        const tag = poly1305(c.subarray(32), authKey);
        if (!equalBytes(tag, passedTag)) throw new Error('invalid poly1305 tag');
        return xsalsa20(key, nonce, c).subarray(32);
      },
    };
  }
);

/** Alias to `xsalsa20poly1305`. */
export function secretbox(
  key: Uint8Array,
  nonce: Uint8Array
): {
  seal: (plaintext: Uint8Array) => Uint8Array;
  open: (ciphertext: Uint8Array) => Uint8Array;
} {
  const xs = xsalsa20poly1305(key, nonce);
  return { seal: xs.encrypt, open: xs.decrypt };
}

export const _poly1305_aead =
  (fn: XorStream) =>
  (key: Uint8Array, nonce: Uint8Array, AAD?: Uint8Array): Cipher => {
    const tagLength = 16;
    return {
      encrypt(plaintext: Uint8Array) {
        const data = fn(key, nonce, plaintext, undefined, 1); // stream from i=1
        const tag = computeTag(fn, key, nonce, data, AAD);
        return concatBytes(data, tag);
      },
      decrypt(ciphertext: Uint8Array) {
        const passedTag = ciphertext.subarray(-tagLength);
        const data = ciphertext.subarray(0, -tagLength);
        const tag = computeTag(fn, key, nonce, data, AAD);
        if (!equalBytes(tag, passedTag)) throw new Error('invalid poly1305 tag');
        return fn(key, nonce, data, undefined, 1); // stream from i=1
      },
    };
  };

/** chacha20-poly1305 12-byte-nonce chacha. */
export const chacha20poly1305: ARXCipherN = /* @__PURE__ */ wrapCipher(
  { blockSize: 64, nonceLength: 12, tagLength: 16 },
  _poly1305_aead(chacha20)
);

/**
 * XChaCha20-Poly1305 extended-nonce chacha. Can be safely used with random nonces (CSPRNG).
 */
export const xchacha20poly1305: ARXCipherN = /* @__PURE__ */ wrapCipher(
  { blockSize: 64, nonceLength: 24, tagLength: 16 },
  _poly1305_aead(xchacha20)
);
