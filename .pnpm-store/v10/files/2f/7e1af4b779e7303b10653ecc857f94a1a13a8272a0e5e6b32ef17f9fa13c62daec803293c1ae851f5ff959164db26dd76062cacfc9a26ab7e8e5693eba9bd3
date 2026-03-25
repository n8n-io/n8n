'use strict'

const assert = require('node:assert')
const { forgivingBase64, collectASequenceOfCodePoints, collectASequenceOfCodePointsFast, isomorphicDecode, removeASCIIWhitespace, removeChars } = require('../infra')

const encoder = new TextEncoder()

/**
 * @see https://mimesniff.spec.whatwg.org/#http-token-code-point
 */
const HTTP_TOKEN_CODEPOINTS = /^[-!#$%&'*+.^_|~A-Za-z0-9]+$/u
const HTTP_WHITESPACE_REGEX = /[\u000A\u000D\u0009\u0020]/u // eslint-disable-line

/**
 * @see https://mimesniff.spec.whatwg.org/#http-quoted-string-token-code-point
 */
const HTTP_QUOTED_STRING_TOKENS = /^[\u0009\u0020-\u007E\u0080-\u00FF]+$/u // eslint-disable-line

// https://fetch.spec.whatwg.org/#data-url-processor
/** @param {URL} dataURL */
function dataURLProcessor (dataURL) {
  // 1. Assert: dataURL’s scheme is "data".
  assert(dataURL.protocol === 'data:')

  // 2. Let input be the result of running the URL
  // serializer on dataURL with exclude fragment
  // set to true.
  let input = URLSerializer(dataURL, true)

  // 3. Remove the leading "data:" string from input.
  input = input.slice(5)

  // 4. Let position point at the start of input.
  const position = { position: 0 }

  // 5. Let mimeType be the result of collecting a
  // sequence of code points that are not equal
  // to U+002C (,), given position.
  let mimeType = collectASequenceOfCodePointsFast(
    ',',
    input,
    position
  )

  // 6. Strip leading and trailing ASCII whitespace
  // from mimeType.
  // Undici implementation note: we need to store the
  // length because if the mimetype has spaces removed,
  // the wrong amount will be sliced from the input in
  // step #9
  const mimeTypeLength = mimeType.length
  mimeType = removeASCIIWhitespace(mimeType, true, true)

  // 7. If position is past the end of input, then
  // return failure
  if (position.position >= input.length) {
    return 'failure'
  }

  // 8. Advance position by 1.
  position.position++

  // 9. Let encodedBody be the remainder of input.
  const encodedBody = input.slice(mimeTypeLength + 1)

  // 10. Let body be the percent-decoding of encodedBody.
  let body = stringPercentDecode(encodedBody)

  // 11. If mimeType ends with U+003B (;), followed by
  // zero or more U+0020 SPACE, followed by an ASCII
  // case-insensitive match for "base64", then:
  if (/;(?:\u0020*)base64$/ui.test(mimeType)) {
    // 1. Let stringBody be the isomorphic decode of body.
    const stringBody = isomorphicDecode(body)

    // 2. Set body to the forgiving-base64 decode of
    // stringBody.
    body = forgivingBase64(stringBody)

    // 3. If body is failure, then return failure.
    if (body === 'failure') {
      return 'failure'
    }

    // 4. Remove the last 6 code points from mimeType.
    mimeType = mimeType.slice(0, -6)

    // 5. Remove trailing U+0020 SPACE code points from mimeType,
    // if any.
    mimeType = mimeType.replace(/(\u0020+)$/u, '')

    // 6. Remove the last U+003B (;) code point from mimeType.
    mimeType = mimeType.slice(0, -1)
  }

  // 12. If mimeType starts with U+003B (;), then prepend
  // "text/plain" to mimeType.
  if (mimeType.startsWith(';')) {
    mimeType = 'text/plain' + mimeType
  }

  // 13. Let mimeTypeRecord be the result of parsing
  // mimeType.
  let mimeTypeRecord = parseMIMEType(mimeType)

  // 14. If mimeTypeRecord is failure, then set
  // mimeTypeRecord to text/plain;charset=US-ASCII.
  if (mimeTypeRecord === 'failure') {
    mimeTypeRecord = parseMIMEType('text/plain;charset=US-ASCII')
  }

  // 15. Return a new data: URL struct whose MIME
  // type is mimeTypeRecord and body is body.
  // https://fetch.spec.whatwg.org/#data-url-struct
  return { mimeType: mimeTypeRecord, body }
}

// https://url.spec.whatwg.org/#concept-url-serializer
/**
 * @param {URL} url
 * @param {boolean} excludeFragment
 */
function URLSerializer (url, excludeFragment = false) {
  if (!excludeFragment) {
    return url.href
  }

  const href = url.href
  const hashLength = url.hash.length

  const serialized = hashLength === 0 ? href : href.substring(0, href.length - hashLength)

  if (!hashLength && href.endsWith('#')) {
    return serialized.slice(0, -1)
  }

  return serialized
}

// https://url.spec.whatwg.org/#string-percent-decode
/** @param {string} input */
function stringPercentDecode (input) {
  // 1. Let bytes be the UTF-8 encoding of input.
  const bytes = encoder.encode(input)

  // 2. Return the percent-decoding of bytes.
  return percentDecode(bytes)
}

/**
 * @param {number} byte
 */
function isHexCharByte (byte) {
  // 0-9 A-F a-f
  return (byte >= 0x30 && byte <= 0x39) || (byte >= 0x41 && byte <= 0x46) || (byte >= 0x61 && byte <= 0x66)
}

/**
 * @param {number} byte
 */
function hexByteToNumber (byte) {
  return (
    // 0-9
    byte >= 0x30 && byte <= 0x39
      ? (byte - 48)
    // Convert to uppercase
    // ((byte & 0xDF) - 65) + 10
      : ((byte & 0xDF) - 55)
  )
}

// https://url.spec.whatwg.org/#percent-decode
/** @param {Uint8Array} input */
function percentDecode (input) {
  const length = input.length
  // 1. Let output be an empty byte sequence.
  /** @type {Uint8Array} */
  const output = new Uint8Array(length)
  let j = 0
  let i = 0
  // 2. For each byte byte in input:
  while (i < length) {
    const byte = input[i]

    // 1. If byte is not 0x25 (%), then append byte to output.
    if (byte !== 0x25) {
      output[j++] = byte

    // 2. Otherwise, if byte is 0x25 (%) and the next two bytes
    // after byte in input are not in the ranges
    // 0x30 (0) to 0x39 (9), 0x41 (A) to 0x46 (F),
    // and 0x61 (a) to 0x66 (f), all inclusive, append byte
    // to output.
    } else if (
      byte === 0x25 &&
      !(isHexCharByte(input[i + 1]) && isHexCharByte(input[i + 2]))
    ) {
      output[j++] = 0x25

    // 3. Otherwise:
    } else {
      // 1. Let bytePoint be the two bytes after byte in input,
      // decoded, and then interpreted as hexadecimal number.
      // 2. Append a byte whose value is bytePoint to output.
      output[j++] = (hexByteToNumber(input[i + 1]) << 4) | hexByteToNumber(input[i + 2])

      // 3. Skip the next two bytes in input.
      i += 2
    }
    ++i
  }

  // 3. Return output.
  return length === j ? output : output.subarray(0, j)
}

// https://mimesniff.spec.whatwg.org/#parse-a-mime-type
/** @param {string} input */
function parseMIMEType (input) {
  // 1. Remove any leading and trailing HTTP whitespace
  // from input.
  input = removeHTTPWhitespace(input, true, true)

  // 2. Let position be a position variable for input,
  // initially pointing at the start of input.
  const position = { position: 0 }

  // 3. Let type be the result of collecting a sequence
  // of code points that are not U+002F (/) from
  // input, given position.
  const type = collectASequenceOfCodePointsFast(
    '/',
    input,
    position
  )

  // 4. If type is the empty string or does not solely
  // contain HTTP token code points, then return failure.
  // https://mimesniff.spec.whatwg.org/#http-token-code-point
  if (type.length === 0 || !HTTP_TOKEN_CODEPOINTS.test(type)) {
    return 'failure'
  }

  // 5. If position is past the end of input, then return
  // failure
  if (position.position >= input.length) {
    return 'failure'
  }

  // 6. Advance position by 1. (This skips past U+002F (/).)
  position.position++

  // 7. Let subtype be the result of collecting a sequence of
  // code points that are not U+003B (;) from input, given
  // position.
  let subtype = collectASequenceOfCodePointsFast(
    ';',
    input,
    position
  )

  // 8. Remove any trailing HTTP whitespace from subtype.
  subtype = removeHTTPWhitespace(subtype, false, true)

  // 9. If subtype is the empty string or does not solely
  // contain HTTP token code points, then return failure.
  if (subtype.length === 0 || !HTTP_TOKEN_CODEPOINTS.test(subtype)) {
    return 'failure'
  }

  const typeLowercase = type.toLowerCase()
  const subtypeLowercase = subtype.toLowerCase()

  // 10. Let mimeType be a new MIME type record whose type
  // is type, in ASCII lowercase, and subtype is subtype,
  // in ASCII lowercase.
  // https://mimesniff.spec.whatwg.org/#mime-type
  const mimeType = {
    type: typeLowercase,
    subtype: subtypeLowercase,
    /** @type {Map<string, string>} */
    parameters: new Map(),
    // https://mimesniff.spec.whatwg.org/#mime-type-essence
    essence: `${typeLowercase}/${subtypeLowercase}`
  }

  // 11. While position is not past the end of input:
  while (position.position < input.length) {
    // 1. Advance position by 1. (This skips past U+003B (;).)
    position.position++

    // 2. Collect a sequence of code points that are HTTP
    // whitespace from input given position.
    collectASequenceOfCodePoints(
      // https://fetch.spec.whatwg.org/#http-whitespace
      char => HTTP_WHITESPACE_REGEX.test(char),
      input,
      position
    )

    // 3. Let parameterName be the result of collecting a
    // sequence of code points that are not U+003B (;)
    // or U+003D (=) from input, given position.
    let parameterName = collectASequenceOfCodePoints(
      (char) => char !== ';' && char !== '=',
      input,
      position
    )

    // 4. Set parameterName to parameterName, in ASCII
    // lowercase.
    parameterName = parameterName.toLowerCase()

    // 5. If position is not past the end of input, then:
    if (position.position < input.length) {
      // 1. If the code point at position within input is
      // U+003B (;), then continue.
      if (input[position.position] === ';') {
        continue
      }

      // 2. Advance position by 1. (This skips past U+003D (=).)
      position.position++
    }

    // 6. If position is past the end of input, then break.
    if (position.position >= input.length) {
      break
    }

    // 7. Let parameterValue be null.
    let parameterValue = null

    // 8. If the code point at position within input is
    // U+0022 ("), then:
    if (input[position.position] === '"') {
      // 1. Set parameterValue to the result of collecting
      // an HTTP quoted string from input, given position
      // and the extract-value flag.
      parameterValue = collectAnHTTPQuotedString(input, position, true)

      // 2. Collect a sequence of code points that are not
      // U+003B (;) from input, given position.
      collectASequenceOfCodePointsFast(
        ';',
        input,
        position
      )

    // 9. Otherwise:
    } else {
      // 1. Set parameterValue to the result of collecting
      // a sequence of code points that are not U+003B (;)
      // from input, given position.
      parameterValue = collectASequenceOfCodePointsFast(
        ';',
        input,
        position
      )

      // 2. Remove any trailing HTTP whitespace from parameterValue.
      parameterValue = removeHTTPWhitespace(parameterValue, false, true)

      // 3. If parameterValue is the empty string, then continue.
      if (parameterValue.length === 0) {
        continue
      }
    }

    // 10. If all of the following are true
    // - parameterName is not the empty string
    // - parameterName solely contains HTTP token code points
    // - parameterValue solely contains HTTP quoted-string token code points
    // - mimeType’s parameters[parameterName] does not exist
    // then set mimeType’s parameters[parameterName] to parameterValue.
    if (
      parameterName.length !== 0 &&
      HTTP_TOKEN_CODEPOINTS.test(parameterName) &&
      (parameterValue.length === 0 || HTTP_QUOTED_STRING_TOKENS.test(parameterValue)) &&
      !mimeType.parameters.has(parameterName)
    ) {
      mimeType.parameters.set(parameterName, parameterValue)
    }
  }

  // 12. Return mimeType.
  return mimeType
}

// https://fetch.spec.whatwg.org/#collect-an-http-quoted-string
// tests: https://fetch.spec.whatwg.org/#example-http-quoted-string
/**
 * @param {string} input
 * @param {{ position: number }} position
 * @param {boolean} [extractValue=false]
 */
function collectAnHTTPQuotedString (input, position, extractValue = false) {
  // 1. Let positionStart be position.
  const positionStart = position.position

  // 2. Let value be the empty string.
  let value = ''

  // 3. Assert: the code point at position within input
  // is U+0022 (").
  assert(input[position.position] === '"')

  // 4. Advance position by 1.
  position.position++

  // 5. While true:
  while (true) {
    // 1. Append the result of collecting a sequence of code points
    // that are not U+0022 (") or U+005C (\) from input, given
    // position, to value.
    value += collectASequenceOfCodePoints(
      (char) => char !== '"' && char !== '\\',
      input,
      position
    )

    // 2. If position is past the end of input, then break.
    if (position.position >= input.length) {
      break
    }

    // 3. Let quoteOrBackslash be the code point at position within
    // input.
    const quoteOrBackslash = input[position.position]

    // 4. Advance position by 1.
    position.position++

    // 5. If quoteOrBackslash is U+005C (\), then:
    if (quoteOrBackslash === '\\') {
      // 1. If position is past the end of input, then append
      // U+005C (\) to value and break.
      if (position.position >= input.length) {
        value += '\\'
        break
      }

      // 2. Append the code point at position within input to value.
      value += input[position.position]

      // 3. Advance position by 1.
      position.position++

    // 6. Otherwise:
    } else {
      // 1. Assert: quoteOrBackslash is U+0022 (").
      assert(quoteOrBackslash === '"')

      // 2. Break.
      break
    }
  }

  // 6. If the extract-value flag is set, then return value.
  if (extractValue) {
    return value
  }

  // 7. Return the code points from positionStart to position,
  // inclusive, within input.
  return input.slice(positionStart, position.position)
}

/**
 * @see https://mimesniff.spec.whatwg.org/#serialize-a-mime-type
 */
function serializeAMimeType (mimeType) {
  assert(mimeType !== 'failure')
  const { parameters, essence } = mimeType

  // 1. Let serialization be the concatenation of mimeType’s
  //    type, U+002F (/), and mimeType’s subtype.
  let serialization = essence

  // 2. For each name → value of mimeType’s parameters:
  for (let [name, value] of parameters.entries()) {
    // 1. Append U+003B (;) to serialization.
    serialization += ';'

    // 2. Append name to serialization.
    serialization += name

    // 3. Append U+003D (=) to serialization.
    serialization += '='

    // 4. If value does not solely contain HTTP token code
    //    points or value is the empty string, then:
    if (!HTTP_TOKEN_CODEPOINTS.test(value)) {
      // 1. Precede each occurrence of U+0022 (") or
      //    U+005C (\) in value with U+005C (\).
      value = value.replace(/[\\"]/ug, '\\$&')

      // 2. Prepend U+0022 (") to value.
      value = '"' + value

      // 3. Append U+0022 (") to value.
      value += '"'
    }

    // 5. Append value to serialization.
    serialization += value
  }

  // 3. Return serialization.
  return serialization
}

/**
 * @see https://fetch.spec.whatwg.org/#http-whitespace
 * @param {number} char
 */
function isHTTPWhiteSpace (char) {
  // "\r\n\t "
  return char === 0x00d || char === 0x00a || char === 0x009 || char === 0x020
}

/**
 * @see https://fetch.spec.whatwg.org/#http-whitespace
 * @param {string} str
 * @param {boolean} [leading=true]
 * @param {boolean} [trailing=true]
 */
function removeHTTPWhitespace (str, leading = true, trailing = true) {
  return removeChars(str, leading, trailing, isHTTPWhiteSpace)
}

/**
 * @see https://mimesniff.spec.whatwg.org/#minimize-a-supported-mime-type
 * @param {Exclude<ReturnType<typeof parseMIMEType>, 'failure'>} mimeType
 */
function minimizeSupportedMimeType (mimeType) {
  switch (mimeType.essence) {
    case 'application/ecmascript':
    case 'application/javascript':
    case 'application/x-ecmascript':
    case 'application/x-javascript':
    case 'text/ecmascript':
    case 'text/javascript':
    case 'text/javascript1.0':
    case 'text/javascript1.1':
    case 'text/javascript1.2':
    case 'text/javascript1.3':
    case 'text/javascript1.4':
    case 'text/javascript1.5':
    case 'text/jscript':
    case 'text/livescript':
    case 'text/x-ecmascript':
    case 'text/x-javascript':
      // 1. If mimeType is a JavaScript MIME type, then return "text/javascript".
      return 'text/javascript'
    case 'application/json':
    case 'text/json':
      // 2. If mimeType is a JSON MIME type, then return "application/json".
      return 'application/json'
    case 'image/svg+xml':
      // 3. If mimeType’s essence is "image/svg+xml", then return "image/svg+xml".
      return 'image/svg+xml'
    case 'text/xml':
    case 'application/xml':
      // 4. If mimeType is an XML MIME type, then return "application/xml".
      return 'application/xml'
  }

  // 2. If mimeType is a JSON MIME type, then return "application/json".
  if (mimeType.subtype.endsWith('+json')) {
    return 'application/json'
  }

  // 4. If mimeType is an XML MIME type, then return "application/xml".
  if (mimeType.subtype.endsWith('+xml')) {
    return 'application/xml'
  }

  // 5. If mimeType is supported by the user agent, then return mimeType’s essence.
  // Technically, node doesn't support any mimetypes.

  // 6. Return the empty string.
  return ''
}

module.exports = {
  dataURLProcessor,
  URLSerializer,
  stringPercentDecode,
  parseMIMEType,
  collectAnHTTPQuotedString,
  serializeAMimeType,
  removeHTTPWhitespace,
  minimizeSupportedMimeType,
  HTTP_TOKEN_CODEPOINTS
}
