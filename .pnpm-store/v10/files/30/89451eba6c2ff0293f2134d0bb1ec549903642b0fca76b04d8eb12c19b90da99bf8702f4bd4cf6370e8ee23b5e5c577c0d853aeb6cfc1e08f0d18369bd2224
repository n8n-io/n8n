'use strict'

const { uid, states, sentCloseFrameState, emptyBuffer, opcodes } = require('./constants')
const {
  kReadyState,
  kSentClose,
  kByteParser,
  kReceivedClose,
  kResponse
} = require('./symbols')
const { fireEvent, failWebsocketConnection, isClosing, isClosed, isEstablished, parseExtensions } = require('./util')
const { channels } = require('../../core/diagnostics')
const { CloseEvent } = require('./events')
const { makeRequest } = require('../fetch/request')
const { fetching } = require('../fetch/index')
const { Headers, getHeadersList } = require('../fetch/headers')
const { getDecodeSplit } = require('../fetch/util')
const { WebsocketFrameSend } = require('./frame')

/** @type {import('crypto')} */
let crypto
try {
  crypto = require('node:crypto')
/* c8 ignore next 3 */
} catch {

}

/**
 * @see https://websockets.spec.whatwg.org/#concept-websocket-establish
 * @param {URL} url
 * @param {string|string[]} protocols
 * @param {import('./websocket').WebSocket} ws
 * @param {(response: any, extensions: string[] | undefined) => void} onEstablish
 * @param {Partial<import('../../types/websocket').WebSocketInit>} options
 */
