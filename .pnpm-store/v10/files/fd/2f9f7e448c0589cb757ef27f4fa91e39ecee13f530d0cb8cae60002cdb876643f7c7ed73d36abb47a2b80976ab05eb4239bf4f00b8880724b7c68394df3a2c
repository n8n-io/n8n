'use strict'

const assert = require('node:assert')
const { pipeline } = require('node:stream')
const util = require('../core/util.js')
const {
  RequestContentLengthMismatchError,
  RequestAbortedError,
  SocketError,
  InformationalError
} = require('../core/errors.js')
const {
  kUrl,
  kReset,
  kClient,
  kRunning,
  kPending,
  kQueue,
  kPendingIdx,
  kRunningIdx,
  kError,
  kSocket,
  kStrictContentLength,
  kOnError,
  kMaxConcurrentStreams,
  kHTTP2Session,
  kResume,
  kSize,
  kHTTPContext
} = require('../core/symbols.js')

const kOpenStreams = Symbol('open streams')

let extractBody

// Experimental
let h2ExperimentalWarned = false

/** @type {import('http2')} */
let http2
try {
  http2 = require('node:http2')
} catch {
  // @ts-ignore
  http2 = { constants: {} }
}

const {
  constants: {
    HTTP2_HEADER_AUTHORITY,
    HTTP2_HEADER_METHOD,
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_SCHEME,
    HTTP2_HEADER_CONTENT_LENGTH,
    HTTP2_HEADER_EXPECT,
    HTTP2_HEADER_STATUS
  }
} = http2

function parseH2Headers (headers) {
  const result = []

  for (const [name, value] of Object.entries(headers)) {
    // h2 may concat the header value by array
    // e.g. Set-Cookie
    if (Array.isArray(value)) {
      for (const subvalue of value) {
        // we need to provide each header value of header name
        // because the headers handler expect name-value pair
        result.push(Buffer.from(name), Buffer.from(subvalue))
      }
    } else {
      result.push(Buffer.from(name), Buffer.from(value))
    }
  }

  return result
}

async function connectH2 (client, socket) {
  client[kSocket] = socket

  if (!h2ExperimentalWarned) {
    h2ExperimentalWarned = true
    process.emitWarning('H2 support is experimental, expect them to change at any time.', {
      code: 'UNDICI-H2'
    })
  }

  const session = http2.connect(client[kUrl], {
    createConnection: () => socket,
    peerMaxConcurrentStreams: client[kMaxConcurrentStreams]
  })

  session[kOpenStreams] = 0
  session[kClient] = client
  session[kSocket] = socket

  util.addListener(session, 'error', onHttp2SessionError)
  util.addListener(session, 'frameError', onHttp2FrameError)
  util.addListener(session, 'end', onHttp2SessionEnd)
  util.addListener(session, 'goaway', onHTTP2GoAway)
  util.addListener(session, 'close', function () {
    const { [kClient]: client } = this
    const { [kSocket]: socket } = client

    const err = this[kSocket][kError] || this[kError] || new SocketError('closed', util.getSocketInfo(socket))

    client[kHTTP2Session] = null

    if (client.destroyed) {
      assert(client[kPending] === 0)

      // Fail entire queue.
      const requests = client[kQueue].splice(client[kRunningIdx])
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i]
        util.errorRequest(client, request, err)
      }
    }
  })

  session.unref()

  client[kHTTP2Session] = session
  socket[kHTTP2Session] = session

  util.addListener(socket, 'error', function (err) {
    assert(err.code !== 'ERR_TLS_CERT_ALTNAME_INVALID')

    this[kError] = err

    this[kClient][kOnError](err)
  })

  util.addListener(socket, 'end', function () {
    util.destroy(this, new SocketError('other side closed', util.getSocketInfo(this)))
  })

  util.addListener(socket, 'close', function () {
    const err = this[kError] || new SocketError('closed', util.getSocketInfo(this))

    client[kSocket] = null

    if (this[kHTTP2Session] != null) {
      this[kHTTP2Session].destroy(err)
    }

    client[kPendingIdx] = client[kRunningIdx]

    assert(client[kRunning] === 0)

    client.emit('disconnect', client[kUrl], [client], err)

    client[kResume]()
  })

  let closed = false
  socket.on('close', () => {
    closed = true
  })

  return {
    version: 'h2',
    defaultPipelining: Infinity,
    write (...args) {
      return writeH2(client, ...args)
    },
    resume () {
      resumeH2(client)
    },
    destroy (err, callback) {
      if (closed) {
        queueMicrotask(callback)
      } else {
        // Destroying the socket will trigger the session close
        socket.destroy(err).on('close', callback)
      }
    },
    get destroyed () {
      return socket.destroyed
    },
    busy () {
      return false
    }
  }
}

