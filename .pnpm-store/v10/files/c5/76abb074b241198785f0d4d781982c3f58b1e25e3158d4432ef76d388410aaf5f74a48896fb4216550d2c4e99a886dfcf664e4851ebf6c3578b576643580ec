'use strict'

const { kReadyState, kController, kResponse, kBinaryType, kWebSocketURL } = require('./symbols')
const { states, opcodes } = require('./constants')
const { ErrorEvent, createFastMessageEvent } = require('./events')
const { isUtf8 } = require('node:buffer')
const { collectASequenceOfCodePointsFast, removeHTTPWhitespace } = require('../fetch/data-url')

/* globals Blob */

/**
 * @param {import('./websocket').WebSocket} ws
 * @returns {boolean}
 */
function isConnecting (ws) {
  // If the WebSocket connection is not yet established, and the connection
  // is not yet closed, then the WebSocket connection is in the CONNECTING state.
  return ws[kReadyState] === states.CONNECTING
}

/**
 * @param {import('./websocket').WebSocket} ws
 * @returns {boolean}
 */
function isEstablished (ws) {
  // If the server's response is validated as provided for above, it is
  // said that _The WebSocket Connection is Established_ and that the
  // WebSocket Connection is in the OPEN state.
  return ws[kReadyState] === states.OPEN
}

/**
 * @param {import('./websocket').WebSocket} ws
 * @returns {boolean}
 */
function isClosing (ws) {
  // Upon either sending or receiving a Close control frame, it is said
  // that _The WebSocket Closing Handshake is Started_ and that the
  // WebSocket connection is in the CLOSING state.
  return ws[kReadyState] === states.CLOSING
}

/**
 * @param {import('./websocket').WebSocket} ws
 * @returns {boolean}
 */
function isClosed (ws) {
  return ws[kReadyState] === states.CLOSED
}

/**
 * @see https://dom.spec.whatwg.org/#concept-event-fire
 * @param {string} e
 * @param {EventTarget} target
 * @param {(...args: ConstructorParameters<typeof Event>) => Event} eventFactory
 * @param {EventInit | undefined} eventInitDict
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
 * @param {import('./websocket').WebSocket} ws
 * @param {number} type Opcode
 * @param {Buffer} data application data
 */
function websocketMessageReceived (ws, type, data) {
  // 1. If ready state is not OPEN (1), then return.
  if (ws[kReadyState] !== states.OPEN) {
    return
  }

  // 2. Let dataForEvent be determined by switching on type and binary type:
  let dataForEvent

  if (type === opcodes.TEXT) {
    // -> type indicates that the data is Text
    //      a new DOMString containing data
    try {
      dataForEvent = utf8Decode(data)
    } catch {
      failWebsocketConnection(ws, 'Received invalid UTF-8 in text frame.')
      return
    }
  } else if (type === opcodes.BINARY) {
    if (ws[kBinaryType] === 'blob') {
      // -> type indicates that the data is Binary and binary type is "blob"
      //      a new Blob object, created in the relevant Realm of the WebSocket
      //      object, that represents data as its raw data
      dataForEvent = new Blob([data])
    } else {
      // -> type indicates that the data is Binary and binary type is "arraybuffer"
      //      a new ArrayBuffer object, created in the relevant Realm of the
      //      WebSocket object, whose contents are data
      dataForEvent = toArrayBuffer(data)
    }
  }

  // 3. Fire an event named message at the WebSocket object, using MessageEvent,
  //    with the origin attribute initialized to the serialization of the WebSocket
  //    object’s url's origin, and the data attribute initialized to dataForEvent.
  fireEvent('message', ws, createFastMessageEvent, {
    origin: ws[kWebSocketURL].origin,
    data: dataForEvent
  })
}

function toArrayBuffer (buffer) {
  if (buffer.byteLength === buffer.buffer.byteLength) {
    return buffer.buffer
  }
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc6455
 * @see https://datatracker.ietf.org/doc/html/rfc2616
 * @see https://bugs.chromium.org/p/chromium/issues/detail?id=398407
 * @param {string} protocol
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
 * @param {import('./websocket').WebSocket} ws
 * @param {string|undefined} reason
 */
function failWebsocketConnection (ws, reason) {
  const { [kController]: controller, [kResponse]: response } = ws

  controller.abort()

  if (response?.socket && !response.socket.destroyed) {
    response.socket.destroy()
  }

  if (reason) {
    // TODO: process.nextTick
    fireEvent('error', ws, (type, init) => new ErrorEvent(type, init), {
      error: new Error(reason),
      message: reason
    })
  }
}

/**
 * @see https://datatracker.ietf.org/doc/html/rfc6455#section-5.5
 * @param {number} opcode
 */
function isControlFrame (opcode) {
  return (
    opcode === opcodes.CLOSE ||
    opcode === opcodes.PING ||
    opcode === opcodes.PONG
  )
}

function isContinuationFrame (opcode) {
  return opcode === opcodes.CONTINUATION
}

function isTextBinaryFrame (opcode) {
  return opcode === opcodes.TEXT || opcode === opcodes.BINARY
}

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
    const [name, value = ''] = pair.split('=')

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

// https://nodejs.org/api/intl.html#detecting-internationalization-support
const hasIntl = typeof process.versions.icu === 'string'
const fatalDecoder = hasIntl ? new TextDecoder('utf-8', { fatal: true }) : undefined

/**
 * Converts a Buffer to utf-8, even on platforms without icu.
 * @param {Buffer} buffer
 */
const utf8Decode = hasIntl
  ? fatalDecoder.decode.bind(fatalDecoder)
  : function (buffer) {
    if (isUtf8(buffer)) {
      return buffer.toString('utf-8')
    }
    throw new TypeError('Invalid utf-8 received.')
  }

module.exports = {
  isConnecting,
  isEstablished,
  isClosing,
  isClosed,
  fireEvent,
  isValidSubprotocol,
  isValidStatusCode,
  failWebsocketConnection,
  websocketMessageReceived,
  utf8Decode,
  isControlFrame,
  isContinuationFrame,
  isTextBinaryFrame,
  isValidOpcode,
  parseExtensions,
  isValidClientWindowBits
}
