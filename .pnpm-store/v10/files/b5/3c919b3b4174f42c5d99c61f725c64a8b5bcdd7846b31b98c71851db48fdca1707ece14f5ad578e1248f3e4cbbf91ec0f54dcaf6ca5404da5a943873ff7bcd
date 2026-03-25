'use strict'

const { states, opcodes } = require('./constants')
const { isUtf8 } = require('node:buffer')
const { removeHTTPWhitespace } = require('../fetch/data-url')
const { collectASequenceOfCodePointsFast } = require('../infra')

/**
 * @param {number} readyState
 * @returns {boolean}
 */
function isConnecting (readyState) {
  // If the WebSocket connection is not yet established, and the connection
  // is not yet closed, then the WebSocket connection is in the CONNECTING state.
  return readyState === states.CONNECTING
}

/**
 * @param {number} readyState
 * @returns {boolean}
 */
function isEstablished (readyState) {
  // If the server's response is validated as provided for above, it is
  // said that _The WebSocket Connection is Established_ and that the
  // WebSocket Connection is in the OPEN state.
  return readyState === states.OPEN
}

/**
 * @param {number} readyState
 * @returns {boolean}
 */
function isClosing (readyState) {
  // Upon either sending or receiving a Close control frame, it is said
  // that _The WebSocket Closing Handshake is Started_ and that the
  // WebSocket connection is in the CLOSING state.
  return readyState === states.CLOSING
}

/**
 * @param {number} readyState
 * @returns {boolean}
 */
function isClosed (readyState) {
  return readyState === states.CLOSED
}

/**
 * @see https://dom.spec.whatwg.org/#concept-event-fire
 * @param {string} e
 * @param {EventTarget} target
 * @param {(...args: ConstructorParameters<typeof Event>) => Event} eventFactory
 * @param {EventInit | undefined} eventInitDict
 * @returns {void}
 */
function fireEvent (e, target, eventFactory = (type, init) => new Event(type, init), eventInitDict = {}) {
  // 1. If eventConstructor is not given, then let eventConstructor be Event.

  // 2. Let event be the result of creating an event given eventConstructor,
  //    in the relevant realm of target.
  // 3. Initialize event’s type attribute to e.
  const event = eventFactory(e, eventInitDict)

  // 4. Initialize any other IDL attributes of event as described in the
  //    invocation of this algorithm.

  // 5. Return the result of dispatching event at target, with legacy target
  //    override flag set if set.
  target.dispatchEvent(event)
}

/**
 * @see https://websockets.spec.whatwg.org/#feedback-from-the-protocol
 * @param {import('./websocket').Handler} handler
 * @param {number} type Opcode
 * @param {Buffer} data application data
 * @returns {void}
 */
function websocketMessageReceived (handler, type, data) {
  handler.onMessage(type, data)
}

/**
 * @param {Buffer} buffer
 * @returns {ArrayBuffer}
 */