function establishWebSocketConnection (url, protocols, client, ws, onEstablish, options) {
  // 1. Let requestURL be a copy of url, with its scheme set to "http", if url’s
  //    scheme is "ws", and to "https" otherwise.
  const requestURL = url

  requestURL.protocol = url.protocol === 'ws:' ? 'http:' : 'https:'

  // 2. Let request be a new request, whose URL is requestURL, client is client,
  //    service-workers mode is "none", referrer is "no-referrer", mode is
  //    "websocket", credentials mode is "include", cache mode is "no-store" ,
  //    and redirect mode is "error".
  const request = makeRequest({
    urlList: [requestURL],
    client,
    serviceWorkers: 'none',
    referrer: 'no-referrer',
    mode: 'websocket',
    credentials: 'include',
    cache: 'no-store',
    redirect: 'error'
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
  request.headersList.append('sec-websocket-key', keyValue)

  // 7. Append (`Sec-WebSocket-Version`, `13`) to request’s
  //    header list.
  request.headersList.append('sec-websocket-version', '13')

  // 8. For each protocol in protocols, combine
  //    (`Sec-WebSocket-Protocol`, protocol) in request’s header
  //    list.
  for (const protocol of protocols) {
    request.headersList.append('sec-websocket-protocol', protocol)
  }

  // 9. Let permessageDeflate be a user-agent defined
  //    "permessage-deflate" extension header value.
  // https://github.com/mozilla/gecko-dev/blob/ce78234f5e653a5d3916813ff990f053510227bc/netwerk/protocol/websocket/WebSocketChannel.cpp#L2673
  const permessageDeflate = 'permessage-deflate; client_max_window_bits'

  // 10. Append (`Sec-WebSocket-Extensions`, permessageDeflate) to
  //     request’s header list.
  request.headersList.append('sec-websocket-extensions', permessageDeflate)

  // 11. Fetch request with useParallelQueue set to true, and
  //     processResponse given response being these steps:
  const controller = fetching({
    request,
    useParallelQueue: true,
    dispatcher: options.dispatcher,
    processResponse (response) {
      // 1. If response is a network error or its status is not 101,
      //    fail the WebSocket connection.
      if (response.type === 'error' || response.status !== 101) {
        failWebsocketConnection(ws, 'Received network error or non-101 status code.')
        return
      }

      // 2. If protocols is not the empty list and extracting header
      //    list values given `Sec-WebSocket-Protocol` and response’s
      //    header list results in null, failure, or the empty byte
      //    sequence, then fail the WebSocket connection.
      if (protocols.length !== 0 && !response.headersList.get('Sec-WebSocket-Protocol')) {
        failWebsocketConnection(ws, 'Server did not respond with sent protocols.')
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
      if (response.headersList.get('Upgrade')?.toLowerCase() !== 'websocket') {
        failWebsocketConnection(ws, 'Server did not set Upgrade header to "websocket".')
        return
      }

      // 3. If the response lacks a |Connection| header field or the
      //    |Connection| header field doesn't contain a token that is an
      //    ASCII case-insensitive match for the value "Upgrade", the client
      //    MUST _Fail the WebSocket Connection_.
      if (response.headersList.get('Connection')?.toLowerCase() !== 'upgrade') {
        failWebsocketConnection(ws, 'Server did not set Connection header to "upgrade".')
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
      const digest = crypto.createHash('sha1').update(keyValue + uid).digest('base64')
      if (secWSAccept !== digest) {
        failWebsocketConnection(ws, 'Incorrect hash received in Sec-WebSocket-Accept header.')
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
          failWebsocketConnection(ws, 'Sec-WebSocket-Extensions header does not match.')
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
          failWebsocketConnection(ws, 'Protocol was not set in the opening handshake.')
          return
        }
      }

      response.socket.on('data', onSocketData)
      response.socket.on('close', onSocketClose)
      response.socket.on('error', onSocketError)

      if (channels.open.hasSubscribers) {
        channels.open.publish({
          address: response.socket.address(),
          protocol: secProtocol,
          extensions: secExtension
        })
      }

      onEstablish(response, extensions)
    }
  })

  return controller
}

function closeWebSocketConnection (ws, code, reason, reasonByteLength) {
  if (isClosing(ws) || isClosed(ws)) {
    // If this's ready state is CLOSING (2) or CLOSED (3)
    // Do nothing.
  } else if (!isEstablished(ws)) {
    // If the WebSocket connection is not yet established
    // Fail the WebSocket connection and set this's ready state
    // to CLOSING (2).
    failWebsocketConnection(ws, 'Connection was closed before it was established.')
    ws[kReadyState] = states.CLOSING
  } else if (ws[kSentClose] === sentCloseFrameState.NOT_SENT) {
    // If the WebSocket closing handshake has not yet been started
    // Start the WebSocket closing handshake and set this's ready
    // state to CLOSING (2).
    // - If neither code nor reason is present, the WebSocket Close
    //   message must not have a body.
    // - If code is present, then the status code to use in the
    //   WebSocket Close message must be the integer given by code.
    // - If reason is also present, then reasonBytes must be
    //   provided in the Close message after the status code.

    ws[kSentClose] = sentCloseFrameState.PROCESSING

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
    const socket = ws[kResponse].socket

    socket.write(frame.createFrame(opcodes.CLOSE))

    ws[kSentClose] = sentCloseFrameState.SENT

    // Upon either sending or receiving a Close control frame, it is said
    // that _The WebSocket Closing Handshake is Started_ and that the
    // WebSocket connection is in the CLOSING state.
    ws[kReadyState] = states.CLOSING
  } else {
    // Otherwise
    // Set this's ready state to CLOSING (2).
    ws[kReadyState] = states.CLOSING
  }
}

/**
 * @param {Buffer} chunk
 */
function onSocketData (chunk) {
  if (!this.ws[kByteParser].write(chunk)) {
    this.pause()
  }
}

/**
 * @see https://websockets.spec.whatwg.org/#feedback-from-the-protocol
 * @see https://datatracker.ietf.org/doc/html/rfc6455#section-7.1.4
 */
function onSocketClose () {
  const { ws } = this
  const { [kResponse]: response } = ws

  response.socket.off('data', onSocketData)
  response.socket.off('close', onSocketClose)
  response.socket.off('error', onSocketError)

  // If the TCP connection was closed after the
  // WebSocket closing handshake was completed, the WebSocket connection
  // is said to have been closed _cleanly_.
  const wasClean = ws[kSentClose] === sentCloseFrameState.SENT && ws[kReceivedClose]

  let code = 1005
  let reason = ''

  const result = ws[kByteParser].closingInfo

  if (result && !result.error) {
    code = result.code ?? 1005
    reason = result.reason
  } else if (!ws[kReceivedClose]) {
    // If _The WebSocket
    // Connection is Closed_ and no Close control frame was received by the
    // endpoint (such as could occur if the underlying transport connection
    // is lost), _The WebSocket Connection Close Code_ is considered to be
    // 1006.
    code = 1006
  }

  // 1. Change the ready state to CLOSED (3).
  ws[kReadyState] = states.CLOSED

  // 2. If the user agent was required to fail the WebSocket
  //    connection, or if the WebSocket connection was closed
  //    after being flagged as full, fire an event named error
  //    at the WebSocket object.
  // TODO

  // 3. Fire an event named close at the WebSocket object,
  //    using CloseEvent, with the wasClean attribute
  //    initialized to true if the connection closed cleanly
  //    and false otherwise, the code attribute initialized to
  //    the WebSocket connection close code, and the reason
  //    attribute initialized to the result of applying UTF-8
  //    decode without BOM to the WebSocket connection close
  //    reason.
  // TODO: process.nextTick
  fireEvent('close', ws, (type, init) => new CloseEvent(type, init), {
    wasClean, code, reason
  })

  if (channels.close.hasSubscribers) {
    channels.close.publish({
      websocket: ws,
      code,
      reason
    })
  }
}

function onSocketError (error) {
  const { ws } = this

  ws[kReadyState] = states.CLOSING

  if (channels.socketError.hasSubscribers) {
    channels.socketError.publish(error)
  }

  this.destroy()
}

module.exports = {
  establishWebSocketConnection,
  closeWebSocketConnection
}
