'use strict'

const diagnosticsChannel = require('diagnostics_channel')
const { uid, states } = require('./constants')
const {
  kReadyState,
  kSentClose,
  kByteParser,
  kReceivedClose
} = require('./symbols')
const { fireEvent, failWebsocketConnection } = require('./util')
const { CloseEvent } = require('./events')
const { makeRequest } = require('../fetch/request')
const { fetching } = require('../fetch/index')
const { Headers } = require('../fetch/headers')
const { getGlobalDispatcher } = require('../global')
const { kHeadersList } = require('../core/symbols')

const channels = {}
channels.open = diagnosticsChannel.channel('undici:websocket:open')
channels.close = diagnosticsChannel.channel('undici:websocket:close')
channels.socketError = diagnosticsChannel.channel('undici:websocket:socket_error')

/** @type {import('crypto')} */
let crypto
try {
  crypto = require('crypto')
} catch {

}

/**
 * @see https://websockets.spec.whatwg.org/#concept-websocket-establish
 * @param {URL} url
 * @param {string|string[]} protocols
 * @param {import('./websocket').WebSocket} ws
 * @param {(response: any) => void} onEstablish
 * @param {Partial<import('../../types/websocket').WebSocketInit>} options
 */
function establishWebSocketConnection (url, protocols, ws, onEstablish, options) {
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
    serviceWorkers: 'none',
    referrer: 'no-referrer',
    mode: 'websocket',
    credentials: 'include',
    cache: 'no-store',
    redirect: 'error'
  })

  // Note: undici extension, allow setting custom headers.
  if (options.headers) {
    const headersList = new Headers(options.headers)[kHeadersList]

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
  // TODO: enable once permessage-deflate is supported
  const permessageDeflate = '' // 'permessage-deflate; 15'

  // 10. Append (`Sec-WebSocket-Extensions`, permessageDeflate) to
  //     request’s header list.
  // request.headersList.append('sec-websocket-extensions', permessageDeflate)

  // 11. Fetch request with useParallelQueue set to true, and
  //     processResponse given response being these steps:
  const controller = fetching({
    request,
    useParallelQueue: true,
    dispatcher: options.dispatcher ?? getGlobalDispatcher(),
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

      if (secExtension !== null && secExtension !== permessageDeflate) {
        failWebsocketConnection(ws, 'Received different permessage-deflate than the one set.')
        return
      }

      // 6. If the response includes a |Sec-WebSocket-Protocol| header field
      //    and this header field indicates the use of a subprotocol that was
      //    not present in the client's handshake (the server has indicated a
      //    subprotocol not requested by the client), the client MUST _Fail
      //    the WebSocket Connection_.
      const secProtocol = response.headersList.get('Sec-WebSocket-Protocol')

      if (secProtocol !== null && secProtocol !== request.headersList.get('Sec-WebSocket-Protocol')) {
        failWebsocketConnection(ws, 'Protocol was not set in the opening handshake.')
        return
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

      onEstablish(response)
    }
  })

  return controller
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

  // If the TCP connection was closed after the
  // WebSocket closing handshake was completed, the WebSocket connection
  // is said to have been closed _cleanly_.
  const wasClean = ws[kSentClose] && ws[kReceivedClose]

  let code = 1005
  let reason = ''

  const result = ws[kByteParser].closingInfo

  if (result) {
    code = result.code ?? 1005
    reason = result.reason
  } else if (!ws[kSentClose]) {
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
  fireEvent('close', ws, CloseEvent, {
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
  establishWebSocketConnection
}