function resumeH2 (client) {
  const socket = client[kSocket]

  if (socket?.destroyed === false) {
    if (client[kSize] === 0 && client[kMaxConcurrentStreams] === 0) {
      socket.unref()
      client[kHTTP2Session].unref()
    } else {
      socket.ref()
      client[kHTTP2Session].ref()
    }
  }
}

function onHttp2SessionError (err) {
  assert(err.code !== 'ERR_TLS_CERT_ALTNAME_INVALID')

  this[kSocket][kError] = err
  this[kClient][kOnError](err)
}

function onHttp2FrameError (type, code, id) {
  if (id === 0) {
    const err = new InformationalError(`HTTP/2: "frameError" received - type ${type}, code ${code}`)
    this[kSocket][kError] = err
    this[kClient][kOnError](err)
  }
}

function onHttp2SessionEnd () {
  const err = new SocketError('other side closed', util.getSocketInfo(this[kSocket]))
  this.destroy(err)
  util.destroy(this[kSocket], err)
}

/**
 * This is the root cause of #3011
 * We need to handle GOAWAY frames properly, and trigger the session close
 * along with the socket right away
 */
function onHTTP2GoAway (code) {
  // We cannot recover, so best to close the session and the socket
  const err = this[kError] || new SocketError(`HTTP/2: "GOAWAY" frame received with code ${code}`, util.getSocketInfo(this))
  const client = this[kClient]

  client[kSocket] = null
  client[kHTTPContext] = null

  if (this[kHTTP2Session] != null) {
    this[kHTTP2Session].destroy(err)
    this[kHTTP2Session] = null
  }

  util.destroy(this[kSocket], err)

  // Fail head of pipeline.
  if (client[kRunningIdx] < client[kQueue].length) {
    const request = client[kQueue][client[kRunningIdx]]
    client[kQueue][client[kRunningIdx]++] = null
    util.errorRequest(client, request, err)
    client[kPendingIdx] = client[kRunningIdx]
  }

  assert(client[kRunning] === 0)

  client.emit('disconnect', client[kUrl], [client], err)

  client[kResume]()
}

// https://www.rfc-editor.org/rfc/rfc7230#section-3.3.2
function shouldSendContentLength (method) {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && method !== 'TRACE' && method !== 'CONNECT'
}

