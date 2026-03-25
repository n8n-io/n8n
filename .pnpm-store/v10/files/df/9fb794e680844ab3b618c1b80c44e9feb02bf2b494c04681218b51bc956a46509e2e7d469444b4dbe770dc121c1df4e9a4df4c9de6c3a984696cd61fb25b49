import * as array from './array.js'

/**
 * Utility module to work with strings.
 *
 * @module string
 */

export const fromCharCode = String.fromCharCode
export const fromCodePoint = String.fromCodePoint

/**
 * The largest utf16 character.
 * Corresponds to Uint8Array([255, 255]) or charcodeof(2x2^8)
 */
export const MAX_UTF16_CHARACTER = fromCharCode(65535)

/**
 * @param {string} s
 * @return {string}
 */
const toLowerCase = s => s.toLowerCase()

const trimLeftRegex = /^\s*/g

/**
 * @param {string} s
 * @return {string}
 */
export const trimLeft = s => s.replace(trimLeftRegex, '')

const fromCamelCaseRegex = /([A-Z])/g

/**
 * @param {string} s
 * @param {string} separator
 * @return {string}
 */
export const fromCamelCase = (s, separator) => trimLeft(s.replace(fromCamelCaseRegex, match => `${separator}${toLowerCase(match)}`))

/**
 * Compute the utf8ByteLength
 * @param {string} str
 * @return {number}
 */
export const utf8ByteLength = str => unescape(encodeURIComponent(str)).length

/**
 * @param {string} str
 * @return {Uint8Array<ArrayBuffer>}
 */
export const _encodeUtf8Polyfill = str => {
  const encodedString = unescape(encodeURIComponent(str))
  const len = encodedString.length
  const buf = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    buf[i] = /** @type {number} */ (encodedString.codePointAt(i))
  }
  return buf
}

/* c8 ignore next */
export const utf8TextEncoder = /** @type {TextEncoder} */ (typeof TextEncoder !== 'undefined' ? new TextEncoder() : null)

/**
 * @param {string} str
 * @return {Uint8Array<ArrayBuffer>}
 */
export const _encodeUtf8Native = str => utf8TextEncoder.encode(str)

/**
 * @param {string} str
 * @return {Uint8Array}
 */
/* c8 ignore next */
export const encodeUtf8 = utf8TextEncoder ? _encodeUtf8Native : _encodeUtf8Polyfill

/**
 * @param {Uint8Array} buf
 * @return {string}
 */
export const _decodeUtf8Polyfill = buf => {
  let remainingLen = buf.length
  let encodedString = ''
  let bufPos = 0
  while (remainingLen > 0) {
    const nextLen = remainingLen < 10000 ? remainingLen : 10000
    const bytes = buf.subarray(bufPos, bufPos + nextLen)
    bufPos += nextLen
    // Starting with ES5.1 we can supply a generic array-like object as arguments
    encodedString += String.fromCodePoint.apply(null, /** @type {any} */ (bytes))
    remainingLen -= nextLen
  }
  return decodeURIComponent(escape(encodedString))
}

/* c8 ignore next */
export let utf8TextDecoder = typeof TextDecoder === 'undefined' ? null : new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

/* c8 ignore start */
if (utf8TextDecoder && utf8TextDecoder.decode(new Uint8Array()).length === 1) {
  // Safari doesn't handle BOM correctly.
  // This fixes a bug in Safari 13.0.5 where it produces a BOM the first time it is called.
  // utf8TextDecoder.decode(new Uint8Array()).length === 1 on the first call and
  // utf8TextDecoder.decode(new Uint8Array()).length === 1 on the second call
  // Another issue is that from then on no BOM chars are recognized anymore
  /* c8 ignore next */
  utf8TextDecoder = null
}
/* c8 ignore stop */

/**
 * @param {Uint8Array} buf
 * @return {string}
 */
export const _decodeUtf8Native = buf => /** @type {TextDecoder} */ (utf8TextDecoder).decode(buf)

/**
 * @param {Uint8Array} buf
 * @return {string}
 */
/* c8 ignore next */
export const decodeUtf8 = utf8TextDecoder ? _decodeUtf8Native : _decodeUtf8Polyfill

/**
 * @param {string} str The initial string
 * @param {number} index Starting position
 * @param {number} remove Number of characters to remove
 * @param {string} insert New content to insert
 */
export const splice = (str, index, remove, insert = '') => str.slice(0, index) + insert + str.slice(index + remove)

/**
 * @param {string} source
 * @param {number} n
 */
export const repeat = (source, n) => array.unfold(n, () => source).join('')

/**
 * Escape HTML characters &,<,>,'," to their respective HTML entities &amp;,&lt;,&gt;,&#39;,&quot;
 *
 * @param {string} str
 */
export const escapeHTML = str =>
  str.replace(/[&<>'"]/g, r => /** @type {string} */ ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[r]))

/**
 * Reverse of `escapeHTML`
 *
 * @param {string} str
 */
export const unescapeHTML = str =>
  str.replace(/&amp;|&lt;|&gt;|&#39;|&quot;/g, r => /** @type {string} */ ({
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&#39;': "'",
    '&quot;': '"'
  }[r]))
