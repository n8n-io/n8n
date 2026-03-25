'use strict'

/**
 * This is a Globally Unique Identifier unique used to validate that the
 * endpoint accepts websocket connections.
 * @see https://www.rfc-editor.org/rfc/rfc6455.html#section-1.3
 * @type {'258EAFA5-E914-47DA-95CA-C5AB0DC85B11'}
 */
const uid = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

/**
 * @type {PropertyDescriptor}
 */
const staticPropertyDescriptors = {
  enumerable: true,
  writable: false,
  configurable: false
}

/**
 * The states of the WebSocket connection.
 *
 * @readonly
 * @enum
 * @property {0} CONNECTING
 * @property {1} OPEN
 * @property {2} CLOSING
 * @property {3} CLOSED
 */
const states = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}

/**
 * @readonly
 * @enum
 * @property {0} NOT_SENT
 * @property {1} PROCESSING
 * @property {2} SENT
 */
const sentCloseFrameState = {
  SENT: 1,
  RECEIVED: 2
}

/**
 * The WebSocket opcodes.
 *
 * @readonly
 * @enum
 * @property {0x0} CONTINUATION
 * @property {0x1} TEXT
 * @property {0x2} BINARY
 * @property {0x8} CLOSE
 * @property {0x9} PING
 * @property {0xA} PONG
 * @see https://datatracker.ietf.org/doc/html/rfc6455#section-5.2
 */
const opcodes = {
  CONTINUATION: 0x0,
  TEXT: 0x1,
  BINARY: 0x2,
  CLOSE: 0x8,
  PING: 0x9,
  PONG: 0xA
}

/**
 * The maximum value for an unsigned 16-bit integer.
 *
 * @type {65535} 2 ** 16 - 1
 */
const maxUnsigned16Bit = 65535

/**
 * The states of the parser.
 *
 * @readonly
 * @enum
 * @property {0} INFO
 * @property {2} PAYLOADLENGTH_16
 * @property {3} PAYLOADLENGTH_64
 * @property {4} READ_DATA
 */
const parserStates = {
  INFO: 0,
  PAYLOADLENGTH_16: 2,
  PAYLOADLENGTH_64: 3,
  READ_DATA: 4
}

/**
 * An empty buffer.
 *
 * @type {Buffer}
 */
const emptyBuffer = Buffer.allocUnsafe(0)

/**
 * @readonly
 * @property {1} text
 * @property {2} typedArray
 * @property {3} arrayBuffer
 * @property {4} blob
 */
const sendHints = {
  text: 1,
  typedArray: 2,
  arrayBuffer: 3,
  blob: 4
}

module.exports = {
  uid,
  sentCloseFrameState,
  staticPropertyDescriptors,
  states,
  opcodes,
  maxUnsigned16Bit,
  parserStates,
  emptyBuffer,
  sendHints
}
