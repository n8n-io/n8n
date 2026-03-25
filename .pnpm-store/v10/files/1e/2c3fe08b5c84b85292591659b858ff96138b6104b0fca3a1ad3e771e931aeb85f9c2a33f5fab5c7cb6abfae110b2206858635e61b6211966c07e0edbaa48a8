/**
 * [Salsa20](https://cr.yp.to/snuffle.html) stream cipher, released in 2005.
 *
 * Salsa's goal was to implement AES replacement that does not rely on S-Boxes,
 * which are hard to implement in a constant-time manner.
 * Salsa20 is usually faster than AES, a big deal on slow, budget mobile phones.
 *
 * [XSalsa20](https://cr.yp.to/snuffle/xsalsa-20110204.pdf), extended-nonce
 * variant was released in 2008. It switched nonces from 96-bit to 192-bit,
 * and became safe to be picked at random.
 *
 * Check out [PDF](https://cr.yp.to/snuffle/salsafamily-20071225.pdf) and
 * [wiki](https://en.wikipedia.org/wiki/Salsa20).
 * @module
 */
import { createCipher, rotl } from './_arx.ts';
import { poly1305 } from './_poly1305.ts';
import {
  abytes,
  type ARXCipher,
  type CipherWithOutput,
  clean,
  equalBytes,
  getOutput,
  wrapCipher,
  type XorStream,
} from './utils.ts';

/** Salsa20 core function. */
// prettier-ignore
function salsaCore(
  s: Uint32Array, k: Uint32Array, n: Uint32Array, out: Uint32Array, cnt: number, rounds = 20
): void {
  // Based on https://cr.yp.to/salsa20.html
  let y00 = s[0], y01 = k[0], y02 = k[1], y03 = k[2], // "expa" Key     Key     Key
      y04 = k[3], y05 = s[1], y06 = n[0], y07 = n[1], // Key    "nd 3"  Nonce   Nonce
      y08 = cnt,  y09 = 0,    y10 = s[2], y11 = k[4], // Pos.   Pos.    "2-by"	Key
      y12 = k[5], y13 = k[6], y14 = k[7], y15 = s[3]; // Key    Key     Key     "te k"
  // Save state to temporary variables
  let x00 = y00, x01 = y01, x02 = y02, x03 = y03,
      x04 = y04, x05 = y05, x06 = y06, x07 = y07,
      x08 = y08, x09 = y09, x10 = y10, x11 = y11,
      x12 = y12, x13 = y13, x14 = y14, x15 = y15;
  for (let r = 0; r < rounds; r += 2) {
    x04 ^= rotl(x00 + x12 | 0,  7); x08 ^= rotl(x04 + x00 | 0, 9);
    x12 ^= rotl(x08 + x04 | 0, 13); x00 ^= rotl(x12 + x08 | 0, 18);
    x09 ^= rotl(x05 + x01 | 0,  7); x13 ^= rotl(x09 + x05 | 0, 9);
    x01 ^= rotl(x13 + x09 | 0, 13); x05 ^= rotl(x01 + x13 | 0, 18);
    x14 ^= rotl(x10 + x06 | 0,  7); x02 ^= rotl(x14 + x10 | 0, 9);
    x06 ^= rotl(x02 + x14 | 0, 13); x10 ^= rotl(x06 + x02 | 0, 18);
    x03 ^= rotl(x15 + x11 | 0,  7); x07 ^= rotl(x03 + x15 | 0, 9);
    x11 ^= rotl(x07 + x03 | 0, 13); x15 ^= rotl(x11 + x07 | 0, 18);
    x01 ^= rotl(x00 + x03 | 0,  7); x02 ^= rotl(x01 + x00 | 0, 9);
    x03 ^= rotl(x02 + x01 | 0, 13); x00 ^= rotl(x03 + x02 | 0, 18);
    x06 ^= rotl(x05 + x04 | 0,  7); x07 ^= rotl(x06 + x05 | 0, 9);
    x04 ^= rotl(x07 + x06 | 0, 13); x05 ^= rotl(x04 + x07 | 0, 18);
    x11 ^= rotl(x10 + x09 | 0,  7); x08 ^= rotl(x11 + x10 | 0, 9);
    x09 ^= rotl(x08 + x11 | 0, 13); x10 ^= rotl(x09 + x08 | 0, 18);
    x12 ^= rotl(x15 + x14 | 0,  7); x13 ^= rotl(x12 + x15 | 0, 9);
    x14 ^= rotl(x13 + x12 | 0, 13); x15 ^= rotl(x14 + x13 | 0, 18);
  }
  // Write output
  let oi = 0;
  out[oi++] = (y00 + x00) | 0; out[oi++] = (y01 + x01) | 0;
  out[oi++] = (y02 + x02) | 0; out[oi++] = (y03 + x03) | 0;
  out[oi++] = (y04 + x04) | 0; out[oi++] = (y05 + x05) | 0;
  out[oi++] = (y06 + x06) | 0; out[oi++] = (y07 + x07) | 0;
  out[oi++] = (y08 + x08) | 0; out[oi++] = (y09 + x09) | 0;
  out[oi++] = (y10 + x10) | 0; out[oi++] = (y11 + x11) | 0;
  out[oi++] = (y12 + x12) | 0; out[oi++] = (y13 + x13) | 0;
  out[oi++] = (y14 + x14) | 0; out[oi++] = (y15 + x15) | 0;
}

