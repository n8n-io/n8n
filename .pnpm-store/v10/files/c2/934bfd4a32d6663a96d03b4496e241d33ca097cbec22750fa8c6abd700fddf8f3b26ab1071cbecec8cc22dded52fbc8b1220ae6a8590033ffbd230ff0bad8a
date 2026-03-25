/**
 * Utility functions to work with buffers (Uint8Array).
 *
 * @module buffer
 */

import * as string from './string.js'
import * as env from './environment.js'
import * as array from './array.js'
import * as math from './math.js'
import * as encoding from './encoding.js'
import * as decoding from './decoding.js'

/**
 * @param {number} len
 */
export const createUint8ArrayFromLen = len => new Uint8Array(len)

/**
 * Create Uint8Array with initial content from buffer
 *
 * @param {ArrayBuffer} buffer
 * @param {number} byteOffset
 * @param {number} length
 */
export const createUint8ArrayViewFromArrayBuffer = (buffer, byteOffset, length) => new Uint8Array(buffer, byteOffset, length)

/**
 * Create Uint8Array with initial content from buffer
 *
 * @param {ArrayBuffer} buffer
 */
export const createUint8ArrayFromArrayBuffer = buffer => new Uint8Array(buffer)

/* c8 ignore start */
/**
 * @param {Uint8Array} bytes
 * @return {string}
 */
const toBase64Browser = bytes => {
  let s = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    s += string.fromCharCode(bytes[i])
  }
  // eslint-disable-next-line no-undef
  return btoa(s)
}
/* c8 ignore stop */

/**
 * @param {Uint8Array} bytes
 * @return {string}
 */
const toBase64Node = bytes => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64')

/* c8 ignore start */
/**
 * @param {string} s
 * @return {Uint8Array<ArrayBuffer>}
 */
const fromBase64Browser = s => {
  // eslint-disable-next-line no-undef
  const a = atob(s)
  const bytes = createUint8ArrayFromLen(a.length)
  for (let i = 0; i < a.length; i++) {
    bytes[i] = a.charCodeAt(i)
  }
  return bytes
}
/* c8 ignore stop */

/**
 * @param {string} s
 */
const fromBase64Node = s => {
  const buf = Buffer.from(s, 'base64')
  return createUint8ArrayViewFromArrayBuffer(buf.buffer, buf.byteOffset, buf.byteLength)
}

/* c8 ignore next */
export const toBase64 = env.isBrowser ? toBase64Browser : toBase64Node

/* c8 ignore next */
export const fromBase64 = env.isBrowser ? fromBase64Browser : fromBase64Node

/**
 * Implements base64url - see https://datatracker.ietf.org/doc/html/rfc4648#section-5
 * @param {Uint8Array} buf
 */
export const toBase64UrlEncoded = buf => toBase64(buf).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')

/**
 * @param {string} base64
 */
export const fromBase64UrlEncoded = base64 => fromBase64(base64.replaceAll('-', '+').replaceAll('_', '/'))

/**
 * Base64 is always a more efficient choice. This exists for utility purposes only.
 *
 * @param {Uint8Array} buf
 */
export const toHexString = buf => array.map(buf, b => b.toString(16).padStart(2, '0')).join('')

/**
 * Note: This function expects that the hex doesn't start with 0x..
 *
 * @param {string} hex
 */
export const fromHexString = hex => {
  const hlen = hex.length
  const buf = new Uint8Array(math.ceil(hlen / 2))
  for (let i = 0; i < hlen; i += 2) {
    buf[buf.length - i / 2 - 1] = Number.parseInt(hex.slice(hlen - i - 2, hlen - i), 16)
  }
  return buf
}

/**
 * Copy the content of an Uint8Array view to a new ArrayBuffer.
 *
 * @param {Uint8Array} uint8Array
 * @return {Uint8Array}
 */
export const copyUint8Array = uint8Array => {
  const newBuf = createUint8ArrayFromLen(uint8Array.byteLength)
  newBuf.set(uint8Array)
  return newBuf
}

/**
 * Encode anything as a UInt8Array. It's a pun on typescripts's `any` type.
 * See encoding.writeAny for more information.
 *
 * @param {any} data
 * @return {Uint8Array}
 */
export const encodeAny = data =>
  encoding.encode(encoder => encoding.writeAny(encoder, data))

/**
 * Decode an any-encoded value.
 *
 * @param {Uint8Array} buf
 * @return {any}
 */
export const decodeAny = buf => decoding.readAny(decoding.createDecoder(buf))

/**
 * Shift Byte Array {N} bits to the left. Does not expand byte array.
 *
 * @param {Uint8Array} bs
 * @param {number} N should be in the range of [0-7]
 */
export const shiftNBitsLeft = (bs, N) => {
  if (N === 0) return bs
  bs = new Uint8Array(bs)
  bs[0] <<= N
  for (let i = 1; i < bs.length; i++) {
    bs[i - 1] |= bs[i] >>> (8 - N)
    bs[i] <<= N
  }
  return bs
}
