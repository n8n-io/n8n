'use strict'

const { bufferToLowerCasedHeaderName } = require('../../core/util')
const { HTTP_TOKEN_CODEPOINTS } = require('./data-url')
const { makeEntry } = require('./formdata')
const { webidl } = require('../webidl')
const assert = require('node:assert')
const { isomorphicDecode } = require('../infra')
const { utf8DecodeBytes } = require('../../encoding')

const dd = Buffer.from('--')
const decoder = new TextDecoder()

/**
 * @param {string} chars
 */
function isAsciiString (chars) {
  for (let i = 0; i < chars.length; ++i) {
    if ((chars.charCodeAt(i) & ~0x7F) !== 0) {
      return false
    }
  }
  return true
}

/**
 * @see https://andreubotella.github.io/multipart-form-data/#multipart-form-data-boundary
 * @param {string} boundary
 */
function validateBoundary (boundary) {
  const length = boundary.length

  // - its length is greater or equal to 27 and lesser or equal to 70, and
  if (length < 27 || length > 70) {
    return false
  }

  // - it is composed by bytes in the ranges 0x30 to 0x39, 0x41 to 0x5A, or
  //   0x61 to 0x7A, inclusive (ASCII alphanumeric), or which are 0x27 ('),
  //   0x2D (-) or 0x5F (_).
  for (let i = 0; i < length; ++i) {
    const cp = boundary.charCodeAt(i)

    if (!(
      (cp >= 0x30 && cp <= 0x39) ||
      (cp >= 0x41 && cp <= 0x5a) ||
      (cp >= 0x61 && cp <= 0x7a) ||
      cp === 0x27 ||
      cp === 0x2d ||
      cp === 0x5f
    )) {
      return false
    }
  }

  return true
}

/**
 * @see https://andreubotella.github.io/multipart-form-data/#multipart-form-data-parser
 * @param {Buffer} input
 * @param {ReturnType<import('./data-url')['parseMIMEType']>} mimeType
 */
