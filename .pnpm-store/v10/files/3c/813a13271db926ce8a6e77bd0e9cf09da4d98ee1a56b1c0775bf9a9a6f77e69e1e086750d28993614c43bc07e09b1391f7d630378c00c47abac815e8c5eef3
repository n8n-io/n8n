'use strict';

var string = require('./string-fddc5f8b.cjs');
var environment = require('./environment-1c97264d.cjs');
var array = require('./array-78849c95.cjs');
var math = require('./math-96d5e8c4.cjs');
var encoding = require('./encoding-1a745c43.cjs');
var decoding = require('./decoding-76e75827.cjs');

/**
 * Utility functions to work with buffers (Uint8Array).
 *
 * @module buffer
 */

/**
 * @param {number} len
 */
const createUint8ArrayFromLen = len => new Uint8Array(len);

/**
 * Create Uint8Array with initial content from buffer
 *
 * @param {ArrayBuffer} buffer
 * @param {number} byteOffset
 * @param {number} length
 */
const createUint8ArrayViewFromArrayBuffer = (buffer, byteOffset, length) => new Uint8Array(buffer, byteOffset, length);

/**
 * Create Uint8Array with initial content from buffer
 *
 * @param {ArrayBuffer} buffer
 */
const createUint8ArrayFromArrayBuffer = buffer => new Uint8Array(buffer);

/* c8 ignore start */
/**
 * @param {Uint8Array} bytes
 * @return {string}
 */
const toBase64Browser = bytes => {
  let s = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    s += string.fromCharCode(bytes[i]);
  }
  // eslint-disable-next-line no-undef
  return btoa(s)
};
/* c8 ignore stop */

/**
 * @param {Uint8Array} bytes
 * @return {string}
 */
const toBase64Node = bytes => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');

/* c8 ignore start */
/**
 * @param {string} s
 * @return {Uint8Array<ArrayBuffer>}
 */
const fromBase64Browser = s => {
  // eslint-disable-next-line no-undef
  const a = atob(s);
  const bytes = createUint8ArrayFromLen(a.length);
  for (let i = 0; i < a.length; i++) {
    bytes[i] = a.charCodeAt(i);
  }
  return bytes
};
/* c8 ignore stop */

/**
 * @param {string} s
 */
const fromBase64Node = s => {
  const buf = Buffer.from(s, 'base64');
  return createUint8ArrayViewFromArrayBuffer(buf.buffer, buf.byteOffset, buf.byteLength)
};

/* c8 ignore next */
const toBase64 = environment.isBrowser ? toBase64Browser : toBase64Node;

/* c8 ignore next */
const fromBase64 = environment.isBrowser ? fromBase64Browser : fromBase64Node;

/**
 * Implements base64url - see https://datatracker.ietf.org/doc/html/rfc4648#section-5
 * @param {Uint8Array} buf
 */
const toBase64UrlEncoded = buf => toBase64(buf).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

/**
 * @param {string} base64
 */
const fromBase64UrlEncoded = base64 => fromBase64(base64.replaceAll('-', '+').replaceAll('_', '/'));

/**
 * Base64 is always a more efficient choice. This exists for utility purposes only.
 *
 * @param {Uint8Array} buf
 */
const toHexString = buf => array.map(buf, b => b.toString(16).padStart(2, '0')).join('');

/**
 * Note: This function expects that the hex doesn't start with 0x..
 *
 * @param {string} hex
 */
const fromHexString = hex => {
  const hlen = hex.length;
  const buf = new Uint8Array(math.ceil(hlen / 2));
  for (let i = 0; i < hlen; i += 2) {
    buf[buf.length - i / 2 - 1] = Number.parseInt(hex.slice(hlen - i - 2, hlen - i), 16);
  }
  return buf
};

/**
 * Copy the content of an Uint8Array view to a new ArrayBuffer.
 *
 * @param {Uint8Array} uint8Array
 * @return {Uint8Array}
 */
const copyUint8Array = uint8Array => {
  const newBuf = createUint8ArrayFromLen(uint8Array.byteLength);
  newBuf.set(uint8Array);
  return newBuf
};

/**
 * Encode anything as a UInt8Array. It's a pun on typescripts's `any` type.
 * See encoding.writeAny for more information.
 *
 * @param {any} data
 * @return {Uint8Array}
 */
const encodeAny = data =>
  encoding.encode(encoder => encoding.writeAny(encoder, data));

/**
 * Decode an any-encoded value.
 *
 * @param {Uint8Array} buf
 * @return {any}
 */
const decodeAny = buf => decoding.readAny(decoding.createDecoder(buf));

/**
 * Shift Byte Array {N} bits to the left. Does not expand byte array.
 *
 * @param {Uint8Array} bs
 * @param {number} N should be in the range of [0-7]
 */
const shiftNBitsLeft = (bs, N) => {
  if (N === 0) return bs
  bs = new Uint8Array(bs);
  bs[0] <<= N;
  for (let i = 1; i < bs.length; i++) {
    bs[i - 1] |= bs[i] >>> (8 - N);
    bs[i] <<= N;
  }
  return bs
};

var buffer = /*#__PURE__*/Object.freeze({
  __proto__: null,
  createUint8ArrayFromLen: createUint8ArrayFromLen,
  createUint8ArrayViewFromArrayBuffer: createUint8ArrayViewFromArrayBuffer,
  createUint8ArrayFromArrayBuffer: createUint8ArrayFromArrayBuffer,
  toBase64: toBase64,
  fromBase64: fromBase64,
  toBase64UrlEncoded: toBase64UrlEncoded,
  fromBase64UrlEncoded: fromBase64UrlEncoded,
  toHexString: toHexString,
  fromHexString: fromHexString,
  copyUint8Array: copyUint8Array,
  encodeAny: encodeAny,
  decodeAny: decodeAny,
  shiftNBitsLeft: shiftNBitsLeft
});

exports.buffer = buffer;
exports.copyUint8Array = copyUint8Array;
exports.createUint8ArrayFromArrayBuffer = createUint8ArrayFromArrayBuffer;
exports.createUint8ArrayFromLen = createUint8ArrayFromLen;
exports.createUint8ArrayViewFromArrayBuffer = createUint8ArrayViewFromArrayBuffer;
exports.decodeAny = decodeAny;
exports.encodeAny = encodeAny;
exports.fromBase64 = fromBase64;
exports.fromBase64UrlEncoded = fromBase64UrlEncoded;
exports.fromHexString = fromHexString;
exports.shiftNBitsLeft = shiftNBitsLeft;
exports.toBase64 = toBase64;
exports.toBase64UrlEncoded = toBase64UrlEncoded;
exports.toHexString = toHexString;
//# sourceMappingURL=buffer-3e750729.cjs.map
