'use strict'

const { isArrayBuffer } = require('node:util/types')
const { webidl } = require('../webidl')
const { URLSerializer } = require('../fetch/data-url')
const { environmentSettingsObject } = require('../fetch/util')
const { staticPropertyDescriptors, states, sentCloseFrameState, sendHints, opcodes } = require('./constants')
const {
  isConnecting,
  isEstablished,
  isClosing,
  isClosed,
  isValidSubprotocol,
  fireEvent,
  utf8Decode,
  toArrayBuffer,
  getURLRecord
} = require('./util')
const { establishWebSocketConnection, closeWebSocketConnection, failWebsocketConnection } = require('./connection')
const { ByteParser } = require('./receiver')
const { kEnumerableProperty } = require('../../core/util')
const { getGlobalDispatcher } = require('../../global')
const { ErrorEvent, CloseEvent, createFastMessageEvent } = require('./events')
const { SendQueue } = require('./sender')
const { WebsocketFrameSend } = require('./frame')
const { channels } = require('../../core/diagnostics')

/**
 * @typedef {object} Handler
 * @property {(response: any, extensions?: string[]) => void} onConnectionEstablished
 * @property {(opcode: number, data: Buffer) => void} onMessage
 * @property {(error: Error) => void} onParserError
 * @property {() => void} onParserDrain
 * @property {(chunk: Buffer) => void} onSocketData
 * @property {(err: Error) => void} onSocketError
 * @property {() => void} onSocketClose
 * @property {(body: Buffer) => void} onPing
 * @property {(body: Buffer) => void} onPong
 *
 * @property {number} readyState
 * @property {import('stream').Duplex} socket
 * @property {Set<number>} closeState
 * @property {import('../fetch/index').Fetch} controller
 * @property {boolean} [wasEverConnected=false]
 */

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

  /** @type {Handler} */
  #handler = {
    onConnectionEstablished: (response, extensions) => this.#onConnectionEstablished(response, extensions),
    onMessage: (opcode, data) => this.#onMessage(opcode, data),
    onParserError: (err) => failWebsocketConnection(this.#handler, null, err.message),
    onParserDrain: () => this.#onParserDrain(),
    onSocketData: (chunk) => {
      if (!this.#parser.write(chunk)) {
        this.#handler.socket.pause()
      }
    },
    onSocketError: (err) => {
      this.#handler.readyState = states.CLOSING

      if (channels.socketError.hasSubscribers) {
        channels.socketError.publish(err)
      }

      this.#handler.socket.destroy()
    },
    onSocketClose: () => this.#onSocketClose(),
    onPing: (body) => {
      if (channels.ping.hasSubscribers) {
        channels.ping.publish({
          payload: body,
          websocket: this
        })
      }
    },
    onPong: (body) => {
      if (channels.pong.hasSubscribers) {
        channels.pong.publish({
          payload: body,
          websocket: this
        })
      }
    },

    readyState: states.CONNECTING,
    socket: null,
    closeState: new Set(),
    controller: null,
    wasEverConnected: false
  }

  #url
  #binaryType
  /** @type {import('./receiver').ByteParser} */
  #parser

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

    url = webidl.converters.USVString(url)
    protocols = options.protocols

    // 1. Let baseURL be this's relevant settings object's API base URL.
    const baseURL = environmentSettingsObject.settingsObject.baseUrl

    // 2. Let urlRecord be the result of getting a URL record given url and baseURL.
    const urlRecord = getURLRecord(url, baseURL)

    // 3. If protocols is a string, set protocols to a sequence consisting
    //    of just that string.
    if (typeof protocols === 'string') {
      protocols = [protocols]
    }

    // 4. If any of the values in protocols occur more than once or otherwise
    //    fail to match the requirements for elements that comprise the value
    //    of `Sec-WebSocket-Protocol` fields as defined by The WebSocket
    //    protocol, then throw a "SyntaxError" DOMException.
    if (protocols.length !== new Set(protocols.map(p => p.toLowerCase())).size) {
      throw new DOMException('Invalid Sec-WebSocket-Protocol value', 'SyntaxError')
    }

    if (protocols.length > 0 && !protocols.every(p => isValidSubprotocol(p))) {
      throw new DOMException('Invalid Sec-WebSocket-Protocol value', 'SyntaxError')
    }

    // 5. Set this's url to urlRecord.
    this.#url = new URL(urlRecord.href)

    // 6. Let client be this's relevant settings object.
    const client = environmentSettingsObject.settingsObject

    // 7. Run this step in parallel:
    // 7.1. Establish a WebSocket connection given urlRecord, protocols,
    //      and client.
    this.#handler.controller = establishWebSocketConnection(
      urlRecord,
      protocols,
      client,
      this.#handler,
      options
    )

    // Each WebSocket object has an associated ready state, which is a
    // number representing the state of the connection. Initially it must
    // be CONNECTING (0).
    this.#handler.readyState = WebSocket.CONNECTING

    // The extensions attribute must initially return the empty string.

    // The protocol attribute must initially return the empty string.

    // Each WebSocket object has an associated binary type, which is a
    // BinaryType. Initially it must be "blob".
    this.#binaryType = 'blob'
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
      code = webidl.converters['unsigned short'](code, prefix, 'code', webidl.attributes.Clamp)
    }

    if (reason !== undefined) {
      reason = webidl.converters.USVString(reason)
    }

    // 1. If code is the special value "missing", then set code to null.
    code ??= null

    // 2. If reason is the special value "missing", then set reason to the empty string.
    reason ??= ''

    // 3. Close the WebSocket with this, code, and reason.
    closeWebSocketConnection(this.#handler, code, reason, true)
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
    if (isConnecting(this.#handler.readyState)) {
      throw new DOMException('Sent before connected.', 'InvalidStateError')
    }

    // 2. Run the appropriate set of steps from the following list:
    // https://datatracker.ietf.org/doc/html/rfc6455#section-6.1
    // https://datatracker.ietf.org/doc/html/rfc6455#section-5.2

    if (!isEstablished(this.#handler.readyState) || isClosing(this.#handler.readyState)) {
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

      const buffer = Buffer.from(data)

      this.#bufferedAmount += buffer.byteLength
      this.#sendQueue.add(buffer, () => {
        this.#bufferedAmount -= buffer.byteLength
      }, sendHints.text)
    } else if (isArrayBuffer(data)) {
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
    } else if (webidl.is.Blob(data)) {
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
    return this.#handler.readyState
  }

  get bufferedAmount () {
    webidl.brandCheck(this, WebSocket)

    return this.#bufferedAmount
  }

  get url () {
    webidl.brandCheck(this, WebSocket)

    // The url getter steps are to return this's url, serialized.
    return URLSerializer(this.#url)
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

    const listener = webidl.converters.EventHandlerNonNull(fn)

    if (listener !== null) {
      this.addEventListener('open', listener)
      this.#events.open = fn
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

    const listener = webidl.converters.EventHandlerNonNull(fn)

    if (listener !== null) {
      this.addEventListener('error', listener)
      this.#events.error = fn
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

    const listener = webidl.converters.EventHandlerNonNull(fn)

    if (listener !== null) {
      this.addEventListener('close', listener)
      this.#events.close = fn
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

    const listener = webidl.converters.EventHandlerNonNull(fn)

    if (listener !== null) {
      this.addEventListener('message', listener)
      this.#events.message = fn
    } else {
      this.#events.message = null
    }
  }

  get binaryType () {
    webidl.brandCheck(this, WebSocket)

    return this.#binaryType
  }

  set binaryType (type) {
    webidl.brandCheck(this, WebSocket)

    if (type !== 'blob' && type !== 'arraybuffer') {
      this.#binaryType = 'blob'
    } else {
      this.#binaryType = type
    }
  }

  /**
   * @see https://websockets.spec.whatwg.org/#feedback-from-the-protocol
   */
  #onConnectionEstablished (response, parsedExtensions) {
    // processResponse is called when the "response’s header list has been received and initialized."
    // once this happens, the connection is open
    this.#handler.socket = response.socket

    const parser = new ByteParser(this.#handler, parsedExtensions)
    parser.on('drain', () => this.#handler.onParserDrain())
    parser.on('error', (err) => this.#handler.onParserError(err))

    this.#parser = parser
    this.#sendQueue = new SendQueue(response.socket)

    // 1. Change the ready state to OPEN (1).
    this.#handler.readyState = states.OPEN

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

    if (channels.open.hasSubscribers) {
      // Convert headers to a plain object for the event
      const headers = response.headersList.entries
      channels.open.publish({
        address: response.socket.address(),
        protocol: this.#protocol,
        extensions: this.#extensions,
        websocket: this,
        handshakeResponse: {
          status: response.status,
          statusText: response.statusText,
          headers
        }
      })
    }
  }

  #onMessage (type, data) {
    // 1. If ready state is not OPEN (1), then return.
    if (this.#handler.readyState !== states.OPEN) {
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
        failWebsocketConnection(this.#handler, 1007, 'Received invalid UTF-8 in text frame.')
        return
      }
    } else if (type === opcodes.BINARY) {
      if (this.#binaryType === 'blob') {
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
    fireEvent('message', this, createFastMessageEvent, {
      origin: this.#url.origin,
      data: dataForEvent
    })
  }

  #onParserDrain () {
    this.#handler.socket.resume()
  }

  /**
   * @see https://websockets.spec.whatwg.org/#feedback-from-the-protocol
   * @see https://datatracker.ietf.org/doc/html/rfc6455#section-7.1.4
   */
  #onSocketClose () {
    // If the TCP connection was closed after the
    // WebSocket closing handshake was completed, the WebSocket connection
    // is said to have been closed _cleanly_.
    const wasClean =
      this.#handler.closeState.has(sentCloseFrameState.SENT) &&
      this.#handler.closeState.has(sentCloseFrameState.RECEIVED)

    let code = 1005
    let reason = ''

    const result = this.#parser?.closingInfo

    if (result && !result.error) {
      code = result.code ?? 1005
      reason = result.reason
    }

    // 1. Change the ready state to CLOSED (3).
    this.#handler.readyState = states.CLOSED

    // 2. If the user agent was required to fail the WebSocket
    //    connection, or if the WebSocket connection was closed
    //    after being flagged as full, fire an event named error
    //    at the WebSocket object.
    if (!this.#handler.closeState.has(sentCloseFrameState.RECEIVED)) {
      // If _The WebSocket
      // Connection is Closed_ and no Close control frame was received by the
      // endpoint (such as could occur if the underlying transport connection
      // is lost), _The WebSocket Connection Close Code_ is considered to be
      // 1006.
      code = 1006

      fireEvent('error', this, (type, init) => new ErrorEvent(type, init), {
        error: new TypeError(reason)
      })
    }

    // 3. Fire an event named close at the WebSocket object,
    //    using CloseEvent, with the wasClean attribute
    //    initialized to true if the connection closed cleanly
    //    and false otherwise, the code attribute initialized to
    //    the WebSocket connection close code, and the reason
    //    attribute initialized to the result of applying UTF-8
    //    decode without BOM to the WebSocket connection close
    //    reason.
    // TODO: process.nextTick
    fireEvent('close', this, (type, init) => new CloseEvent(type, init), {
      wasClean, code, reason
    })

    if (channels.close.hasSubscribers) {
      channels.close.publish({
        websocket: this,
        code,
        reason
      })
    }
  }

  /**
   * @param {WebSocket} ws
   * @param {Buffer|undefined} buffer
   */
  static ping (ws, buffer) {
    if (Buffer.isBuffer(buffer)) {
      if (buffer.length > 125) {
        throw new TypeError('A PING frame cannot have a body larger than 125 bytes.')
      }
    } else if (buffer !== undefined) {
      throw new TypeError('Expected buffer payload')
    }

    // An endpoint MAY send a Ping frame any time after the connection is
    // established and before the connection is closed.
    const readyState = ws.#handler.readyState

    if (isEstablished(readyState) && !isClosing(readyState) && !isClosed(readyState)) {
      const frame = new WebsocketFrameSend(buffer)
      ws.#handler.socket.write(frame.createFrame(opcodes.PING))
    }
  }
}

const { ping } = WebSocket
Reflect.deleteProperty(WebSocket, 'ping')

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
  if (webidl.util.Type(V) === webidl.util.Types.OBJECT && Symbol.iterator in V) {
    return webidl.converters['sequence<DOMString>'](V)
  }

  return webidl.converters.DOMString(V, prefix, argument)
}

// This implements the proposal made in https://github.com/whatwg/websockets/issues/42
webidl.converters.WebSocketInit = webidl.dictionaryConverter([
  {
    key: 'protocols',
    converter: webidl.converters['DOMString or sequence<DOMString>'],
    defaultValue: () => []
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
  if (webidl.util.Type(V) === webidl.util.Types.OBJECT && !(Symbol.iterator in V)) {
    return webidl.converters.WebSocketInit(V)
  }

  return { protocols: webidl.converters['DOMString or sequence<DOMString>'](V) }
}

webidl.converters.WebSocketSendData = function (V) {
  if (webidl.util.Type(V) === webidl.util.Types.OBJECT) {
    if (webidl.is.Blob(V)) {
      return V
    }

    if (webidl.is.BufferSource(V)) {
      return V
    }
  }

  return webidl.converters.USVString(V)
}

module.exports = {
  WebSocket,
  ping
}