function multipartFormDataParser (input, mimeType) {
  // 1. Assert: mimeType’s essence is "multipart/form-data".
  assert(mimeType !== 'failure' && mimeType.essence === 'multipart/form-data')

  const boundaryString = mimeType.parameters.get('boundary')

  // 2. If mimeType’s parameters["boundary"] does not exist, return failure.
  //    Otherwise, let boundary be the result of UTF-8 decoding mimeType’s
  //    parameters["boundary"].
  if (boundaryString === undefined) {
    throw parsingError('missing boundary in content-type header')
  }

  const boundary = Buffer.from(`--${boundaryString}`, 'utf8')

  // 3. Let entry list be an empty entry list.
  const entryList = []

  // 4. Let position be a pointer to a byte in input, initially pointing at
  //    the first byte.
  const position = { position: 0 }

  // Note: Per RFC 2046 Section 5.1.1, we must ignore anything before the
  // first boundary delimiter line (preamble). Search for the first boundary.
  const firstBoundaryIndex = input.indexOf(boundary)

  if (firstBoundaryIndex === -1) {
    throw parsingError('no boundary found in multipart body')
  }

  // Start parsing from the first boundary, ignoring any preamble
  position.position = firstBoundaryIndex

  // 5. While true:
  while (true) {
    // 5.1. If position points to a sequence of bytes starting with 0x2D 0x2D
    //      (`--`) followed by boundary, advance position by 2 + the length of
    //      boundary. Otherwise, return failure.
    // Note: boundary is padded with 2 dashes already, no need to add 2.
    if (input.subarray(position.position, position.position + boundary.length).equals(boundary)) {
      position.position += boundary.length
    } else {
      throw parsingError('expected a value starting with -- and the boundary')
    }

    // 5.2. If position points to the sequence of bytes 0x2D 0x2D 0x0D 0x0A
    //      (`--` followed by CR LF) followed by the end of input, return entry list.
    // Note: Per RFC 2046 Section 5.1.1, we must ignore anything after the
    // final boundary delimiter (epilogue). Check for -- or --CRLF and return
    // regardless of what follows.
    if (bufferStartsWith(input, dd, position)) {
      // Found closing boundary delimiter (--), ignore any epilogue
      return entryList
    }

    // 5.3. If position does not point to a sequence of bytes starting with 0x0D
    //      0x0A (CR LF), return failure.
    if (input[position.position] !== 0x0d || input[position.position + 1] !== 0x0a) {
      throw parsingError('expected CRLF')
    }

    // 5.4. Advance position by 2. (This skips past the newline.)
    position.position += 2

    // 5.5. Let name, filename and contentType be the result of parsing
    //      multipart/form-data headers on input and position, if the result
    //      is not failure. Otherwise, return failure.
    const result = parseMultipartFormDataHeaders(input, position)

    let { name, filename, contentType, encoding } = result

    // 5.6. Advance position by 2. (This skips past the empty line that marks
    //      the end of the headers.)
    position.position += 2

    // 5.7. Let body be the empty byte sequence.
    let body

    // 5.8. Body loop: While position is not past the end of input:
    // TODO: the steps here are completely wrong
    {
      const boundaryIndex = input.indexOf(boundary.subarray(2), position.position)

      if (boundaryIndex === -1) {
        throw parsingError('expected boundary after body')
      }

      body = input.subarray(position.position, boundaryIndex - 4)

      position.position += body.length

      // Note: position must be advanced by the body's length before being
      // decoded, otherwise the parsing will fail.
      if (encoding === 'base64') {
        body = Buffer.from(body.toString(), 'base64')
      }
    }

    // 5.9. If position does not point to a sequence of bytes starting with
    //      0x0D 0x0A (CR LF), return failure. Otherwise, advance position by 2.
    if (input[position.position] !== 0x0d || input[position.position + 1] !== 0x0a) {
      throw parsingError('expected CRLF')
    } else {
      position.position += 2
    }

    // 5.10. If filename is not null:
    let value

    if (filename !== null) {
      // 5.10.1. If contentType is null, set contentType to "text/plain".
      contentType ??= 'text/plain'

      // 5.10.2. If contentType is not an ASCII string, set contentType to the empty string.

      // Note: `buffer.isAscii` can be used at zero-cost, but converting a string to a buffer is a high overhead.
      // Content-Type is a relatively small string, so it is faster to use `String#charCodeAt`.
      if (!isAsciiString(contentType)) {
        contentType = ''
      }

      // 5.10.3. Let value be a new File object with name filename, type contentType, and body body.
      value = new File([body], filename, { type: contentType })
    } else {
      // 5.11. Otherwise:

      // 5.11.1. Let value be the UTF-8 decoding without BOM of body.
      value = utf8DecodeBytes(Buffer.from(body))
    }

    // 5.12. Assert: name is a scalar value string and value is either a scalar value string or a File object.
    assert(webidl.is.USVString(name))
    assert((typeof value === 'string' && webidl.is.USVString(value)) || webidl.is.File(value))

    // 5.13. Create an entry with name and value, and append it to entry list.
    entryList.push(makeEntry(name, value, filename))
  }
}

/**
 * Parses content-disposition attributes (e.g., name="value" or filename*=utf-8''encoded)
 * @param {Buffer} input
 * @param {{ position: number }} position
 * @returns {{ name: string, value: string }}
 */
function parseContentDispositionAttribute (input, position) {
  // Skip leading semicolon and whitespace
  if (input[position.position] === 0x3b /* ; */) {
    position.position++
  }

  // Skip whitespace
  collectASequenceOfBytes(
    (char) => char === 0x20 || char === 0x09,
    input,
    position
  )

  // Collect attribute name (token characters)
  const attributeName = collectASequenceOfBytes(
    (char) => isToken(char) && char !== 0x3d && char !== 0x2a, // not = or *
    input,
    position
  )

  if (attributeName.length === 0) {
    return null
  }

  const attrNameStr = attributeName.toString('ascii').toLowerCase()

  // Check for extended notation (attribute*)
  const isExtended = input[position.position] === 0x2a /* * */
  if (isExtended) {
    position.position++ // skip *
  }

  // Expect = sign
  if (input[position.position] !== 0x3d /* = */) {
    return null
  }
  position.position++ // skip =

  // Skip whitespace
  collectASequenceOfBytes(
    (char) => char === 0x20 || char === 0x09,
    input,
    position
  )

  let value

  if (isExtended) {
    // Extended attribute format: charset'language'encoded-value
    const headerValue = collectASequenceOfBytes(
      (char) => char !== 0x20 && char !== 0x0d && char !== 0x0a && char !== 0x3b, // not space, CRLF, or ;
      input,
      position
    )

    // Check for utf-8'' prefix (case insensitive)
    if (
      (headerValue[0] !== 0x75 && headerValue[0] !== 0x55) || // u or U
      (headerValue[1] !== 0x74 && headerValue[1] !== 0x54) || // t or T
      (headerValue[2] !== 0x66 && headerValue[2] !== 0x46) || // f or F
      headerValue[3] !== 0x2d || // -
      headerValue[4] !== 0x38 // 8
    ) {
      throw parsingError('unknown encoding, expected utf-8\'\'')
    }

    // Skip utf-8'' and decode the rest
    value = decodeURIComponent(decoder.decode(headerValue.subarray(7)))
  } else if (input[position.position] === 0x22 /* " */) {
    // Quoted string
    position.position++ // skip opening quote

    const quotedValue = collectASequenceOfBytes(
      (char) => char !== 0x0a && char !== 0x0d && char !== 0x22, // not LF, CR, or "
      input,
      position
    )

    if (input[position.position] !== 0x22) {
      throw parsingError('Closing quote not found')
    }
    position.position++ // skip closing quote

    value = decoder.decode(quotedValue)
      .replace(/%0A/ig, '\n')
      .replace(/%0D/ig, '\r')
      .replace(/%22/g, '"')
  } else {
    // Token value (no quotes)
    const tokenValue = collectASequenceOfBytes(
      (char) => isToken(char) && char !== 0x3b, // not ;
      input,
      position
    )

    value = decoder.decode(tokenValue)
  }

  return { name: attrNameStr, value }
}

