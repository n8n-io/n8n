'use strict'

const { createDeferredPromise } = require('../../../util/promise')
const { environmentSettingsObject } = require('../../fetch/util')
const { states, opcodes, sentCloseFrameState } = require('../constants')
const { webidl } = require('../../webidl')
const { getURLRecord, isValidSubprotocol, isEstablished, utf8Decode } = require('../util')
const { establishWebSocketConnection, failWebsocketConnection, closeWebSocketConnection } = require('../connection')
const { channels } = require('../../../core/diagnostics')
const { WebsocketFrameSend } = require('../frame')
const { ByteParser } = require('../receiver')
const { WebSocketError, createUnvalidatedWebSocketError } = require('./websocketerror')
const { kEnumerableProperty } = require('../../../core/util')
const { utf8DecodeBytes } = require('../../../encoding')

let emittedExperimentalWarning = false

class WebSocketStream {
  // Each WebSocketStream object has an associated url , which is a URL record .
  /** @type {URL} */
  #url

  // Each WebSocketStream object has an associated opened promise , which is a promise.
  /** @type {import('../../../util/promise').DeferredPromise} */
  #openedPromise

  // Each WebSocketStream object has an associated closed promise , which is a promise.
  /** @type {import('../../../util/promise').DeferredPromise} */
  #closedPromise

  // Each WebSocketStream object has an associated readable stream , which is a ReadableStream .
  /** @type {ReadableStream} */
  #readableStream
  /** @type {ReadableStreamDefaultController} */
  #readableStreamController

  // Each WebSocketStream object has an associated writable stream , which is a WritableStream .
  /** @type {WritableStream} */
  #writableStream

  // Each WebSocketStream object has an associated boolean handshake aborted , which is initially false.
  #handshakeAborted = false

  /** @type {import('../websocket').Handler} */
  #handler = {
    // https://whatpr.org/websockets/48/7b748d3...d5570f3.html#feedback-to-websocket-stream-from-the-protocol
    onConnectionEstablished: (response, extensions) => this.#onConnectionEstablished(response, extensions),
    onMessage: (opcode, data) => this.#onMessage(opcode, data),
    onParserError: (err) => failWebsocketConnection(this.#handler, null, err.message),
    onParserDrain: () => this.#handler.socket.resume(),
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
    onPing: () => {},
    onPong: () => {},

    readyState: states.CONNECTING,
    socket: null,
    closeState: new Set(),
    controller: null,
    wasEverConnected: false
  }

  /** @type {import('../receiver').ByteParser} */
  #parser