function toArrayBuffer (buffer) {
  if (buffer.byteLength === buffer.buffer.byteLength) {
    return buffer.buffer
  }
  return new Uint8Array(buffer).buffer
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc6455
 * @see https://datatracker.ietf.org/doc/html/rfc2616
 * @see https://bugs.chromium.org/p/chromium/issues/detail?id=398407
 * @param {string} protocol
 * @returns {boolean}
 */
function isValidSubprotocol (protocol) {
  // If present, this value indicates one
  // or more comma-separated subprotocol the client wishes to speak,
  // ordered by preference.  The elements that comprise this value
  // MUST be non-empty strings with characters in the range U+0021 to
  // U+007E not including separator characters as defined in
  // [RFC2616] and MUST all be unique strings.
  if (protocol.length === 0) {
    return false
  }

  for (let i = 0; i < protocol.length; ++i) {
    const code = protocol.charCodeAt(i)

    if (
      code < 0x21 || // CTL, contains SP (0x20) and HT (0x09)
      code > 0x7E ||
      code === 0x22 || // "
      code === 0x28 || // (
      code === 0x29 || // )
      code === 0x2C || // ,
      code === 0x2F || // /
      code === 0x3A || // :
      code === 0x3B || // ;
      code === 0x3C || // <
      code === 0x3D || // =
      code === 0x3E || // >
      code === 0x3F || // ?
      code === 0x40 || // @
      code === 0x5B || // [
      code === 0x5C || // \
      code === 0x5D || // ]
      code === 0x7B || // {
      code === 0x7D // }
    ) {
      return false
    }
  }

  return true
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc6455#section-7-4
 * @param {number} code
 * @returns {boolean}
 */
function isValidStatusCode (code) {
  if (code >= 1000 && code < 1015) {
    return (
      code !== 1004 && // reserved
      code !== 1005 && // "MUST NOT be set as a status code"
      code !== 1006 // "MUST NOT be set as a status code"
    )
  }

  return code >= 3000 && code <= 4999
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc6455#section-5.5
 * @param {number} opcode
 * @returns {boolean}
 */
function isControlFrame (opcode) {
  return (
    opcode === opcodes.CLOSE ||
    opcode === opcodes.PING ||
    opcode === opcodes.PONG
  )
}

/**
 * @param {number} opcode
 * @returns {boolean}
 */
function isContinuationFrame (opcode) {
  return opcode === opcodes.CONTINUATION
}

/**
 * @param {number} opcode
 * @returns {boolean}
 */
function isTextBinaryFrame (opcode) {
  return opcode === opcodes.TEXT || opcode === opcodes.BINARY
}

/**
 *
 * @param {number} opcode
 * @returns {boolean}
 */
function isValidOpcode (opcode) {
  return isTextBinaryFrame(opcode) || isContinuationFrame(opcode) || isControlFrame(opcode)
}

/**
 * Parses a Sec-WebSocket-Extensions header value.
 * @param {string} extensions
 * @returns {Map<string, string>}
 */
// TODO(@Uzlopak, @KhafraDev): make compliant https://datatracker.ietf.org/doc/html/rfc6455#section-9.1
function parseExtensions (extensions) {
  const position = { position: 0 }
  const extensionList = new Map()

  while (position.position < extensions.length) {
    const pair = collectASequenceOfCodePointsFast(';', extensions, position)
    const [name, value = ''] = pair.split('=', 2)

    extensionList.set(
      removeHTTPWhitespace(name, true, false),
      removeHTTPWhitespace(value, false, true)
    )

    position.position++
  }

  return extensionList
}

/**
 * @see https://www.rfc-editor.org/rfc/rfc7692#section-7.1.2.2
 * @description "client-max-window-bits = 1*DIGIT"
 * @param {string} value
 * @returns {boolean}
 */
function isValidClientWindowBits (value) {
  for (let i = 0; i < value.length; i++) {
    const byte = value.charCodeAt(i)

    if (byte < 0x30 || byte > 0x39) {
      return false
    }
  }

  return true
}

/**
 * @see https://whatpr.org/websockets/48/7b748d3...d5570f3.html#get-a-url-record
 * @param {string} url
 * @param {string} [baseURL]
 */
function getURLRecord (url, baseURL) {
  // 1. Let urlRecord be the result of applying the URL parser to url with baseURL .
  // 2. If urlRecord is failure, then throw a " SyntaxError " DOMException .
  let urlRecord

  try {
    urlRecord = new URL(url, baseURL)
  } catch (e) {
    throw new DOMException(e, 'SyntaxError')
  }

  // 3. If urlRecord ’s scheme is " http ", then set urlRecord ’s scheme to " ws ".
  // 4. Otherwise, if urlRecord ’s scheme is " https ", set urlRecord ’s scheme to " wss ".
  if (urlRecord.protocol === 'http:') {
    urlRecord.protocol = 'ws:'
  } else if (urlRecord.protocol === 'https:') {
    urlRecord.protocol = 'wss:'
  }

  // 5. If urlRecord ’s scheme is not " ws " or " wss ", then throw a " SyntaxError " DOMException .
  if (urlRecord.protocol !== 'ws:' && urlRecord.protocol !== 'wss:') {
    throw new DOMException('expected a ws: or wss: url', 'SyntaxError')
  }

  // If urlRecord ’s fragment is non-null, then throw a " SyntaxError " DOMException .
  if (urlRecord.hash.length || urlRecord.href.endsWith('#')) {
    throw new DOMException('hash', 'SyntaxError')
  }

  // Return urlRecord .
  return urlRecord
}

// https://whatpr.org/websockets/48.html#validate-close-code-and-reason
function validateCloseCodeAndReason (code, reason) {
  // 1. If code is not null, but is neither an integer equal to
  //    1000 nor an integer in the range 3000 to 4999, inclusive,
  //    throw an "InvalidAccessError" DOMException.
  if (code !== null) {
    if (code !== 1000 && (code < 3000 || code > 4999)) {
      throw new DOMException('invalid code', 'InvalidAccessError')
    }
  }

  // 2. If reason is not null, then:
  if (reason !== null) {
    // 2.1. Let reasonBytes be the result of UTF-8 encoding reason.
    // 2.2. If reasonBytes is longer than 123 bytes, then throw a
    //      "SyntaxError" DOMException.
    const reasonBytesLength = Buffer.byteLength(reason)

    if (reasonBytesLength > 123) {
      throw new DOMException(`Reason must be less than 123 bytes; received ${reasonBytesLength}`, 'SyntaxError')
    }
  }
}

/**
 * Converts a Buffer to utf-8, even on platforms without icu.
 * @type {(buffer: Buffer) => string}
 */
const utf8Decode = (() => {
  if (typeof process.versions.icu === 'string') {
    const fatalDecoder = new TextDecoder('utf-8', { fatal: true })
    return fatalDecoder.decode.bind(fatalDecoder)
  }
  return function (buffer) {
    if (isUtf8(buffer)) {
      return buffer.toString('utf-8')
    }
    throw new TypeError('Invalid utf-8 received.')
  }
})()

module.exports = {
  isConnecting,
  isEstablished,
  isClosing,
  isClosed,
  fireEvent,
  isValidSubprotocol,
  isValidStatusCode,
  websocketMessageReceived,
  utf8Decode,
  isControlFrame,
  isContinuationFrame,
  isTextBinaryFrame,
  isValidOpcode,
  parseExtensions,
  isValidClientWindowBits,
  toArrayBuffer,
  getURLRecord,
  validateCloseCodeAndReason
}
