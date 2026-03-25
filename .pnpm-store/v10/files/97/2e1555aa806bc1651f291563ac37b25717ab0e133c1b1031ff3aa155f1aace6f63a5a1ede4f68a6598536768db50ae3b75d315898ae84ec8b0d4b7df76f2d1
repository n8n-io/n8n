'use strict';

var array = require('./array-78849c95.cjs');

/**
 * Utility module to work with strings.
 *
 * @module string
 */

const fromCharCode = String.fromCharCode;
const fromCodePoint = String.fromCodePoint;

/**
 * The largest utf16 character.
 * Corresponds to Uint8Array([255, 255]) or charcodeof(2x2^8)
 */
const MAX_UTF16_CHARACTER = fromCharCode(65535);

/**
 * @param {string} s
 * @return {string}
 */
const toLowerCase = s => s.toLowerCase();

const trimLeftRegex = /^\s*/g;

/**
 * @param {string} s
 * @return {string}
 */
const trimLeft = s => s.replace(trimLeftRegex, '');

const fromCamelCaseRegex = /([A-Z])/g;

/**
 * @param {string} s
 * @param {string} separator
 * @return {string}
 */
const fromCamelCase = (s, separator) => trimLeft(s.replace(fromCamelCaseRegex, match => `${separator}${toLowerCase(match)}`));

/**
 * Compute the utf8ByteLength
 * @param {string} str
 * @return {number}
 */
const utf8ByteLength = str => unescape(encodeURIComponent(str)).length;

/**
 * @param {string} str
 * @return {Uint8Array<ArrayBuffer>}
 */
const _encodeUtf8Polyfill = str => {
  const encodedString = unescape(encodeURIComponent(str));
  const len = encodedString.length;
  const buf = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buf[i] = /** @type {number} */ (encodedString.codePointAt(i));
  }
  return buf
};

/* c8 ignore next */
const utf8TextEncoder = /** @type {TextEncoder} */ (typeof TextEncoder !== 'undefined' ? new TextEncoder() : null);

/**
 * @param {string} str
 * @return {Uint8Array<ArrayBuffer>}
 */
const _encodeUtf8Native = str => utf8TextEncoder.encode(str);

/**
 * @param {string} str
 * @return {Uint8Array}
 */
/* c8 ignore next */
const encodeUtf8 = utf8TextEncoder ? _encodeUtf8Native : _encodeUtf8Polyfill;

/**
 * @param {Uint8Array} buf
 * @return {string}
 */
const _decodeUtf8Polyfill = buf => {
  let remainingLen = buf.length;
  let encodedString = '';
  let bufPos = 0;
  while (remainingLen > 0) {
    const nextLen = remainingLen < 10000 ? remainingLen : 10000;
    const bytes = buf.subarray(bufPos, bufPos + nextLen);
    bufPos += nextLen;
    // Starting with ES5.1 we can supply a generic array-like object as arguments
    encodedString += String.fromCodePoint.apply(null, /** @type {any} */ (bytes));
    remainingLen -= nextLen;
  }
  return decodeURIComponent(escape(encodedString))
};

/* c8 ignore next */
exports.utf8TextDecoder = typeof TextDecoder === 'undefined' ? null : new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/* c8 ignore start */
if (exports.utf8TextDecoder && exports.utf8TextDecoder.decode(new Uint8Array()).length === 1) {
  // Safari doesn't handle BOM correctly.
  // This fixes a bug in Safari 13.0.5 where it produces a BOM the first time it is called.
  // utf8TextDecoder.decode(new Uint8Array()).length === 1 on the first call and
  // utf8TextDecoder.decode(new Uint8Array()).length === 1 on the second call
  // Another issue is that from then on no BOM chars are recognized anymore
  /* c8 ignore next */
  exports.utf8TextDecoder = null;
}
/* c8 ignore stop */

/**
 * @param {Uint8Array} buf
 * @return {string}
 */
const _decodeUtf8Native = buf => /** @type {TextDecoder} */ (exports.utf8TextDecoder).decode(buf);

/**
 * @param {Uint8Array} buf
 * @return {string}
 */
/* c8 ignore next */
const decodeUtf8 = exports.utf8TextDecoder ? _decodeUtf8Native : _decodeUtf8Polyfill;

/**
 * @param {string} str The initial string
 * @param {number} index Starting position
 * @param {number} remove Number of characters to remove
 * @param {string} insert New content to insert
 */
const splice = (str, index, remove, insert = '') => str.slice(0, index) + insert + str.slice(index + remove);

/**
 * @param {string} source
 * @param {number} n
 */
const repeat = (source, n) => array.unfold(n, () => source).join('');

/**
 * Escape HTML characters &,<,>,'," to their respective HTML entities &amp;,&lt;,&gt;,&#39;,&quot;
 *
 * @param {string} str
 */
const escapeHTML = str =>
  str.replace(/[&<>'"]/g, r => /** @type {string} */ ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[r]));

/**
 * Reverse of `escapeHTML`
 *
 * @param {string} str
 */
const unescapeHTML = str =>
  str.replace(/&amp;|&lt;|&gt;|&#39;|&quot;/g, r => /** @type {string} */ ({
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&#39;': "'",
    '&quot;': '"'
  }[r]));

var string = /*#__PURE__*/Object.freeze({
  __proto__: null,
  fromCharCode: fromCharCode,
  fromCodePoint: fromCodePoint,
  MAX_UTF16_CHARACTER: MAX_UTF16_CHARACTER,
  trimLeft: trimLeft,
  fromCamelCase: fromCamelCase,
  utf8ByteLength: utf8ByteLength,
  _encodeUtf8Polyfill: _encodeUtf8Polyfill,
  utf8TextEncoder: utf8TextEncoder,
  _encodeUtf8Native: _encodeUtf8Native,
  encodeUtf8: encodeUtf8,
  _decodeUtf8Polyfill: _decodeUtf8Polyfill,
  get utf8TextDecoder () { return exports.utf8TextDecoder; },
  _decodeUtf8Native: _decodeUtf8Native,
  decodeUtf8: decodeUtf8,
  splice: splice,
  repeat: repeat,
  escapeHTML: escapeHTML,
  unescapeHTML: unescapeHTML
});

exports.MAX_UTF16_CHARACTER = MAX_UTF16_CHARACTER;
exports._decodeUtf8Native = _decodeUtf8Native;
exports._decodeUtf8Polyfill = _decodeUtf8Polyfill;
exports._encodeUtf8Native = _encodeUtf8Native;
exports._encodeUtf8Polyfill = _encodeUtf8Polyfill;
exports.decodeUtf8 = decodeUtf8;
exports.encodeUtf8 = encodeUtf8;
exports.escapeHTML = escapeHTML;
exports.fromCamelCase = fromCamelCase;
exports.fromCharCode = fromCharCode;
exports.fromCodePoint = fromCodePoint;
exports.repeat = repeat;
exports.splice = splice;
exports.string = string;
exports.trimLeft = trimLeft;
exports.unescapeHTML = unescapeHTML;
exports.utf8ByteLength = utf8ByteLength;
exports.utf8TextEncoder = utf8TextEncoder;
//# sourceMappingURL=string-fddc5f8b.cjs.map