  constructor (url, options = undefined) {
    if (!emittedExperimentalWarning) {
      process.emitWarning('WebSocketStream is experimental! Expect it to change at any time.', {
        code: 'UNDICI-WSS'
      })
      emittedExperimentalWarning = true
    }

    webidl.argumentLengthCheck(arguments, 1, 'WebSocket')

    url = webidl.converters.USVString(url)
    if (options !== null) {
      options = webidl.converters.WebSocketStreamOptions(options)
    }

    // 1. Let baseURL be this 's relevant settings object 's API base URL .
    const baseURL = environmentSettingsObject.settingsObject.baseUrl

    // 2. Let urlRecord be the result of getting a URL record given url and baseURL .
    const urlRecord = getURLRecord(url, baseURL)

    // 3. Let protocols be options [" protocols "] if it exists , otherwise an empty sequence.
    const protocols = options.protocols

    // 4. If any of the values in protocols occur more than once or otherwise fail to match the requirements for elements that comprise the value of ` Sec-WebSocket-Protocol ` fields as defined by The WebSocket Protocol , then throw a " SyntaxError " DOMException . [WSP]
    if (protocols.length !== new Set(protocols.map(p => p.toLowerCase())).size) {
      throw new DOMException('Invalid Sec-WebSocket-Protocol value', 'SyntaxError')
    }

    if (protocols.length > 0 && !protocols.every(p => isValidSubprotocol(p))) {
      throw new DOMException('Invalid Sec-WebSocket-Protocol value', 'SyntaxError')
    }

    // 5. Set this 's url to urlRecord .
    this.#url = urlRecord.toString()

    // 6. Set this 's opened promise and closed promise to new promises.
    this.#openedPromise = createDeferredPromise()
    this.#closedPromise = createDeferredPromise()

    // 7. Apply backpressure to the WebSocket.
    // TODO

    // 8.  If options [" signal "] exists ,
    if (options.signal != null) {
      // 8.1. Let signal be options [" signal "].
      const signal = options.signal

      // 8.2. If signal is aborted , then reject this 's opened promise and closed promise with signal ’s abort reason
      //      and return.
      if (signal.aborted) {
        this.#openedPromise.reject(signal.reason)
        this.#closedPromise.reject(signal.reason)
        return
      }

      // 8.3. Add the following abort steps to signal :
      signal.addEventListener('abort', () => {
        // 8.3.1. If the WebSocket connection is not yet established : [WSP]
        if (!isEstablished(this.#handler.readyState)) {
          // 8.3.1.1. Fail the WebSocket connection .
          failWebsocketConnection(this.#handler)

          // Set this 's ready state to CLOSING .
          this.#handler.readyState = states.CLOSING

          // Reject this 's opened promise and closed promise with signal ’s abort reason .
          this.#openedPromise.reject(signal.reason)
          this.#closedPromise.reject(signal.reason)

          // Set this 's handshake aborted to true.
          this.#handshakeAborted = true
        }
      }, { once: true })
    }

    // 9.  Let client be this 's relevant settings object .
    const client = environmentSettingsObject.settingsObject

    // 10. Run this step in parallel :
    // 10.1. Establish a WebSocket connection given urlRecord , protocols , and client . [FETCH]
    this.#handler.controller = establishWebSocketConnection(
      urlRecord,
      protocols,
      client,
      this.#handler,
      options
    )
  }

  // The url getter steps are to return this 's url , serialized .
  get url () {
    return this.#url.toString()
  }

  // The opened getter steps are to return this 's opened promise .
  get opened () {
    return this.#openedPromise.promise
  }

  // The closed getter steps are to return this 's closed promise .
  get closed () {
    return this.#closedPromise.promise
  }

  // The close( closeInfo ) method steps are:
  close (closeInfo = undefined) {
    if (closeInfo !== null) {
      closeInfo = webidl.converters.WebSocketCloseInfo(closeInfo)
    }

    // 1. Let code be closeInfo [" closeCode "] if present, or null otherwise.
    const code = closeInfo.closeCode ?? null

    // 2. Let reason be closeInfo [" reason "].
    const reason = closeInfo.reason

    // 3. Close the WebSocket with this , code , and reason .
    closeWebSocketConnection(this.#handler, code, reason, true)
  }

  #write (chunk) {
    // See /websockets/stream/tentative/write.any.html
    chunk = webidl.converters.WebSocketStreamWrite(chunk)

    // 1. Let promise be a new promise created in stream ’s relevant realm .
    const promise = createDeferredPromise()

    // 2. Let data be null.
    let data = null

    // 3. Let opcode be null.
    let opcode = null

    // 4. If chunk is a BufferSource ,
    if (webidl.is.BufferSource(chunk)) {
      // 4.1. Set data to a copy of the bytes given chunk .
      data = new Uint8Array(ArrayBuffer.isView(chunk) ? new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength) : chunk.slice())

      // 4.2. Set opcode to a binary frame opcode.
      opcode = opcodes.BINARY
    } else {
      // 5. Otherwise,

      // 5.1. Let string be the result of converting chunk to an IDL USVString .
      //    If this throws an exception, return a promise rejected with the exception.
      let string

      try {
        string = webidl.converters.DOMString(chunk)
      } catch (e) {
        promise.reject(e)
        return promise.promise
      }

      // 5.2. Set data to the result of UTF-8 encoding string .
      data = new TextEncoder().encode(string)

      // 5.3. Set opcode to a text frame opcode.
      opcode = opcodes.TEXT
    }

    // 6. In parallel,
    // 6.1. Wait until there is sufficient buffer space in stream to send the message.

    // 6.2. If the closing handshake has not yet started , Send a WebSocket Message to stream comprised of data using opcode .
    if (!this.#handler.closeState.has(sentCloseFrameState.SENT) && !this.#handler.closeState.has(sentCloseFrameState.RECEIVED)) {
      const frame = new WebsocketFrameSend(data)

      this.#handler.socket.write(frame.createFrame(opcode), () => {
        promise.resolve(undefined)
      })
    }

    // 6.3. Queue a global task on the WebSocket task source given stream ’s relevant global object to resolve promise with undefined.
    return promise.promise
  }

  /** @type {import('../websocket').Handler['onConnectionEstablished']} */
  #onConnectionEstablished (response, parsedExtensions) {
    this.#handler.socket = response.socket

    const parser = new ByteParser(this.#handler, parsedExtensions)
    parser.on('drain', () => this.#handler.onParserDrain())
    parser.on('error', (err) => this.#handler.onParserError(err))

    this.#parser = parser

    // 1. Change stream ’s ready state to OPEN (1).
    this.#handler.readyState = states.OPEN

    // 2. Set stream ’s was ever connected to true.
    // This is done in the opening handshake.

    // 3. Let extensions be the extensions in use .
    const extensions = parsedExtensions ?? ''

    // 4. Let protocol be the subprotocol in use .
    const protocol = response.headersList.get('sec-websocket-protocol') ?? ''

    // 5. Let pullAlgorithm be an action that pulls bytes from stream .
    // 6. Let cancelAlgorithm be an action that cancels stream with reason , given reason .
    // 7. Let readable be a new ReadableStream .
    // 8. Set up readable with pullAlgorithm and cancelAlgorithm .
    const readable = new ReadableStream({
      start: (controller) => {
        this.#readableStreamController = controller
      },
      pull (controller) {
        let chunk
        while (controller.desiredSize > 0 && (chunk = response.socket.read()) !== null) {
          controller.enqueue(chunk)
        }
      },
      cancel: (reason) => this.#cancel(reason)
    })

    // 9. Let writeAlgorithm be an action that writes chunk to stream , given chunk .
    // 10. Let closeAlgorithm be an action that closes stream .
    // 11. Let abortAlgorithm be an action that aborts stream with reason , given reason .
    // 12. Let writable be a new WritableStream .
    // 13. Set up writable with writeAlgorithm , closeAlgorithm , and abortAlgorithm .
    const writable = new WritableStream({
      write: (chunk) => this.#write(chunk),
      close: () => closeWebSocketConnection(this.#handler, null, null),
      abort: (reason) => this.#closeUsingReason(reason)
    })

    // Set stream ’s readable stream to readable .
    this.#readableStream = readable

    // Set stream ’s writable stream to writable .
    this.#writableStream = writable

    // Resolve stream ’s opened promise with WebSocketOpenInfo «[ " extensions " → extensions , " protocol " → protocol , " readable " → readable , " writable " → writable ]».
    this.#openedPromise.resolve({
      extensions,
      protocol,
      readable,
      writable
    })
  }

  /** @type {import('../websocket').Handler['onMessage']} */
  #onMessage (type, data) {
    // 1. If stream’s ready state is not OPEN (1), then return.
    if (this.#handler.readyState !== states.OPEN) {
      return
    }

    // 2. Let chunk be determined by switching on type:
    //      - type indicates that the data is Text
    //          a new DOMString containing data
    //      - type indicates that the data is Binary
    //          a new Uint8Array object, created in the relevant Realm of the
    //          WebSocketStream object, whose contents are data
    let chunk

    if (type === opcodes.TEXT) {
      try {
        chunk = utf8Decode(data)
      } catch {
        failWebsocketConnection(this.#handler, 'Received invalid UTF-8 in text frame.')
        return
      }
    } else if (type === opcodes.BINARY) {
      chunk = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    }

    // 3. Enqueue chunk into stream’s readable stream.
    this.#readableStreamController.enqueue(chunk)

    // 4. Apply backpressure to the WebSocket.
  }

  /** @type {import('../websocket').Handler['onSocketClose']} */
  #onSocketClose () {
    const wasClean =
      this.#handler.closeState.has(sentCloseFrameState.SENT) &&
      this.#handler.closeState.has(sentCloseFrameState.RECEIVED)

    // 1. Change the ready state to CLOSED (3).
    this.#handler.readyState = states.CLOSED

    // 2. If stream ’s handshake aborted is true, then return.
    if (this.#handshakeAborted) {
      return
    }

    // 3. If stream ’s was ever connected is false, then reject stream ’s opened promise with a new WebSocketError.
    if (!this.#handler.wasEverConnected) {
      this.#openedPromise.reject(new WebSocketError('Socket never opened'))
    }

    const result = this.#parser.closingInfo

    // 4. Let code be the WebSocket connection close code .
    // https://datatracker.ietf.org/doc/html/rfc6455#section-7.1.5
    // If this Close control frame contains no status code, _The WebSocket
    // Connection Close Code_ is considered to be 1005. If _The WebSocket
    // Connection is Closed_ and no Close control frame was received by the
    // endpoint (such as could occur if the underlying transport connection
    // is lost), _The WebSocket Connection Close Code_ is considered to be
    // 1006.
    let code = result?.code ?? 1005

    if (!this.#handler.closeState.has(sentCloseFrameState.SENT) && !this.#handler.closeState.has(sentCloseFrameState.RECEIVED)) {
      code = 1006
    }

    // 5. Let reason be the result of applying UTF-8 decode without BOM to the WebSocket connection close reason .
    const reason = result?.reason == null ? '' : utf8DecodeBytes(Buffer.from(result.reason))

    // 6. If the connection was closed cleanly ,
    if (wasClean) {
      // 6.1. Close stream ’s readable stream .
      this.#readableStreamController.close()

      // 6.2. Error stream ’s writable stream with an " InvalidStateError " DOMException indicating that a closed WebSocketStream cannot be written to.
      if (!this.#writableStream.locked) {
        this.#writableStream.abort(new DOMException('A closed WebSocketStream cannot be written to', 'InvalidStateError'))
      }

      // 6.3. Resolve stream ’s closed promise with WebSocketCloseInfo «[ " closeCode " → code , " reason " → reason ]».
      this.#closedPromise.resolve({
        closeCode: code,
        reason
      })
    } else {
      // 7. Otherwise,

      // 7.1. Let error be a new WebSocketError whose closeCode is code and reason is reason .
      const error = createUnvalidatedWebSocketError('unclean close', code, reason)

      // 7.2. Error stream ’s readable stream with error .
      this.#readableStreamController.error(error)

      // 7.3. Error stream ’s writable stream with error .
      this.#writableStream.abort(error)

      // 7.4. Reject stream ’s closed promise with error .
      this.#closedPromise.reject(error)
    }
  }

  #closeUsingReason (reason) {
    // 1. Let code be null.
    let code = null

    // 2. Let reasonString be the empty string.
    let reasonString = ''

    // 3. If reason implements WebSocketError ,
    if (webidl.is.WebSocketError(reason)) {
      // 3.1. Set code to reason ’s closeCode .
      code = reason.closeCode

      // 3.2. Set reasonString to reason ’s reason .
      reasonString = reason.reason
    }

    // 4. Close the WebSocket with stream , code , and reasonString . If this throws an exception,
    //    discard code and reasonString and close the WebSocket with stream .
    closeWebSocketConnection(this.#handler, code, reasonString)
  }

  //  To cancel a WebSocketStream stream given reason , close using reason giving stream and reason .
  #cancel (reason) {
    this.#closeUsingReason(reason)
  }
}

