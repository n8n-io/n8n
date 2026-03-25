'use strict'

const assert = require('node:assert')
const { utf8DecodeBytes } = require('../../encoding')

/**
 * @param {(char: string) => boolean} condition
 * @param {string} input
 * @param {{ position: number }} position
 * @returns {string}
 *
 * @see https://infra.spec.whatwg.org/#collect-a-sequence-of-code-points
 */
function collectASequenceOfCodePoints (condition, input, position) {
  // 1. Let result be the empty string.
  let result = ''

  // 2. While position doesn’t point past the end of input and the
  // code point at position within input meets the condition condition:
  while (position.position < input.length && condition(input[position.position])) {
    // 1. Append that code point to the end of result.
    result += input[position.position]

    // 2. Advance position by 1.
    position.position++
  }

  // 3. Return result.
  return result
}

/**
 * A faster collectASequenceOfCodePoints that only works when comparing a single character.
 * @param {string} char
 * @param {string} input
 * @param {{ position: number }} position
 * @returns {string}
 *
 * @see https://infra.spec.whatwg.org/#collect-a-sequence-of-code-points
 */
function collectASequenceOfCodePointsFast (char, input, position) {
  const idx = input.indexOf(char, position.position)
  const start = position.position

  if (idx === -1) {
    position.position = input.length
    return input.slice(start)
  }

  position.position = idx
  return input.slice(start, position.position)
}

const ASCII_WHITESPACE_REPLACE_REGEX = /[\u0009\u000A\u000C\u000D\u0020]/g // eslint-disable-line no-control-regex

/**
 * @param {string} data
 * @returns {Uint8Array | 'failure'}
 *
 * @see https://infra.spec.whatwg.org/#forgiving-base64-decode
 */
function forgivingBase64 (data) {
  // 1. Remove all ASCII whitespace from data.
  data = data.replace(ASCII_WHITESPACE_REPLACE_REGEX, '')

  let dataLength = data.length
  // 2. If data’s code point length divides by 4 leaving
  // no remainder, then:
  if (dataLength % 4 === 0) {
    // 1. If data ends with one or two U+003D (=) code points,
    // then remove them from data.
    if (data.charCodeAt(dataLength - 1) === 0x003D) {
      --dataLength
      if (data.charCodeAt(dataLength - 1) === 0x003D) {
        --dataLength
      }
    }
  }

  // 3. If data’s code point length divides by 4 leaving
  // a remainder of 1, then return failure.
  if (dataLength % 4 === 1) {
    return 'failure'
  }

  // 4. If data contains a code point that is not one of
  //  U+002B (+)
  //  U+002F (/)
  //  ASCII alphanumeric
  // then return failure.
  if (/[^+/0-9A-Za-z]/.test(data.length === dataLength ? data : data.substring(0, dataLength))) {
    return 'failure'
  }

  const buffer = Buffer.from(data, 'base64')
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

/**
 * @param {number} char
 * @returns {boolean}
 *
 * @see https://infra.spec.whatwg.org/#ascii-whitespace
 */
function isASCIIWhitespace (char) {
  return (
    char === 0x09 || // \t
    char === 0x0a || // \n
    char === 0x0c || // \f
    char === 0x0d || // \r
    char === 0x20    // space
  )
}

/**
 * @param {Uint8Array} input
 * @returns {string}
 *
 * @see https://infra.spec.whatwg.org/#isomorphic-decode
 */
function isomorphicDecode (input) {
  // 1. To isomorphic decode a byte sequence input, return a string whose code point
  //    length is equal to input’s length and whose code points have the same values
  //    as the values of input’s bytes, in the same order.
  const length = input.length
  if ((2 << 15) - 1 > length) {
    return String.fromCharCode.apply(null, input)
  }
  let result = ''
  let i = 0
  let addition = (2 << 15) - 1
  while (i < length) {
    if (i + addition > length) {
      addition = length - i
    }
    result += String.fromCharCode.apply(null, input.subarray(i, i += addition))
  }
  return result
}

const invalidIsomorphicEncodeValueRegex = /[^\x00-\xFF]/ // eslint-disable-line no-control-regex

/**
 * @param {string} input
 * @returns {string}
 *
 * @see https://infra.spec.whatwg.org/#isomorphic-encode
 */
function isomorphicEncode (input) {
  // 1. Assert: input contains no code points greater than U+00FF.
  assert(!invalidIsomorphicEncodeValueRegex.test(input))

  // 2. Return a byte sequence whose length is equal to input’s code
  //    point length and whose bytes have the same values as the
  //    values of input’s code points, in the same order
  return input
}

/**
 * @see https://infra.spec.whatwg.org/#parse-json-bytes-to-a-javascript-value
 * @param {Uint8Array} bytes
 */
function parseJSONFromBytes (bytes) {
  return JSON.parse(utf8DecodeBytes(bytes))
}

/**
 * @param {string} str
 * @param {boolean} [leading=true]
 * @param {boolean} [trailing=true]
 * @returns {string}
 *
 * @see https://infra.spec.whatwg.org/#strip-leading-and-trailing-ascii-whitespace
 */
function removeASCIIWhitespace (str, leading = true, trailing = true) {
  return removeChars(str, leading, trailing, isASCIIWhitespace)
}

/**
 * @param {string} str
 * @param {boolean} leading
 * @param {boolean} trailing
 * @param {(charCode: number) => boolean} predicate
 * @returns {string}
 */
function removeChars (str, leading, trailing, predicate) {
  let lead = 0
  let trail = str.length - 1

  if (leading) {
    while (lead < str.length && predicate(str.charCodeAt(lead))) lead++
  }

  if (trailing) {
    while (trail > 0 && predicate(str.charCodeAt(trail))) trail--
  }

  return lead === 0 && trail === str.length - 1 ? str : str.slice(lead, trail + 1)
}

// https://infra.spec.whatwg.org/#serialize-a-javascript-value-to-a-json-string
function serializeJavascriptValueToJSONString (value) {
  // 1. Let result be ? Call(%JSON.stringify%, undefined, « value »).
  const result = JSON.stringify(value)

  // 2. If result is undefined, then throw a TypeError.
  if (result === undefined) {
    throw new TypeError('Value is not JSON serializable')
  }

  // 3. Assert: result is a string.
  assert(typeof result === 'string')

  // 4. Return result.
  return result
}

module.exports = {
  collectASequenceOfCodePoints,
  collectASequenceOfCodePointsFast,
  forgivingBase64,
  isASCIIWhitespace,
  isomorphicDecode,
  isomorphicEncode,
  parseJSONFromBytes,
  removeASCIIWhitespace,
  removeChars,
  serializeJavascriptValueToJSONString
}
