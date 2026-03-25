'use strict'

const { webidl } = require('../fetch/webidl')
const { URLSerializer } = require('../fetch/data-url')
const { environmentSettingsObject } = require('../fetch/util')
const { staticPropertyDescriptors, states, sentCloseFrameState, sendHints } = require('./constants')
const {
  kWebSocketURL,
  kReadyState,
  kController,
  kBinaryType,
  kResponse,
  kSentClose,
  kByteParser
} = require('./symbols')
const {
  isConnecting,
  isEstablished,
  isClosing,
  isValidSubprotocol,
  fireEvent
} = require('./util')
const { establishWebSocketConnection, closeWebSocketConnection } = require('./connection')
const { ByteParser } = require('./receiver')
const { kEnumerableProperty, isBlobLike } = require('../../core/util')
const { getGlobalDispatcher } = require('../../global')
const { types } = require('node:util')
const { ErrorEvent, CloseEvent } = require('./events')
const { SendQueue } = require('./sender')

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

  /** @type {SendQueue} */
  #sendQueue

  /**
   * @param {string} url
   * @param {string|string[]} protocols
   */
  constructor (url, protocols = []) {
    super()

    webidl.util.markAsUncloneable(this)

    const prefix = 'WebSocket constructor'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    const options = webidl.converters['DOMString or sequence<DOMString> or WebSocketInit'](protocols, prefix, 'options')

    url = webidl.converters.USVString(url, prefix, 'url')
    protocols = options.protocols

    // 1. Let baseURL be this's relevant settings object's API base URL.
    const baseURL = environmentSettingsObject.settingsObject.baseUrl

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
    const client = environmentSettingsObject.settingsObject

    // 12. Run this step in parallel:

    //    1. Establish a WebSocket connection given urlRecord, protocols,
    //       and client.
    this[kController] = establishWebSocketConnection(
      urlRecord,
      protocols,
      client,
      this,
      (response, extensions) => this.#onConnectionEstablished(response, extensions),
      options
    )

    // Each WebSocket object has an associated ready state, which is a
    // number representing the state of the connection. Initially it must
    // be CONNECTING (0).
    this[kReadyState] = WebSocket.CONNECTING

    this[kSentClose] = sentCloseFrameState.NOT_SENT

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

    const prefix = 'WebSocket.close'

    if (code !== undefined) {
      code = webidl.converters['unsigned short'](code, prefix, 'code', { clamp: true })
    }

    if (reason !== undefined) {
      reason = webidl.converters.USVString(reason, prefix, 'reason')
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
    closeWebSocketConnection(this, code, reason, reasonByteLength)
  }

  /**
   * @see https://websockets.spec.whatwg.org/#dom-websocket-send
   * @param {NodeJS.TypedArray|ArrayBuffer|Blob|string} data
   */
  send (data) {
    webidl.brandCheck(this, WebSocket)

    const prefix = 'WebSocket.send'
    webidl.argumentLengthCheck(arguments, 1, prefix)

    data = webidl.converters.WebSocketSendData(data, prefix, 'data')

    // 1. If this's ready state is CONNECTING, then throw an
    //    "InvalidStateError" DOMException.
    if (isConnecting(this)) {
      throw new DOMException('Sent before connected.', 'InvalidStateError')
    }

    // 2. Run the appropriate set of steps from the following list:
    // https://datatracker.ietf.org/doc/html/rfc6455#section-6.1
    // https://datatracker.ietf.org/doc/html/rfc6455#section-5.2

    if (!isEstablished(this) || isClosing(this)) {
      return
    }

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

      const length = Buffer.byteLength(data)

      this.#bufferedAmount += length
      this.#sendQueue.add(data, () => {
        this.#bufferedAmount -= length
      }, sendHints.string)
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

      this.#bufferedAmount += data.byteLength
      this.#sendQueue.add(data, () => {
        this.#bufferedAmount -= data.byteLength
      }, sendHints.arrayBuffer)
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

      this.#bufferedAmount += data.byteLength
      this.#sendQueue.add(data, () => {
        this.#bufferedAmount -= data.byteLength
      }, sendHints.typedArray)
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

      this.#bufferedAmount += data.size
      this.#sendQueue.add(data, () => {
        this.#bufferedAmount -= data.size
      }, sendHints.blob)
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
  #onConnectionEstablished (response, parsedExtensions) {
    // processResponse is called when the "response’s header list has been received and initialized."
    // once this happens, the connection is open
    this[kResponse] = response

    const parser = new ByteParser(this, parsedExtensions)
    parser.on('drain', onParserDrain)
    parser.on('error', onParserError.bind(this))

    response.socket.ws = this
    this[kByteParser] = parser

    this.#sendQueue = new SendQueue(response.socket)

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

webidl.converters['DOMString or sequence<DOMString>'] = function (V, prefix, argument) {
  if (webidl.util.Type(V) === 'Object' && Symbol.iterator in V) {
    return webidl.converters['sequence<DOMString>'](V)
  }

  return webidl.converters.DOMString(V, prefix, argument)
}

// This implements the proposal made in https://github.com/whatwg/websockets/issues/42
webidl.converters.WebSocketInit = webidl.dictionaryConverter([
  {
    key: 'protocols',
    converter: webidl.converters['DOMString or sequence<DOMString>'],
    defaultValue: () => new Array(0)
  },
  {
    key: 'dispatcher',
    converter: webidl.converters.any,
    defaultValue: () => getGlobalDispatcher()
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

    if (ArrayBuffer.isView(V) || types.isArrayBuffer(V)) {
      return webidl.converters.BufferSource(V)
    }
  }

  return webidl.converters.USVString(V)
}

function onParserDrain () {
  this.ws[kResponse].socket.resume()
}

function onParserError (err) {
  let message
  let code

  if (err instanceof CloseEvent) {
    message = err.reason
    code = err.code
  } else {
    message = err.message
  }

  fireEvent('error', this, () => new ErrorEvent('error', { error: err, message }))

  closeWebSocketConnection(this, code)
}

module.exports = {
  WebSocket
}
