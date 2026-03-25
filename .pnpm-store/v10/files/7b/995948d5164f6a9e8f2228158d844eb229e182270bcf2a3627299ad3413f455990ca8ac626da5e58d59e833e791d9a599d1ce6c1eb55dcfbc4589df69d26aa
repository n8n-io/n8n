/**
 * Basic utils for ARX (add-rotate-xor) salsa and chacha ciphers.

RFC8439 requires multi-step cipher stream, where
authKey starts with counter: 0, actual msg with counter: 1.

For this, we need a way to re-use nonce / counter:

    const counter = new Uint8Array(4);
    chacha(..., counter, ...); // counter is now 1
    chacha(..., counter, ...); // counter is now 2

This is complicated:

- 32-bit counters are enough, no need for 64-bit: max ArrayBuffer size in JS is 4GB
- Original papers don't allow mutating counters
- Counter overflow is undefined [^1]
- Idea A: allow providing (nonce | counter) instead of just nonce, re-use it
- Caveat: Cannot be re-used through all cases:
- * chacha has (counter | nonce)
- * xchacha has (nonce16 | counter | nonce16)
- Idea B: separate nonce / counter and provide separate API for counter re-use
- Caveat: there are different counter sizes depending on an algorithm.
- salsa & chacha also differ in structures of key & sigma:
  salsa20:      s[0] | k(4) | s[1] | nonce(2) | ctr(2) | s[2] | k(4) | s[3]
  chacha:       s(4) | k(8) | ctr(1) | nonce(3)
  chacha20orig: s(4) | k(8) | ctr(2) | nonce(2)
- Idea C: helper method such as `setSalsaState(key, nonce, sigma, data)`
- Caveat: we can't re-use counter array

xchacha [^2] uses the subkey and remaining 8 byte nonce with ChaCha20 as normal
(prefixed by 4 NUL bytes, since [RFC8439] specifies a 12-byte nonce).

[^1]: https://mailarchive.ietf.org/arch/msg/cfrg/gsOnTJzcbgG6OqD8Sc0GO5aR_tU/
[^2]: https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha#appendix-A.2

 * @module
 */
// prettier-ignore
import {
  type XorStream, abool, abytes, anumber, checkOpts, clean, copyBytes, u32
} from './utils.ts';

// We can't make top-level var depend on utils.utf8ToBytes
// because it's not present in all envs. Creating a similar fn here
const _utf8ToBytes = (str: string) => Uint8Array.from(str.split('').map((c) => c.charCodeAt(0)));
const sigma16 = _utf8ToBytes('expand 16-byte k');
const sigma32 = _utf8ToBytes('expand 32-byte k');
const sigma16_32 = u32(sigma16);
const sigma32_32 = u32(sigma32);

export function rotl(a: number, b: number): number {
  return (a << b) | (a >>> (32 - b));
}

/** Ciphers must use u32 for efficiency. */
export type CipherCoreFn = (
  sigma: Uint32Array,
  key: Uint32Array,
  nonce: Uint32Array,
  output: Uint32Array,
  counter: number,
  rounds?: number
) => void;

/** Method which extends key + short nonce into larger nonce / diff key. */
export type ExtendNonceFn = (
  sigma: Uint32Array,
  key: Uint32Array,
  input: Uint32Array,
  output: Uint32Array
) => void;

/** ARX cipher options.
 * * `allowShortKeys` for 16-byte keys
 * * `counterLength` in bytes
 * * `counterRight`: right: `nonce|counter`; left: `counter|nonce`
 * */
export type CipherOpts = {
  allowShortKeys?: boolean; // Original salsa / chacha allow 16-byte keys
  extendNonceFn?: ExtendNonceFn;
  counterLength?: number;
  counterRight?: boolean;
  rounds?: number;
};

// Is byte array aligned to 4 byte offset (u32)?
function isAligned32(b: Uint8Array) {
  return b.byteOffset % 4 === 0;
}

// Salsa and Chacha block length is always 512-bit
const BLOCK_LEN = 64;
const BLOCK_LEN32 = 16;

// new Uint32Array([2**32])   // => Uint32Array(1) [ 0 ]
// new Uint32Array([2**32-1]) // => Uint32Array(1) [ 4294967295 ]
const MAX_COUNTER = 2 ** 32 - 1;