/**
 * @see https://andreubotella.github.io/multipart-form-data/#parse-multipart-form-data-headers
 * @param {Buffer} input
 * @param {{ position: number }} position
 */
function parseMultipartFormDataHeaders (input, position) {
  // 1. Let name, filename and contentType be null.
  let name = null
  let filename = null
  let contentType = null
  let encoding = null

  // 2. While true:
  while (true) {
    // 2.1. If position points to a sequence of bytes starting with 0x0D 0x0A (CR LF):
    if (input[position.position] === 0x0d && input[position.position + 1] === 0x0a) {
      // 2.1.1. If name is null, return failure.
      if (name === null) {
        throw parsingError('header name is null')
      }

      // 2.1.2. Return name, filename and contentType.
      return { name, filename, contentType, encoding }
    }

    // 2.2. Let header name be the result of collecting a sequence of bytes that are
    //      not 0x0A (LF), 0x0D (CR) or 0x3A (:), given position.
    let headerName = collectASequenceOfBytes(
      (char) => char !== 0x0a && char !== 0x0d && char !== 0x3a,
      input,
      position
    )

    // 2.3. Remove any HTTP tab or space bytes from the start or end of header name.
    headerName = removeChars(headerName, true, true, (char) => char === 0x9 || char === 0x20)

    // 2.4. If header name does not match the field-name token production, return failure.
    if (!HTTP_TOKEN_CODEPOINTS.test(headerName.toString())) {
      throw parsingError('header name does not match the field-name token production')
    }

    // 2.5. If the byte at position is not 0x3A (:), return failure.
    if (input[position.position] !== 0x3a) {
      throw parsingError('expected :')
    }

    // 2.6. Advance position by 1.
    position.position++

    // 2.7. Collect a sequence of bytes that are HTTP tab or space bytes given position.
    //      (Do nothing with those bytes.)
    collectASequenceOfBytes(
      (char) => char === 0x20 || char === 0x09,
      input,
      position
    )

    // 2.8. Byte-lowercase header name and switch on the result:
    switch (bufferToLowerCasedHeaderName(headerName)) {
      case 'content-disposition': {
        name = filename = null

        // Collect the disposition type (should be "form-data")
        const dispositionType = collectASequenceOfBytes(
          (char) => isToken(char),
          input,
          position
        )

        if (dispositionType.toString('ascii').toLowerCase() !== 'form-data') {
          throw parsingError('expected form-data for content-disposition header')
        }

        // Parse attributes recursively until CRLF
        while (
          position.position < input.length &&
          input[position.position] !== 0x0d &&
          input[position.position + 1] !== 0x0a
        ) {
          const attribute = parseContentDispositionAttribute(input, position)

          if (!attribute) {
            break
          }

          if (attribute.name === 'name') {
            name = attribute.value
          } else if (attribute.name === 'filename') {
            filename = attribute.value
          }
        }

        if (name === null) {
          throw parsingError('name attribute is required in content-disposition header')
        }

        break
      }
      case 'content-type': {
        // 1. Let header value be the result of collecting a sequence of bytes that are
        //    not 0x0A (LF) or 0x0D (CR), given position.
        let headerValue = collectASequenceOfBytes(
          (char) => char !== 0x0a && char !== 0x0d,
          input,
          position
        )

        // 2. Remove any HTTP tab or space bytes from the end of header value.
        headerValue = removeChars(headerValue, false, true, (char) => char === 0x9 || char === 0x20)

        // 3. Set contentType to the isomorphic decoding of header value.
        contentType = isomorphicDecode(headerValue)

        break
      }
      case 'content-transfer-encoding': {
        let headerValue = collectASequenceOfBytes(
          (char) => char !== 0x0a && char !== 0x0d,
          input,
          position
        )

        headerValue = removeChars(headerValue, false, true, (char) => char === 0x9 || char === 0x20)

        encoding = isomorphicDecode(headerValue)

        break
      }
      default: {
        // Collect a sequence of bytes that are not 0x0A (LF) or 0x0D (CR), given position.
        // (Do nothing with those bytes.)
        collectASequenceOfBytes(
          (char) => char !== 0x0a && char !== 0x0d,
          input,
          position
        )
      }
    }

    // 2.9. If position does not point to a sequence of bytes starting with 0x0D 0x0A
    //      (CR LF), return failure. Otherwise, advance position by 2 (past the newline).
    if (input[position.position] !== 0x0d && input[position.position + 1] !== 0x0a) {
      throw parsingError('expected CRLF')
    } else {
      position.position += 2
    }
  }
}