Object.defineProperties(WebSocketStream.prototype, {
  url: kEnumerableProperty,
  opened: kEnumerableProperty,
  closed: kEnumerableProperty,
  close: kEnumerableProperty,
  [Symbol.toStringTag]: {
    value: 'WebSocketStream',
    writable: false,
    enumerable: false,
    configurable: true
  }
})

webidl.converters.WebSocketStreamOptions = webidl.dictionaryConverter([
  {
    key: 'protocols',
    converter: webidl.sequenceConverter(webidl.converters.USVString),
    defaultValue: () => []
  },
  {
    key: 'signal',
    converter: webidl.nullableConverter(webidl.converters.AbortSignal),
    defaultValue: () => null
  }
])

webidl.converters.WebSocketCloseInfo = webidl.dictionaryConverter([
  {
    key: 'closeCode',
    converter: (V) => webidl.converters['unsigned short'](V, webidl.attributes.EnforceRange)
  },
  {
    key: 'reason',
    converter: webidl.converters.USVString,
    defaultValue: () => ''
  }
])

webidl.converters.WebSocketStreamWrite = function (V) {
  if (typeof V === 'string') {
    return webidl.converters.USVString(V)
  }

  return webidl.converters.BufferSource(V)
}

module.exports = { WebSocketStream }