/**
 * hsalsa hashing function, used primarily in xsalsa, to hash
 * key and nonce into key' and nonce'.
 * Same as salsaCore, but there doesn't seem to be a way to move the block
 * out without 25% performance hit.
 */
// prettier-ignore
export function hsalsa(
  s: Uint32Array, k: Uint32Array, i: Uint32Array, o32: Uint32Array
): void {
  let x00 = s[0], x01 = k[0], x02 = k[1], x03 = k[2],
      x04 = k[3], x05 = s[1], x06 = i[0], x07 = i[1],
      x08 = i[2], x09 = i[3], x10 = s[2], x11 = k[4],
      x12 = k[5], x13 = k[6], x14 = k[7], x15 = s[3];
  for (let r = 0; r < 20; r += 2) {
    x04 ^= rotl(x00 + x12 | 0, 7); x08 ^= rotl(x04 + x00 | 0, 9);
    x12 ^= rotl(x08 + x04 | 0, 13); x00 ^= rotl(x12 + x08 | 0, 18);
    x09 ^= rotl(x05 + x01 | 0, 7); x13 ^= rotl(x09 + x05 | 0, 9);
    x01 ^= rotl(x13 + x09 | 0, 13); x05 ^= rotl(x01 + x13 | 0, 18);
    x14 ^= rotl(x10 + x06 | 0, 7); x02 ^= rotl(x14 + x10 | 0, 9);
    x06 ^= rotl(x02 + x14 | 0, 13); x10 ^= rotl(x06 + x02 | 0, 18);
    x03 ^= rotl(x15 + x11 | 0, 7); x07 ^= rotl(x03 + x15 | 0, 9);
    x11 ^= rotl(x07 + x03 | 0, 13); x15 ^= rotl(x11 + x07 | 0, 18);
    x01 ^= rotl(x00 + x03 | 0, 7); x02 ^= rotl(x01 + x00 | 0, 9);
    x03 ^= rotl(x02 + x01 | 0, 13); x00 ^= rotl(x03 + x02 | 0, 18);
    x06 ^= rotl(x05 + x04 | 0, 7); x07 ^= rotl(x06 + x05 | 0, 9);
    x04 ^= rotl(x07 + x06 | 0, 13); x05 ^= rotl(x04 + x07 | 0, 18);
    x11 ^= rotl(x10 + x09 | 0, 7); x08 ^= rotl(x11 + x10 | 0, 9);
    x09 ^= rotl(x08 + x11 | 0, 13); x10 ^= rotl(x09 + x08 | 0, 18);
    x12 ^= rotl(x15 + x14 | 0, 7); x13 ^= rotl(x12 + x15 | 0, 9);
    x14 ^= rotl(x13 + x12 | 0, 13); x15 ^= rotl(x14 + x13 | 0, 18);
  }
  let oi = 0;
  o32[oi++] = x00; o32[oi++] = x05;
  o32[oi++] = x10; o32[oi++] = x15;
  o32[oi++] = x06; o32[oi++] = x07;
  o32[oi++] = x08; o32[oi++] = x09;
}

