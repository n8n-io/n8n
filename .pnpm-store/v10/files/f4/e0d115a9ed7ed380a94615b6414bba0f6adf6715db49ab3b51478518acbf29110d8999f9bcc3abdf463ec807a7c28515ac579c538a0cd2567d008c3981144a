'use strict'

const { webidl } = require('../fetch/webidl')
const { DOMException } = require('../fetch/constants')
const { URLSerializer } = require('../fetch/dataURL')
const { getGlobalOrigin } = require('../fetch/global')
const { staticPropertyDescriptors, states, opcodes, emptyBuffer } = require('./constants')
const {
  kWebSocketURL,
  kReadyState,
  kController,
  kBinaryType,
  kResponse,
  kSentClose,
  kByteParser
} = require('./symbols')
const { isEstablished, isClosing, isValidSubprotocol, failWebsocketConnection, fireEvent } = require('./util')
const { establishWebSocketConnection } = require('./connection')
const { WebsocketFrameSend } = require('./frame')
const { ByteParser } = require('./receiver')
const { kEnumerableProperty, isBlobLike } = require('../core/util')
const { getGlobalDispatcher } = require('../global')
const { types } = require('util')

let experimentalWarned = false

// https://websockets.spec.whatwg.org/#interface-definition
class WebSocket extends EventTarget {
  #events = {
    open: null,
    error: null,
    close: null,
    message: null
  }

  #bufferedAmount = 0
  #protocol = ''
  #extensions = ''

  /**
   * @param {string} url
   * @param {string|string[]} protocols
   */
  constructor (url, protocols = []) {
    super()

    webidl.argumentLengthCheck(arguments, 1, { header: 'WebSocket constructor' })

    if (!experimentalWarned) {
      experimentalWarned = true
      process.emitWarning('WebSockets are experimental, expect them to change at any time.', {
        code: 'UNDICI-WS'
      })
    }

    const options = webidl.converters['DOMString or sequence<DOMString> or WebSocketInit'](protocols)

    url = webidl.converters.USVString(url)
    protocols = options.protocols

    // 1. Let baseURL be this's relevant settings object's API base URL.
    const baseURL = getGlobalOrigin()

    // 1. Let urlRecord be the result of applying the URL parser to url with baseURL.
    let urlRecord

    try {
      urlRecord = new URL(url, baseURL)
    } catch (e) {
      // 3. If urlRecord is failure, then throw a "SyntaxError" DOMException.
      throw new DOMException(e, 'SyntaxError')
    }

    // 4. If urlRecord’s scheme is "http", then set urlRecord’s scheme to "ws".
    if (urlRecord.protocol === 'http:') {
      urlRecord.protocol = 'ws:'
    } else if (urlRecord.protocol === 'https:') {
      // 5. Otherwise, if urlRecord’s scheme is "https", set urlRecord’s scheme to "wss".
      urlRecord.protocol = 'wss:'
    }

    // 6. If urlRecord’s scheme is not "ws" or "wss", then throw a "SyntaxError" DOMException.
    if (urlRecord.protocol !== 'ws:' && urlRecord.protocol !== 'wss:') {
      throw new DOMException(
        `Expected a ws: or wss: protocol, got ${urlRecord.protocol}`,
        'SyntaxError'
      )
    }

    // 7. If urlRecord’s fragment is non-null, then throw a "SyntaxError"
    //    DOMException.
    if (urlRecord.hash || urlRecord.href.endsWith('#')) {
      throw new DOMException('Got fragment', 'SyntaxError')
    }

    // 8. If protocols is a string, set protocols to a sequence consisting
    //    of just that string.
    if (typeof protocols === 'string') {
      protocols = [protocols]
    }

    // 9. If any of the values in protocols occur more than once or otherwise
    //    fail to match the requirements for elements that comprise the value
    //    of `Sec-WebSocket-Protocol` fields as defined by The WebSocket
    //    protocol, then throw a "SyntaxError" DOMException.
    if (protocols.length !== new Set(protocols.map(p => p.toLowerCase())).size) {
      throw new DOMException('Invalid Sec-WebSocket-Protocol value', 'SyntaxError')
    }

    if (protocols.length > 0 && !protocols.every(p => isValidSubprotocol(p))) {
      throw new DOMException('Invalid Sec-WebSocket-Protocol value', 'SyntaxError')
    }

    // 10. Set this's url to urlRecord.
    this[kWebSocketURL] = new URL(urlRecord.href)

    // 11. Let client be this's relevant settings object.

    // 12. Run this step in parallel:

    //    1. Establish a WebSocket connection given urlRecord, protocols,
    //       and client.
    this[kController] = establishWebSocketConnection(
      urlRecord,
      protocols,
      this,
      (response) => this.#onConnectionEstablished(response),
      options
    )

    // Each WebSocket object has an associated ready state, which is a
    // number representing the state of the connection. Initially it must
    // be CONNECTING (0).
    this[kReadyState] = WebSocket.CONNECTING

    // The extensions attribute must initially return the empty string.

    // The protocol attribute must initially return the empty string.

    // Each WebSocket object has an associated binary type, which is a
    // BinaryType. Initially it must be "blob".
    this[kBinaryType] = 'blob'
  }

  /**
   * @see https://websockets.spec.whatwg.org/#dom-websocket-close
   * @param {number|undefined} code
   * @param {string|undefined} reason
   */
  close (code = undefined, reason = undefined) {
    webidl.brandCheck(this, WebSocket)

    if (code !== undefined) {
      code = webidl.converters['unsigned short'](code, { clamp: true })
    }

    if (reason !== undefined) {
      reason = webidl.converters.USVString(reason)
    }

    // 1. If code is present, but is neither an integer equal to 1000 nor an
    //    integer in the range 3000 to 4999, inclusive, throw an
    //    "InvalidAccessError" DOMException.
    if (code !== undefined) {
      if (code !== 1000 && (code < 3000 || code > 4999)) {
        throw new DOMException('invalid code', 'InvalidAccessError')
      }
    }

    let reasonByteLength = 0

    // 2. If reason is present, then run these substeps:
    if (reason !== undefined) {
      // 1. Let reasonBytes be the result of encoding reason.
      // 2. If reasonBytes is longer than 123 bytes, then throw a
      //    "SyntaxError" DOMException.
      reasonByteLength = Buffer.byteLength(reason)

      if (reasonByteLength > 123) {
        throw new DOMException(
          `Reason must be less than 123 bytes; received ${reasonByteLength}`,
          'SyntaxError'
        )
      }
    }

    // 3. Run the first matching steps from the following list:
    if (this[kReadyState] === WebSocket.CLOSING || this[kReadyState] === WebSocket.CLOSED) {
      // If this's ready state is CLOSING (2) or CLOSED (3)
      // Do nothing.
    } else if (!isEstablished(this)) {
      // If the WebSocket connection is not yet established
      // Fail the WebSocket connection and set this's ready state
      // to CLOSING (2).
      failWebsocketConnection(this, 'Connection was closed before it was established.')
      this[kReadyState] = WebSocket.CLOSING
    } else if (!isClosing(this)) {
      // If the WebSocket closing handshake has not yet been started
      // Start the WebSocket closing handshake and set this's ready
      // state to CLOSING (2).
      // - If neither code nor reason is present, the WebSocket Close
      //   message must not have a body.
      // - If code is present, then the status code to use in the
      //   WebSocket Close message must be the integer given by code.
      // - If reason is also present, then reasonBytes must be
      //   provided in the Close message after the status code.

      const frame = new WebsocketFrameSend()

      // If neither code nor reason is present, the WebSocket Close
      // message must not have a body.

      // If code is present, then the status code to use in the
      // WebSocket Close message must be the integer given by code.
      if (code !== undefined && reason === undefined) {
        frame.frameData = Buffer.allocUnsafe(2)
        frame.frameData.writeUInt16BE(code, 0)
      } else if (code !== undefined && reason !== undefined) {
        // If reason is also present, then reasonBytes must be
        // provided in the Close message after the status code.
        frame.frameData = Buffer.allocUnsafe(2 + reasonByteLength)
        frame.frameData.writeUInt16BE(code, 0)
        // the body MAY contain UTF-8-encoded data with value /reason/
        frame.frameData.write(reason, 2, 'utf-8')
      } else {
        frame.frameData = emptyBuffer
      }

      /** @type {import('stream').Duplex} */
      const socket = this[kResponse].socket

      socket.write(frame.createFrame(opcodes.CLOSE), (err) => {
        if (!err) {
          this[kSentClose] = true
        }
      })

      // Upon either sending or receiving a Close control frame, it is said
      // that _The WebSocket Closing Handshake is Started_ and that the
      // WebSocket connection is in the CLOSING state.
      this[kReadyState] = states.CLOSING
    } else {
      // Otherwise
      // Set this's ready state to CLOSING (2).
      this[kReadyState] = WebSocket.CLOSING
    }
  }

  /**
   * @see https://websockets.spec.whatwg.org/#dom-websocket-send
   * @param {NodeJS.TypedArray|ArrayBuffer|Blob|string} data
   */
  send (data) {
    webidl.brandCheck(this, WebSocket)

    webidl.argumentLengthCheck(arguments, 1, { header: 'WebSocket.send' })

    data = webidl.converters.WebSocketSendData(data)

    // 1. If this's ready state is CONNECTING, then throw an
    //    "InvalidStateError" DOMException.
    if (this[kReadyState] === WebSocket.CONNECTING) {
      throw new DOMException('Sent before connected.', 'InvalidStateError')
    }

    // 2. Run the appropriate set of steps from the following list:
    // https://datatracker.ietf.org/doc/html/rfc6455#section-6.1
    // https://datatracker.ietf.org/doc/html/rfc6455#section-5.2

    if (!isEstablished(this) || isClosing(this)) {
      return
    }

    /** @type {import('stream').Duplex} */
    const socket = this[kResponse].socket

    // If data is a string
    if (typeof data === 'string') {
      // If the WebSocket connection is established and the WebSocket
      // closing handshake has not yet started, then the user agent
      // must send a WebSocket Message comprised of the data argument
      // using a text frame opcode; if the data cannot be sent, e.g.
      // because it would need to be buffered but the buffer is full,
      // the user agent must flag the WebSocket as full and then close
      // the WebSocket connection. Any invocation of this method with a
      // string argument that does not throw an exception must increase
      // the bufferedAmount attribute by the number of bytes needed to
      // express the argument as UTF-8.

      const value = Buffer.from(data)
      const frame = new WebsocketFrameSend(value)
      const buffer = frame.createFrame(opcodes.TEXT)

      this.#bufferedAmount += value.byteLength
      socket.write(buffer, () => {
        this.#bufferedAmount -= value.byteLength
      })
    } else if (types.isArrayBuffer(data)) {
      // If the WebSocket connection is established, and the WebSocket
      // closing handshake has not yet started, then the user agent must
      // send a WebSocket Message comprised of data using a binary frame
      // opcode; if the data cannot be sent, e.g. because it would need
      // to be buffered but the buffer is full, the user agent must flag
      // the WebSocket as full and then close the WebSocket connection.
      // The data to be sent is the data stored in the buffer described
      // by the ArrayBuffer object. Any invocation of this method with an
      // ArrayBuffer argument that does not throw an exception must
      // increase the bufferedAmount attribute by the length of the
      // ArrayBuffer in bytes.

      const value = Buffer.from(data)
      const frame = new WebsocketFrameSend(value)
      const buffer = frame.createFrame(opcodes.BINARY)

      this.#bufferedAmount += value.byteLength
      socket.write(buffer, () => {
        this.#bufferedAmount -= value.byteLength
      })
    } else if (ArrayBuffer.isView(data)) {
      // If the WebSocket connection is established, and the WebSocket
      // closing handshake has not yet started, then the user agent must
      // send a WebSocket Message comprised of data using a binary frame
      // opcode; if the data cannot be sent, e.g. because it would need to
      // be buffered but the buffer is full, the user agent must flag the
      // WebSocket as full and then close the WebSocket connection. The
      // data to be sent is the data stored in the section of the buffer
      // described by the ArrayBuffer object that data references. Any
      // invocation of this method with this kind of argument that does
      // not throw an exception must increase the bufferedAmount attribute
      // by the length of data’s buffer in bytes.

      const ab = Buffer.from(data, data.byteOffset, data.byteLength)

      const frame = new WebsocketFrameSend(ab)
      const buffer = frame.createFrame(opcodes.BINARY)

      this.#bufferedAmount += ab.byteLength
      socket.write(buffer, () => {
        this.#bufferedAmount -= ab.byteLength
      })
    } else if (isBlobLike(data)) {
      // If the WebSocket connection is established, and the WebSocket
      // closing handshake has not yet started, then the user agent must
      // send a WebSocket Message comprised of data using a binary frame
      // opcode; if the data cannot be sent, e.g. because it would need to
      // be buffered but the buffer is full, the user agent must flag the
      // WebSocket as full and then close the WebSocket connection. The data
      // to be sent is the raw data represented by the Blob object. Any
      // invocation of this method with a Blob argument that does not throw
      // an exception must increase the bufferedAmount attribute by the size
      // of the Blob object’s raw data, in bytes.

      const frame = new WebsocketFrameSend()

      data.arrayBuffer().then((ab) => {
        const value = Buffer.from(ab)
        frame.frameData = value
        const buffer = frame.createFrame(opcodes.BINARY)

        this.#bufferedAmount += value.byteLength
        socket.write(buffer, () => {
          this.#bufferedAmount -= value.byteLength
        })
      })
    }
  }

  get readyState () {
    webidl.brandCheck(this, WebSocket)

    // The readyState getter steps are to return this's ready state.
    return this[kReadyState]
  }

  get bufferedAmount () {
    webidl.brandCheck(this, WebSocket)

    return this.#bufferedAmount
  }

  get url () {
    webidl.brandCheck(this, WebSocket)

    // The url getter steps are to return this's url, serialized.
    return URLSerializer(this[kWebSocketURL])
  }

  get extensions () {
    webidl.brandCheck(this, WebSocket)

    return this.#extensions
  }

  get protocol () {
    webidl.brandCheck(this, WebSocket)

    return this.#protocol
  }

  get onopen () {
    webidl.brandCheck(this, WebSocket)

    return this.#events.open
  }

  set onopen (fn) {
    webidl.brandCheck(this, WebSocket)

    if (this.#events.open) {
      this.removeEventListener('open', this.#events.open)
    }

    if (typeof fn === 'function') {
      this.#events.open = fn
      this.addEventListener('open', fn)
    } else {
      this.#events.open = null
    }
  }

  get onerror () {
    webidl.brandCheck(this, WebSocket)

    return this.#events.error
  }

  set onerror (fn) {
    webidl.brandCheck(this, WebSocket)

    if (this.#events.error) {
      this.removeEventListener('error', this.#events.error)
    }

    if (typeof fn === 'function') {
      this.#events.error = fn
      this.addEventListener('error', fn)
    } else {
      this.#events.error = null
    }
  }

  get onclose () {
    webidl.brandCheck(this, WebSocket)

    return this.#events.close
  }

  set onclose (fn) {
    webidl.brandCheck(this, WebSocket)

    if (this.#events.close) {
      this.removeEventListener('close', this.#events.close)
    }

    if (typeof fn === 'function') {
      this.#events.close = fn
      this.addEventListener('close', fn)
    } else {
      this.#events.close = null
    }
  }

  get onmessage () {
    webidl.brandCheck(this, WebSocket)

    return this.#events.message
  }

  set onmessage (fn) {
    webidl.brandCheck(this, WebSocket)

    if (this.#events.message) {
      this.removeEventListener('message', this.#events.message)
    }

    if (typeof fn === 'function') {
      this.#events.message = fn
      this.addEventListener('message', fn)
    } else {
      this.#events.message = null
    }
  }

  get binaryType () {
    webidl.brandCheck(this, WebSocket)

    return this[kBinaryType]
  }

  set binaryType (type) {
    webidl.brandCheck(this, WebSocket)

    if (type !== 'blob' && type !== 'arraybuffer') {
      this[kBinaryType] = 'blob'
    } else {
      this[kBinaryType] = type
    }
  }

  /**
   * @see https://websockets.spec.whatwg.org/#feedback-from-the-protocol
   */
  #onConnectionEstablished (response) {
    // processResponse is called when the "response’s header list has been received and initialized."
    // once this happens, the connection is open
    this[kResponse] = response

    const parser = new ByteParser(this)
    parser.on('drain', function onParserDrain () {
      this.ws[kResponse].socket.resume()
    })

    response.socket.ws = this
    this[kByteParser] = parser

    // 1. Change the ready state to OPEN (1).
    this[kReadyState] = states.OPEN

    // 2. Change the extensions attribute’s value to the extensions in use, if
    //    it is not the null value.
    // https://datatracker.ietf.org/doc/html/rfc6455#section-9.1
    const extensions = response.headersList.get('sec-websocket-extensions')

    if (extensions !== null) {
      this.#extensions = extensions
    }

    // 3. Change the protocol attribute’s value to the subprotocol in use, if
    //    it is not the null value.
    // https://datatracker.ietf.org/doc/html/rfc6455#section-1.9
    const protocol = response.headersList.get('sec-websocket-protocol')

    if (protocol !== null) {
      this.#protocol = protocol
    }

    // 4. Fire an event named open at the WebSocket object.
    fireEvent('open', this)
  }
}

// https://websockets.spec.whatwg.org/#dom-websocket-connecting
WebSocket.CONNECTING = WebSocket.prototype.CONNECTING = states.CONNECTING
// https://websockets.spec.whatwg.org/#dom-websocket-open
WebSocket.OPEN = WebSocket.prototype.OPEN = states.OPEN
// https://websockets.spec.whatwg.org/#dom-websocket-closing
WebSocket.CLOSING = WebSocket.prototype.CLOSING = states.CLOSING
// https://websockets.spec.whatwg.org/#dom-websocket-closed
WebSocket.CLOSED = WebSocket.prototype.CLOSED = states.CLOSED

Object.defineProperties(WebSocket.prototype, {
  CONNECTING: staticPropertyDescriptors,
  OPEN: staticPropertyDescriptors,
  CLOSING: staticPropertyDescriptors,
  CLOSED: staticPropertyDescriptors,
  url: kEnumerableProperty,
  readyState: kEnumerableProperty,
  bufferedAmount: kEnumerableProperty,
  onopen: kEnumerableProperty,
  onerror: kEnumerableProperty,
  onclose: kEnumerableProperty,
  close: kEnumerableProperty,
  onmessage: kEnumerableProperty,
  binaryType: kEnumerableProperty,
  send: kEnumerableProperty,
  extensions: kEnumerableProperty,
  protocol: kEnumerableProperty,
  [Symbol.toStringTag]: {
    value: 'WebSocket',
    writable: false,
    enumerable: false,
    configurable: true
  }
})

Object.defineProperties(WebSocket, {
  CONNECTING: staticPropertyDescriptors,
  OPEN: staticPropertyDescriptors,
  CLOSING: staticPropertyDescriptors,
  CLOSED: staticPropertyDescriptors
})

webidl.converters['sequence<DOMString>'] = webidl.sequenceConverter(
  webidl.converters.DOMString
)

webidl.converters['DOMString or sequence<DOMString>'] = function (V) {
  if (webidl.util.Type(V) === 'Object' && Symbol.iterator in V) {
    return webidl.converters['sequence<DOMString>'](V)
  }

  return webidl.converters.DOMString(V)
}

// This implements the propsal made in https://github.com/whatwg/websockets/issues/42
webidl.converters.WebSocketInit = webidl.dictionaryConverter([
  {
    key: 'protocols',
    converter: webidl.converters['DOMString or sequence<DOMString>'],
    get defaultValue () {
      return []
    }
  },
  {
    key: 'dispatcher',
    converter: (V) => V,
    get defaultValue () {
      return getGlobalDispatcher()
    }
  },
  {
    key: 'headers',
    converter: webidl.nullableConverter(webidl.converters.HeadersInit)
  }
])

webidl.converters['DOMString or sequence<DOMString> or WebSocketInit'] = function (V) {
  if (webidl.util.Type(V) === 'Object' && !(Symbol.iterator in V)) {
    return webidl.converters.WebSocketInit(V)
  }

  return { protocols: webidl.converters['DOMString or sequence<DOMString>'](V) }
}

webidl.converters.WebSocketSendData = function (V) {
  if (webidl.util.Type(V) === 'Object') {
    if (isBlobLike(V)) {
      return webidl.converters.Blob(V, { strict: false })
    }

    if (ArrayBuffer.isView(V) || types.isAnyArrayBuffer(V)) {
      return webidl.converters.BufferSource(V)
    }
  }

  return webidl.converters.USVString(V)
}

module.exports = {
  WebSocket
}