/**
 * @param {(char: number) => boolean} condition
 * @param {Buffer} input
 * @param {{ position: number }} position
 */
function collectASequenceOfBytes (condition, input, position) {
  let start = position.position

  while (start < input.length && condition(input[start])) {
    ++start
  }

  return input.subarray(position.position, (position.position = start))
}

/**
 * @param {Buffer} buf
 * @param {boolean} leading
 * @param {boolean} trailing
 * @param {(charCode: number) => boolean} predicate
 * @returns {Buffer}
 */
function removeChars (buf, leading, trailing, predicate) {
  let lead = 0
  let trail = buf.length - 1

  if (leading) {
    while (lead < buf.length && predicate(buf[lead])) lead++
  }

  if (trailing) {
    while (trail > 0 && predicate(buf[trail])) trail--
  }

  return lead === 0 && trail === buf.length - 1 ? buf : buf.subarray(lead, trail + 1)
}

/**
 * Checks if {@param buffer} starts with {@param start}
 * @param {Buffer} buffer
 * @param {Buffer} start
 * @param {{ position: number }} position
 */
function bufferStartsWith (buffer, start, position) {
  if (buffer.length < start.length) {
    return false
  }

  for (let i = 0; i < start.length; i++) {
    if (start[i] !== buffer[position.position + i]) {
      return false
    }
  }

  return true
}

function parsingError (cause) {
  return new TypeError('Failed to parse body as FormData.', { cause: new TypeError(cause) })
}

/**
 * CTL            = <any US-ASCII control character
 *                  (octets 0 - 31) and DEL (127)>
 * @param {number} char
 */
function isCTL (char) {
  return char <= 0x1f || char === 0x7f
}

/**
 * tspecials :=  "(" / ")" / "<" / ">" / "@" /
 *                "," / ";" / ":" / "\" / <">
 *                "/" / "[" / "]" / "?" / "="
 *                ; Must be in quoted-string,
 *                ; to use within parameter values
 * @param {number} char
 */
function isTSpecial (char) {
  return (
    char === 0x28 || // (
    char === 0x29 || // )
    char === 0x3c || // <
    char === 0x3e || // >
    char === 0x40 || // @
    char === 0x2c || // ,
    char === 0x3b || // ;
    char === 0x3a || // :
    char === 0x5c || // \
    char === 0x22 || // "
    char === 0x2f || // /
    char === 0x5b || // [
    char === 0x5d || // ]
    char === 0x3f || // ?
    char === 0x3d    // +
  )
}

/**
 * token := 1*<any (US-ASCII) CHAR except SPACE, CTLs,
 *          or tspecials>
 * @param {number} char
 */
function isToken (char) {
  return (
    char <= 0x7f &&  // ascii
    char !== 0x20 && // space
    char !== 0x09 &&
    !isCTL(char) &&
    !isTSpecial(char)
  )
}

module.exports = {
  multipartFormDataParser,
  validateBoundary
}
