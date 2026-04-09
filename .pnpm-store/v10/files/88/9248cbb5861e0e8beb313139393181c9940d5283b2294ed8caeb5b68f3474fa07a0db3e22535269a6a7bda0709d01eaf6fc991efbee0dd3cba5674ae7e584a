'use strict'

const { uid, states, sentCloseFrameState, emptyBuffer, opcodes } = require('./constants')
const { parseExtensions, isClosed, isClosing, isEstablished, isConnecting, validateCloseCodeAndReason } = require('./util')
const { makeRequest } = require('../fetch/request')
const { fetching } = require('../fetch/index')
const { Headers, getHeadersList } = require('../fetch/headers')
const { getDecodeSplit } = require('../fetch/util')
const { WebsocketFrameSend } = require('./frame')
const assert = require('node:assert')
const { runtimeFeatures } = require('../../util/runtime-features')

const crypto = runtimeFeatures.has('crypto')
  ? require('node:crypto')
  : null

let warningEmitted = false

/**
 * @see https://websockets.spec.whatwg.org/#concept-websocket-establish
 * @param {URL} url
 * @param {string|string[]} protocols
 * @param {import('./websocket').Handler} handler
 * @param {Partial<import('../../../types/websocket').WebSocketInit>} options
 */
function establishWebSocketConnection (url, protocols, client, handler, options) {
  // 1. Let requestURL be a copy of url, with its scheme set to "http", if url’s
  //    scheme is "ws", and to "https" otherwise.
  const requestURL = url

  requestURL.protocol = url.protocol === 'ws:' ? 'http:' : 'https:'

  // 2. Let request be a new request, whose URL is requestURL, client is client,
  //    service-workers mode is "none", referrer is "no-referrer", mode is
  //    "websocket", credentials mode is "include", cache mode is "no-store" ,
  //    redirect mode is "error", and use-URL-credentials flag is set.
  const request = makeRequest({
    urlList: [requestURL],
    client,
    serviceWorkers: 'none',
    referrer: 'no-referrer',
    mode: 'websocket',
    credentials: 'include',
    cache: 'no-store',
    redirect: 'error',
    useURLCredentials: true
  })

  // Note: undici extension, allow setting custom headers.
  if (options.headers) {
    const headersList = getHeadersList(new Headers(options.headers))

    request.headersList = headersList
  }

  // 3. Append (`Upgrade`, `websocket`) to request’s header list.
  // 4. Append (`Connection`, `Upgrade`) to request’s header list.
  // Note: both of these are handled by undici currently.
  // https://github.com/nodejs/undici/blob/68c269c4144c446f3f1220951338daef4a6b5ec4/lib/client.js#L1397

  // 5. Let keyValue be a nonce consisting of a randomly selected
  //    16-byte value that has been forgiving-base64-encoded and
  //    isomorphic encoded.
  const keyValue = crypto.randomBytes(16).toString('base64')

  // 6. Append (`Sec-WebSocket-Key`, keyValue) to request’s
  //    header list.
  request.headersList.append('sec-websocket-key', keyValue, true)

  // 7. Append (`Sec-WebSocket-Version`, `13`) to request’s
  //    header list.
  request.headersList.append('sec-websocket-version', '13', true)

  // 8. For each protocol in protocols, combine
  //    (`Sec-WebSocket-Protocol`, protocol) in request’s header
  //    list.
  for (const protocol of protocols) {
    request.headersList.append('sec-websocket-protocol', protocol, true)
  }

  // 9. Let permessageDeflate be a user-agent defined
  //    "permessage-deflate" extension header value.
  // https://github.com/mozilla/gecko-dev/blob/ce78234f5e653a5d3916813ff990f053510227bc/netwerk/protocol/websocket/WebSocketChannel.cpp#L2673
  const permessageDeflate = 'permessage-deflate; client_max_window_bits'

  // 10. Append (`Sec-WebSocket-Extensions`, permessageDeflate) to
  //     request’s header list.
  request.headersList.append('sec-websocket-extensions', permessageDeflate, true)

  // 11. Fetch request with useParallelQueue set to true, and
  //     processResponse given response being these steps:
  const controller = fetching({
    request,
    useParallelQueue: true,
    dispatcher: options.dispatcher,
    processResponse (response) {
      // 1. If response is a network error or its status is not 101,
      //    fail the WebSocket connection.
      // if (response.type === 'error' || ((response.socket?.session != null && response.status !== 200) && response.status !== 101)) {
      if (response.type === 'error' || response.status !== 101) {
        // The presence of a session property on the socket indicates HTTP2
        // HTTP1
        if (response.socket?.session == null) {
          failWebsocketConnection(handler, 1002, 'Received network error or non-101 status code.', response.error)
          return
        }

        // HTTP2
        if (response.status !== 200) {
          failWebsocketConnection(handler, 1002, 'Received network error or non-200 status code.', response.error)
          return
        }
      }

      if (warningEmitted === false && response.socket?.session != null) {
        process.emitWarning('WebSocket over HTTP2 is experimental, and subject to change.', 'ExperimentalWarning')
        warningEmitted = true
      }

      // 2. If protocols is not the empty list and extracting header
      //    list values given `Sec-WebSocket-Protocol` and response’s
      //    header list results in null, failure, or the empty byte
      //    sequence, then fail the WebSocket connection.
      if (protocols.length !== 0 && !response.headersList.get('Sec-WebSocket-Protocol')) {
        failWebsocketConnection(handler, 1002, 'Server did not respond with sent protocols.')
        return
      }

      // 3. Follow the requirements stated step 2 to step 6, inclusive,
      //    of the last set of steps in section 4.1 of The WebSocket
      //    Protocol to validate response. This either results in fail
      //    the WebSocket connection or the WebSocket connection is
      //    established.

      // 2. If the response lacks an |Upgrade| header field or the |Upgrade|
      //    header field contains a value that is not an ASCII case-
      //    insensitive match for the value "websocket", the client MUST
      //    _Fail the WebSocket Connection_.
      //    For H2, no upgrade header is expected.
      if (response.socket.session == null && response.headersList.get('Upgrade')?.toLowerCase() !== 'websocket') {
        failWebsocketConnection(handler, 1002, 'Server did not set Upgrade header to "websocket".')
        return
      }

      // 3. If the response lacks a |Connection| header field or the
      //    |Connection| header field doesn't contain a token that is an
      //    ASCII case-insensitive match for the value "Upgrade", the client
      //    MUST _Fail the WebSocket Connection_.
      //    For H2, no connection header is expected.
      if (response.socket.session == null && response.headersList.get('Connection')?.toLowerCase() !== 'upgrade') {
        failWebsocketConnection(handler, 1002, 'Server did not set Connection header to "upgrade".')
        return
      }

      // 4. If the response lacks a |Sec-WebSocket-Accept| header field or
      //    the |Sec-WebSocket-Accept| contains a value other than the
      //    base64-encoded SHA-1 of the concatenation of the |Sec-WebSocket-
      //    Key| (as a string, not base64-decoded) with the string "258EAFA5-
      //    E914-47DA-95CA-C5AB0DC85B11" but ignoring any leading and
      //    trailing whitespace, the client MUST _Fail the WebSocket
      //    Connection_.
      const secWSAccept = response.headersList.get('Sec-WebSocket-Accept')
      const digest = crypto.hash('sha1', keyValue + uid, 'base64')
      if (secWSAccept !== digest) {
        failWebsocketConnection(handler, 1002, 'Incorrect hash received in Sec-WebSocket-Accept header.')
        return
      }

      // 5. If the response includes a |Sec-WebSocket-Extensions| header
      //    field and this header field indicates the use of an extension
      //    that was not present in the client's handshake (the server has
      //    indicated an extension not requested by the client), the client
      //    MUST _Fail the WebSocket Connection_.  (The parsing of this
      //    header field to determine which extensions are requested is
      //    discussed in Section 9.1.)
      const secExtension = response.headersList.get('Sec-WebSocket-Extensions')
      let extensions

      if (secExtension !== null) {
        extensions = parseExtensions(secExtension)

        if (!extensions.has('permessage-deflate')) {
          failWebsocketConnection(handler, 1002, 'Sec-WebSocket-Extensions header does not match.')
          return
        }
      }

      // 6. If the response includes a |Sec-WebSocket-Protocol| header field
      //    and this header field indicates the use of a subprotocol that was
      //    not present in the client's handshake (the server has indicated a
      //    subprotocol not requested by the client), the client MUST _Fail
      //    the WebSocket Connection_.
      const secProtocol = response.headersList.get('Sec-WebSocket-Protocol')

      if (secProtocol !== null) {
        const requestProtocols = getDecodeSplit('sec-websocket-protocol', request.headersList)

        // The client can request that the server use a specific subprotocol by
        // including the |Sec-WebSocket-Protocol| field in its handshake.  If it
        // is specified, the server needs to include the same field and one of
        // the selected subprotocol values in its response for the connection to
        // be established.
        if (!requestProtocols.includes(secProtocol)) {
          failWebsocketConnection(handler, 1002, 'Protocol was not set in the opening handshake.')
          return
        }
      }

      response.socket.on('data', handler.onSocketData)
      response.socket.on('close', handler.onSocketClose)
      response.socket.on('error', handler.onSocketError)

      handler.wasEverConnected = true
      handler.onConnectionEstablished(response, extensions)
    }
  })

  return controller
}