function writeH2 (client, request) {
  const session = client[kHTTP2Session]
  const { method, path, host, upgrade, expectContinue, signal, headers: reqHeaders } = request
  let { body } = request

  if (upgrade) {
    util.errorRequest(client, request, new Error('Upgrade not supported for H2'))
    return false
  }

  const headers = {}
  for (let n = 0; n < reqHeaders.length; n += 2) {
    const key = reqHeaders[n + 0]
    const val = reqHeaders[n + 1]

    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        if (headers[key]) {
          headers[key] += `,${val[i]}`
        } else {
          headers[key] = val[i]
        }
      }
    } else {
      headers[key] = val
    }
  }

  /** @type {import('node:http2').ClientHttp2Stream} */
  let stream

  const { hostname, port } = client[kUrl]

  headers[HTTP2_HEADER_AUTHORITY] = host || `${hostname}${port ? `:${port}` : ''}`
  headers[HTTP2_HEADER_METHOD] = method

  const abort = (err) => {
    if (request.aborted || request.completed) {
      return
    }

    err = err || new RequestAbortedError()

    util.errorRequest(client, request, err)

    if (stream != null) {
      util.destroy(stream, err)
    }

    // We do not destroy the socket as we can continue using the session
    // the stream get's destroyed and the session remains to create new streams
    util.destroy(body, err)
    client[kQueue][client[kRunningIdx]++] = null
    client[kResume]()
  }

  try {
    // We are already connected, streams are pending.
    // We can call on connect, and wait for abort
    request.onConnect(abort)
  } catch (err) {
    util.errorRequest(client, request, err)
  }

  if (request.aborted) {
    return false
  }

  if (method === 'CONNECT') {
    session.ref()
    // We are already connected, streams are pending, first request
    // will create a new stream. We trigger a request to create the stream and wait until
    // `ready` event is triggered
    // We disabled endStream to allow the user to write to the stream
    stream = session.request(headers, { endStream: false, signal })

    if (stream.id && !stream.pending) {
      request.onUpgrade(null, null, stream)
      ++session[kOpenStreams]
      client[kQueue][client[kRunningIdx]++] = null
    } else {
      stream.once('ready', () => {
        request.onUpgrade(null, null, stream)
        ++session[kOpenStreams]
        client[kQueue][client[kRunningIdx]++] = null
      })
    }

    stream.once('close', () => {
      session[kOpenStreams] -= 1
      if (session[kOpenStreams] === 0) session.unref()
    })

    return true
  }

  // https://tools.ietf.org/html/rfc7540#section-8.3
  // :path and :scheme headers must be omitted when sending CONNECT

  headers[HTTP2_HEADER_PATH] = path
  headers[HTTP2_HEADER_SCHEME] = 'https'

  // https://tools.ietf.org/html/rfc7231#section-4.3.1
  // https://tools.ietf.org/html/rfc7231#section-4.3.2
  // https://tools.ietf.org/html/rfc7231#section-4.3.5

  // Sending a payload body on a request that does not
  // expect it can cause undefined behavior on some
  // servers and corrupt connection state. Do not
  // re-use the connection for further requests.

  const expectsPayload = (
    method === 'PUT' ||
    method === 'POST' ||
    method === 'PATCH'
  )

  if (body && typeof body.read === 'function') {
    // Try to read EOF in order to get length.
    body.read(0)
  }

  let contentLength = util.bodyLength(body)

  if (util.isFormDataLike(body)) {
    extractBody ??= require('../web/fetch/body.js').extractBody

    const [bodyStream, contentType] = extractBody(body)
    headers['content-type'] = contentType

    body = bodyStream.stream
    contentLength = bodyStream.length
  }

  if (contentLength == null) {
    contentLength = request.contentLength
  }

  if (contentLength === 0 || !expectsPayload) {
    // https://tools.ietf.org/html/rfc7230#section-3.3.2
    // A user agent SHOULD NOT send a Content-Length header field when
    // the request message does not contain a payload body and the method
    // semantics do not anticipate such a body.

    contentLength = null
  }

  // https://github.com/nodejs/undici/issues/2046
  // A user agent may send a Content-Length header with 0 value, this should be allowed.
  if (shouldSendContentLength(method) && contentLength > 0 && request.contentLength != null && request.contentLength !== contentLength) {
    if (client[kStrictContentLength]) {
      util.errorRequest(client, request, new RequestContentLengthMismatchError())
      return false
    }

    process.emitWarning(new RequestContentLengthMismatchError())
  }

  if (contentLength != null) {
    assert(body, 'no body must not have content length')
    headers[HTTP2_HEADER_CONTENT_LENGTH] = `${contentLength}`
  }

  session.ref()

  const shouldEndStream = method === 'GET' || method === 'HEAD' || body === null
  if (expectContinue) {
    headers[HTTP2_HEADER_EXPECT] = '100-continue'
    stream = session.request(headers, { endStream: shouldEndStream, signal })

    stream.once('continue', writeBodyH2)
  } else {
    stream = session.request(headers, {
      endStream: shouldEndStream,
      signal
    })
    writeBodyH2()
  }

  // Increment counter as we have new streams open
  ++session[kOpenStreams]

  stream.once('response', headers => {
    const { [HTTP2_HEADER_STATUS]: statusCode, ...realHeaders } = headers
    request.onResponseStarted()

    // Due to the stream nature, it is possible we face a race condition
    // where the stream has been assigned, but the request has been aborted
    // the request remains in-flight and headers hasn't been received yet
    // for those scenarios, best effort is to destroy the stream immediately
    // as there's no value to keep it open.
    if (request.aborted) {
      const err = new RequestAbortedError()
      util.errorRequest(client, request, err)
      util.destroy(stream, err)
      return
    }

    if (request.onHeaders(Number(statusCode), parseH2Headers(realHeaders), stream.resume.bind(stream), '') === false) {
      stream.pause()
    }

    stream.on('data', (chunk) => {
      if (request.onData(chunk) === false) {
        stream.pause()
      }
    })
  })

  stream.once('end', () => {
    // When state is null, it means we haven't consumed body and the stream still do not have
    // a state.
    // Present specially when using pipeline or stream
    if (stream.state?.state == null || stream.state.state < 6) {
      request.onComplete([])
    }

    if (session[kOpenStreams] === 0) {
      // Stream is closed or half-closed-remote (6), decrement counter and cleanup
      // It does not have sense to continue working with the stream as we do not
      // have yet RST_STREAM support on client-side

      session.unref()
    }

    abort(new InformationalError('HTTP/2: stream half-closed (remote)'))
    client[kQueue][client[kRunningIdx]++] = null
    client[kPendingIdx] = client[kRunningIdx]
    client[kResume]()
  })

  stream.once('close', () => {
    session[kOpenStreams] -= 1
    if (session[kOpenStreams] === 0) {
      session.unref()
    }
  })

  stream.once('error', function (err) {
    abort(err)
  })

  stream.once('frameError', (type, code) => {
    abort(new InformationalError(`HTTP/2: "frameError" received - type ${type}, code ${code}`))
  })

  // stream.on('aborted', () => {
  //   // TODO(HTTP/2): Support aborted
  // })

  // stream.on('timeout', () => {
  //   // TODO(HTTP/2): Support timeout
  // })

  // stream.on('push', headers => {
  //   // TODO(HTTP/2): Support push
  // })

  // stream.on('trailers', headers => {
  //   // TODO(HTTP/2): Support trailers
  // })

  return true

  function writeBodyH2 () {
    /* istanbul ignore else: assertion */
    if (!body || contentLength === 0) {
      writeBuffer(
        abort,
        stream,
        null,
        client,
        request,
        client[kSocket],
        contentLength,
        expectsPayload
      )
    } else if (util.isBuffer(body)) {
      writeBuffer(
        abort,
        stream,
        body,
        client,
        request,
        client[kSocket],
        contentLength,
        expectsPayload
      )
    } else if (util.isBlobLike(body)) {
      if (typeof body.stream === 'function') {
        writeIterable(
          abort,
          stream,
          body.stream(),
          client,
          request,
          client[kSocket],
          contentLength,
          expectsPayload
        )
      } else {
        writeBlob(
          abort,
          stream,
          body,
          client,
          request,
          client[kSocket],
          contentLength,
          expectsPayload
        )
      }
    } else if (util.isStream(body)) {
      writeStream(
        abort,
        client[kSocket],
        expectsPayload,
        stream,
        body,
        client,
        request,
        contentLength
      )
    } else if (util.isIterable(body)) {
      writeIterable(
        abort,
        stream,
        body,
        client,
        request,
        client[kSocket],
        contentLength,
        expectsPayload
      )
    } else {
      assert(false)
    }
  }
}

