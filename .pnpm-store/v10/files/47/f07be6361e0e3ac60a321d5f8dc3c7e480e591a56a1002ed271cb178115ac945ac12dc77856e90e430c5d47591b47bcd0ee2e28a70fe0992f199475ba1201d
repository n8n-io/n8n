'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var binary = require('./binary-ac8e39e2.cjs');

/**
 * @module sha256
 * Spec: https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf
 * Resources:
 * - https://web.archive.org/web/20150315061807/http://csrc.nist.gov/groups/STM/cavp/documents/shs/sha256-384-512.pdf
 */

/**
 * @param {number} w - a 32bit uint
 * @param {number} shift
 */
const rotr = (w, shift) => (w >>> shift) | (w << (32 - shift));

/**
 * Helper for SHA-224 & SHA-256. See 4.1.2.
 * @param {number} x
 */
const sum0to256 = x => rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);

/**
 * Helper for SHA-224 & SHA-256. See 4.1.2.
 * @param {number} x
 */
const sum1to256 = x => rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);

/**
 * Helper for SHA-224 & SHA-256. See 4.1.2.
 * @param {number} x
 */
const sigma0to256 = x => rotr(x, 7) ^ rotr(x, 18) ^ x >>> 3;

/**
 * Helper for SHA-224 & SHA-256. See 4.1.2.
 * @param {number} x
 */
const sigma1to256 = x => rotr(x, 17) ^ rotr(x, 19) ^ x >>> 10;

// @todo don't init these variables globally

/**
 * See 4.2.2: Constant for sha256 & sha224
 * These words represent the first thirty-two bits of the fractional parts of
 * the cube roots of the first sixty-four prime numbers. In hex, these constant words are (from left to
 * right)
 */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

/**
 * See 5.3.3. Initial hash value.
 *
 * These words were obtained by taking the first thirty-two bits of the fractional parts of the
 * square roots of the first eight prime numbers.
 *
 * @todo shouldn't be a global variable
 */
const HINIT = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);

// time to beat: (large value < 4.35s)

class Hasher {
  constructor () {
    const buf = new ArrayBuffer(64 + 64 * 4);
    // Init working variables using a single arraybuffer
    this._H = new Uint32Array(buf, 0, 8);
    this._H.set(HINIT);
    // "Message schedule" - a working variable
    this._W = new Uint32Array(buf, 64, 64);
  }

  _updateHash () {
    const H = this._H;
    const W = this._W;
    for (let t = 16; t < 64; t++) {
      W[t] = sigma1to256(W[t - 2]) + W[t - 7] + sigma0to256(W[t - 15]) + W[t - 16];
    }
    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];
    let f = H[5];
    let g = H[6];
    let h = H[7];
    for (let tt = 0, T1, T2; tt < 64; tt++) {
      T1 = (h + sum1to256(e) + ((e & f) ^ (~e & g)) + K[tt] + W[tt]) >>> 0;
      T2 = (sum0to256(a) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + T1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (T1 + T2) >>> 0;
    }
    H[0] += a;
    H[1] += b;
    H[2] += c;
    H[3] += d;
    H[4] += e;
    H[5] += f;
    H[6] += g;
    H[7] += h;
  }

  /**
   * Returns a 32-byte hash.
   *
   * @param {Uint8Array} data
   */
  digest (data) {
    let i = 0;
    for (; i + 56 <= data.length;) {
      // write data in big endianess
      let j = 0;
      for (; j < 16 && i + 3 < data.length; j++) {
        this._W[j] = data[i++] << 24 | data[i++] << 16 | data[i++] << 8 | data[i++];
      }
      if (i % 64 !== 0) { // there is still room to write partial content and the ending bit.
        this._W.fill(0, j, 16);
        while (i < data.length) {
          this._W[j] |= data[i] << ((3 - (i % 4)) * 8);
          i++;
        }
        this._W[j] |= binary.BIT8 << ((3 - (i % 4)) * 8);
      }
      this._updateHash();
    }
    // same check as earlier - the ending bit has been written
    const isPaddedWith1 = i % 64 !== 0;
    this._W.fill(0, 0, 16);
    let j = 0;
    for (; i < data.length; j++) {
      for (let ci = 3; ci >= 0 && i < data.length; ci--) {
        this._W[j] |= data[i++] << (ci * 8);
      }
    }
    // Write padding of the message. See 5.1.2.
    if (!isPaddedWith1) {
      this._W[j - (i % 4 === 0 ? 0 : 1)] |= binary.BIT8 << ((3 - (i % 4)) * 8);
    }
    // write length of message (size in bits) as 64 bit uint
    // @todo test that this works correctly
    this._W[14] = data.byteLength / binary.BIT30; // same as data.byteLength >>> 30 - but works on floats
    this._W[15] = data.byteLength * 8;
    this._updateHash();
    // correct H endianness to use big endiannes and return a Uint8Array
    const dv = new Uint8Array(32);
    for (let i = 0; i < this._H.length; i++) {
      for (let ci = 0; ci < 4; ci++) {
        dv[i * 4 + ci] = this._H[i] >>> (3 - ci) * 8;
      }
    }
    return dv
  }
}

/**
 * Returns a 32-byte hash.
 *
 * @param {Uint8Array} data
 */
const digest = data => new Hasher().digest(data);

exports.digest = digest;
//# sourceMappingURL=sha256.cjs.map