/**
 * @see https://whatpr.org/websockets/48.html#close-the-websocket
 * @param {import('./websocket').Handler} object
 * @param {number} [code=null]
 * @param {string} [reason='']
 */
function closeWebSocketConnection (object, code, reason, validate = false) {
  // 1. If code was not supplied, let code be null.
  code ??= null

  // 2. If reason was not supplied, let reason be the empty string.
  reason ??= ''

  // 3. Validate close code and reason with code and reason.
  if (validate) validateCloseCodeAndReason(code, reason)

  // 4. Run the first matching steps from the following list:
  //     - If object’s ready state is CLOSING (2) or CLOSED (3)
  //     - If the WebSocket connection is not yet established [WSP]
  //     - If the WebSocket closing handshake has not yet been started [WSP]
  //     - Otherwise
  if (isClosed(object.readyState) || isClosing(object.readyState)) {
    // Do nothing.
  } else if (!isEstablished(object.readyState)) {
    // Fail the WebSocket connection and set object’s ready state to CLOSING (2). [WSP]
    failWebsocketConnection(object)
    object.readyState = states.CLOSING
  } else if (!object.closeState.has(sentCloseFrameState.SENT) && !object.closeState.has(sentCloseFrameState.RECEIVED)) {
    // Upon either sending or receiving a Close control frame, it is said
    // that _The WebSocket Closing Handshake is Started_ and that the
    // WebSocket connection is in the CLOSING state.

    const frame = new WebsocketFrameSend()

    // If neither code nor reason is present, the WebSocket Close
    // message must not have a body.

    // If code is present, then the status code to use in the
    // WebSocket Close message must be the integer given by code.
    // If code is null and reason is the empty string, the WebSocket Close frame must not have a body.
    // If reason is non-empty but code is null, then set code to 1000 ("Normal Closure").
    if (reason.length !== 0 && code === null) {
      code = 1000
    }

    // If code is set, then the status code to use in the WebSocket Close frame must be the integer given by code.
    assert(code === null || Number.isInteger(code))

    if (code === null && reason.length === 0) {
      frame.frameData = emptyBuffer
    } else if (code !== null && reason === null) {
      frame.frameData = Buffer.allocUnsafe(2)
      frame.frameData.writeUInt16BE(code, 0)
    } else if (code !== null && reason !== null) {
      // If reason is also present, then reasonBytes must be
      // provided in the Close message after the status code.
      frame.frameData = Buffer.allocUnsafe(2 + Buffer.byteLength(reason))
      frame.frameData.writeUInt16BE(code, 0)
      // the body MAY contain UTF-8-encoded data with value /reason/
      frame.frameData.write(reason, 2, 'utf-8')
    } else {
      frame.frameData = emptyBuffer
    }

    object.socket.write(frame.createFrame(opcodes.CLOSE))

    object.closeState.add(sentCloseFrameState.SENT)

    // Upon either sending or receiving a Close control frame, it is said
    // that _The WebSocket Closing Handshake is Started_ and that the
    // WebSocket connection is in the CLOSING state.
    object.readyState = states.CLOSING
  } else {
    // Set object’s ready state to CLOSING (2).
    object.readyState = states.CLOSING
  }
}

/**
 * @param {import('./websocket').Handler} handler
 * @param {number} code
 * @param {string|undefined} reason
 * @param {unknown} cause
 * @returns {void}
 */
function failWebsocketConnection (handler, code, reason, cause) {
  // If _The WebSocket Connection is Established_ prior to the point where
  // the endpoint is required to _Fail the WebSocket Connection_, the
  // endpoint SHOULD send a Close frame with an appropriate status code
  // (Section 7.4) before proceeding to _Close the WebSocket Connection_.
  if (isEstablished(handler.readyState)) {
    closeWebSocketConnection(handler, code, reason, false)
  }

  handler.controller.abort()

  if (isConnecting(handler.readyState)) {
    // If the connection was not established, we must still emit an 'error' and 'close' events
    handler.onSocketClose()
  } else if (handler.socket?.destroyed === false) {
    handler.socket.destroy()
  }
}

module.exports = {
  establishWebSocketConnection,
  failWebsocketConnection,
  closeWebSocketConnection
}