const U32_EMPTY = new Uint32Array();
function runCipher(
  core: CipherCoreFn,
  sigma: Uint32Array,
  key: Uint32Array,
  nonce: Uint32Array,
  data: Uint8Array,
  output: Uint8Array,
  counter: number,
  rounds: number
): void {
  const len = data.length;
  const block = new Uint8Array(BLOCK_LEN);
  const b32 = u32(block);
  // Make sure that buffers aligned to 4 bytes
  const isAligned = isAligned32(data) && isAligned32(output);
  const d32 = isAligned ? u32(data) : U32_EMPTY;
  const o32 = isAligned ? u32(output) : U32_EMPTY;
  for (let pos = 0; pos < len; counter++) {
    core(sigma, key, nonce, b32, counter, rounds);
    if (counter >= MAX_COUNTER) throw new Error('arx: counter overflow');
    const take = Math.min(BLOCK_LEN, len - pos);
    // aligned to 4 bytes
    if (isAligned && take === BLOCK_LEN) {
      const pos32 = pos / 4;
      if (pos % 4 !== 0) throw new Error('arx: invalid block position');
      for (let j = 0, posj: number; j < BLOCK_LEN32; j++) {
        posj = pos32 + j;
        o32[posj] = d32[posj] ^ b32[j];
      }
      pos += BLOCK_LEN;
      continue;
    }
    for (let j = 0, posj; j < take; j++) {
      posj = pos + j;
      output[posj] = data[posj] ^ block[j];
    }
    pos += take;
  }
}

/** Creates ARX-like (ChaCha, Salsa) cipher stream from core function. */
export function createCipher(core: CipherCoreFn, opts: CipherOpts): XorStream {
  const { allowShortKeys, extendNonceFn, counterLength, counterRight, rounds } = checkOpts(
    { allowShortKeys: false, counterLength: 8, counterRight: false, rounds: 20 },
    opts
  );
  if (typeof core !== 'function') throw new Error('core must be a function');
  anumber(counterLength);
  anumber(rounds);
  abool(counterRight);
  abool(allowShortKeys);
  return (
    key: Uint8Array,
    nonce: Uint8Array,
    data: Uint8Array,
    output?: Uint8Array,
    counter = 0
  ): Uint8Array => {
    abytes(key);
    abytes(nonce);
    abytes(data);
    const len = data.length;
    if (output === undefined) output = new Uint8Array(len);
    abytes(output);
    anumber(counter);
    if (counter < 0 || counter >= MAX_COUNTER) throw new Error('arx: counter overflow');
    if (output.length < len)
      throw new Error(`arx: output (${output.length}) is shorter than data (${len})`);
    const toClean = [];

    // Key & sigma
    // key=16 -> sigma16, k=key|key
    // key=32 -> sigma32, k=key
    let l = key.length;
    let k: Uint8Array;
    let sigma: Uint32Array;
    if (l === 32) {
      toClean.push((k = copyBytes(key)));
      sigma = sigma32_32;
    } else if (l === 16 && allowShortKeys) {
      k = new Uint8Array(32);
      k.set(key);
      k.set(key, 16);
      sigma = sigma16_32;
      toClean.push(k);
    } else {
      throw new Error(`arx: invalid 32-byte key, got length=${l}`);
    }

    // Nonce
    // salsa20:      8   (8-byte counter)
    // chacha20orig: 8   (8-byte counter)
    // chacha20:     12  (4-byte counter)
    // xsalsa20:     24  (16 -> hsalsa,  8 -> old nonce)
    // xchacha20:    24  (16 -> hchacha, 8 -> old nonce)
    // Align nonce to 4 bytes
    if (!isAligned32(nonce)) toClean.push((nonce = copyBytes(nonce)));

    const k32 = u32(k);
    // hsalsa & hchacha: handle extended nonce
    if (extendNonceFn) {
      if (nonce.length !== 24) throw new Error(`arx: extended nonce must be 24 bytes`);
      extendNonceFn(sigma, k32, u32(nonce.subarray(0, 16)), k32);
      nonce = nonce.subarray(16);
    }

    // Handle nonce counter
    const nonceNcLen = 16 - counterLength;
    if (nonceNcLen !== nonce.length)
      throw new Error(`arx: nonce must be ${nonceNcLen} or 16 bytes`);

    // Pad counter when nonce is 64 bit
    if (nonceNcLen !== 12) {
      const nc = new Uint8Array(12);
      nc.set(nonce, counterRight ? 0 : 12 - nonce.length);
      nonce = nc;
      toClean.push(nonce);
    }
    const n32 = u32(nonce);
    runCipher(core, sigma, k32, n32, data, output, counter, rounds);
    clean(...toClean);
    return output;
  };
}