function writeBuffer (abort, h2stream, body, client, request, socket, contentLength, expectsPayload) {
  try {
    if (body != null && util.isBuffer(body)) {
      assert(contentLength === body.byteLength, 'buffer body must have content length')
      h2stream.cork()
      h2stream.write(body)
      h2stream.uncork()
      h2stream.end()

      request.onBodySent(body)
    }

    if (!expectsPayload) {
      socket[kReset] = true
    }

    request.onRequestSent()
    client[kResume]()
  } catch (error) {
    abort(error)
  }
}

function writeStream (abort, socket, expectsPayload, h2stream, body, client, request, contentLength) {
  assert(contentLength !== 0 || client[kRunning] === 0, 'stream body cannot be pipelined')

  // For HTTP/2, is enough to pipe the stream
  const pipe = pipeline(
    body,
    h2stream,
    (err) => {
      if (err) {
        util.destroy(pipe, err)
        abort(err)
      } else {
        util.removeAllListeners(pipe)
        request.onRequestSent()

        if (!expectsPayload) {
          socket[kReset] = true
        }

        client[kResume]()
      }
    }
  )

  util.addListener(pipe, 'data', onPipeData)

  function onPipeData (chunk) {
    request.onBodySent(chunk)
  }
}

async function writeBlob (abort, h2stream, body, client, request, socket, contentLength, expectsPayload) {
  assert(contentLength === body.size, 'blob body must have content length')

  try {
    if (contentLength != null && contentLength !== body.size) {
      throw new RequestContentLengthMismatchError()
    }

    const buffer = Buffer.from(await body.arrayBuffer())

    h2stream.cork()
    h2stream.write(buffer)
    h2stream.uncork()
    h2stream.end()

    request.onBodySent(buffer)
    request.onRequestSent()

    if (!expectsPayload) {
      socket[kReset] = true
    }

    client[kResume]()
  } catch (err) {
    abort(err)
  }
}

async function writeIterable (abort, h2stream, body, client, request, socket, contentLength, expectsPayload) {
  assert(contentLength !== 0 || client[kRunning] === 0, 'iterator body cannot be pipelined')

  let callback = null
  function onDrain () {
    if (callback) {
      const cb = callback
      callback = null
      cb()
    }
  }

  const waitForDrain = () => new Promise((resolve, reject) => {
    assert(callback === null)

    if (socket[kError]) {
      reject(socket[kError])
    } else {
      callback = resolve
    }
  })

  h2stream
    .on('close', onDrain)
    .on('drain', onDrain)

  try {
    // It's up to the user to somehow abort the async iterable.
    for await (const chunk of body) {
      if (socket[kError]) {
        throw socket[kError]
      }

      const res = h2stream.write(chunk)
      request.onBodySent(chunk)
      if (!res) {
        await waitForDrain()
      }
    }

    h2stream.end()

    request.onRequestSent()

    if (!expectsPayload) {
      socket[kReset] = true
    }

    client[kResume]()
  } catch (err) {
    abort(err)
  } finally {
    h2stream
      .off('close', onDrain)
      .off('drain', onDrain)
  }
}

module.exports = connectH2