/**
 * Salsa20 from original paper.
 * Unsafe to use random nonces under the same key, due to collision chance.
 * Prefer XSalsa instead.
 */
export const salsa20: XorStream = /* @__PURE__ */ createCipher(salsaCore, {
  allowShortKeys: true,
  counterRight: true,
});

/**
 * xsalsa20 eXtended-nonce salsa.
 * Can be safely used with random 24-byte nonces (CSPRNG).
 */
export const xsalsa20: XorStream = /* @__PURE__ */ createCipher(salsaCore, {
  counterRight: true,
  extendNonceFn: hsalsa,
});

/**
 * xsalsa20-poly1305 eXtended-nonce salsa.
 * Can be safely used with random 24-byte nonces (CSPRNG).
 * Also known as secretbox from libsodium / nacl.
 */
export const xsalsa20poly1305: ARXCipher = /* @__PURE__ */ wrapCipher(
  { blockSize: 64, nonceLength: 24, tagLength: 16 },
  (key: Uint8Array, nonce: Uint8Array): CipherWithOutput => {
    return {
      encrypt(plaintext: Uint8Array, output?: Uint8Array) {
        // xsalsa20poly1305 optimizes by calculating auth key during the same call as encryption.
        // Unfortunately, makes it hard to separate tag calculation & encryption itself,
        // because 32 bytes is half-block of 64-byte salsa.
        output = getOutput(plaintext.length + 32, output, false); // need 32 additional bytes, see above
        const authKey = output.subarray(0, 32); // output[0..32] = poly1305 auth key
        const ciphPlaintext = output.subarray(32); // output[32..] = plaintext, then ciphertext
        output.set(plaintext, 32);
        clean(authKey); // authKey is produced by xoring with zeros
        xsalsa20(key, nonce, output, output); // output = stream ^ output; authKey = stream ^ zeros(32)
        const tag = poly1305(ciphPlaintext, authKey); // calculate tag over ciphertext
        output.set(tag, 16); // output[16..32] = tag
        clean(output.subarray(0, 16), tag); // clean-up authKey remnants & copy of tag
        return output.subarray(16); // return output[16..]
      },
      decrypt(ciphertext: Uint8Array, output?: Uint8Array) {
        // tmp part     passed tag    ciphertext
        // [0..32]      [32..48]      [48..]
        abytes(ciphertext);
        output = getOutput(ciphertext.length + 32, output, false);
        const tmp = output.subarray(0, 32); // output[0..32] is used to calc authKey
        const passedTag = output.subarray(32, 48); // output[32..48] = passed tag
        const ciphPlaintext = output.subarray(48); // output[48..] = ciphertext, then plaintext
        output.set(ciphertext, 32); // copy ciphertext into output
        clean(tmp); // authKey is produced by xoring with zeros
        const authKey = xsalsa20(key, nonce, tmp, tmp); // authKey = stream ^ zeros(32)
        const tag = poly1305(ciphPlaintext, authKey); // calculate tag over ciphertext
        if (!equalBytes(passedTag, tag)) throw new Error('invalid tag');
        xsalsa20(key, nonce, output.subarray(16), output.subarray(16)); // output = stream ^ output[16..]
        clean(tmp, passedTag, tag);
        return ciphPlaintext; // return output[48..], skipping zeroized output[0..48]
      },
    };
  }
);

/**
 * Alias to `xsalsa20poly1305`, for compatibility with libsodium / nacl
 */
export function secretbox(
  key: Uint8Array,
  nonce: Uint8Array
): {
  seal: (plaintext: Uint8Array, output?: Uint8Array) => Uint8Array;
  open: (ciphertext: Uint8Array, output?: Uint8Array) => Uint8Array;
} {
  const xs = xsalsa20poly1305(key, nonce);
  return { seal: xs.encrypt, open: xs.decrypt };
}
