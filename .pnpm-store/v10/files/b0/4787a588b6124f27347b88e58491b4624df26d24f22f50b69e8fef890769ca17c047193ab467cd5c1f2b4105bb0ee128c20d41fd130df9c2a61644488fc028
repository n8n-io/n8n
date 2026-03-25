'use strict'

/* global WebAssembly */

const assert = require('node:assert')
const util = require('../core/util.js')
const { channels } = require('../core/diagnostics.js')
const timers = require('../util/timers.js')
const {
  RequestContentLengthMismatchError,
  ResponseContentLengthMismatchError,
  RequestAbortedError,
  HeadersTimeoutError,
  HeadersOverflowError,
  SocketError,
  InformationalError,
  BodyTimeoutError,
  HTTPParserError,
  ResponseExceededMaxSizeError
} = require('../core/errors.js')
const {
  kUrl,
  kReset,
  kClient,
  kParser,
  kBlocking,
  kRunning,
  kPending,
  kSize,
  kWriting,
  kQueue,
  kNoRef,
  kKeepAliveDefaultTimeout,
  kHostHeader,
  kPendingIdx,
  kRunningIdx,
  kError,
  kPipelining,
  kSocket,
  kKeepAliveTimeoutValue,
  kMaxHeadersSize,
  kKeepAliveMaxTimeout,
  kKeepAliveTimeoutThreshold,
  kHeadersTimeout,
  kBodyTimeout,
  kStrictContentLength,
  kMaxRequests,
  kCounter,
  kMaxResponseSize,
  kOnError,
  kResume,
  kHTTPContext
} = require('../core/symbols.js')

const constants = require('../llhttp/constants.js')
const EMPTY_BUF = Buffer.alloc(0)
const FastBuffer = Buffer[Symbol.species]
const addListener = util.addListener
const removeAllListeners = util.removeAllListeners

let extractBody

async function lazyllhttp () {
  const llhttpWasmData = process.env.JEST_WORKER_ID ? require('../llhttp/llhttp-wasm.js') : undefined

  let mod
  try {
    mod = await WebAssembly.compile(require('../llhttp/llhttp_simd-wasm.js'))
  } catch (e) {
    /* istanbul ignore next */

    // We could check if the error was caused by the simd option not
    // being enabled, but the occurring of this other error
    // * https://github.com/emscripten-core/emscripten/issues/11495
    // got me to remove that check to avoid breaking Node 12.
    mod = await WebAssembly.compile(llhttpWasmData || require('../llhttp/llhttp-wasm.js'))
  }

  return await WebAssembly.instantiate(mod, {
    env: {
      /* eslint-disable camelcase */

      wasm_on_url: (p, at, len) => {
        /* istanbul ignore next */
        return 0
      },
      wasm_on_status: (p, at, len) => {
        assert(currentParser.ptr === p)
        const start = at - currentBufferPtr + currentBufferRef.byteOffset
        return currentParser.onStatus(new FastBuffer(currentBufferRef.buffer, start, len)) || 0
      },
      wasm_on_message_begin: (p) => {
        assert(currentParser.ptr === p)
        return currentParser.onMessageBegin() || 0
      },
      wasm_on_header_field: (p, at, len) => {
        assert(currentParser.ptr === p)
        const start = at - currentBufferPtr + currentBufferRef.byteOffset
        return currentParser.onHeaderField(new FastBuffer(currentBufferRef.buffer, start, len)) || 0
      },
      wasm_on_header_value: (p, at, len) => {
        assert(currentParser.ptr === p)
        const start = at - currentBufferPtr + currentBufferRef.byteOffset
        return currentParser.onHeaderValue(new FastBuffer(currentBufferRef.buffer, start, len)) || 0
      },
      wasm_on_headers_complete: (p, statusCode, upgrade, shouldKeepAlive) => {
        assert(currentParser.ptr === p)
        return currentParser.onHeadersComplete(statusCode, Boolean(upgrade), Boolean(shouldKeepAlive)) || 0
      },
      wasm_on_body: (p, at, len) => {
        assert(currentParser.ptr === p)
        const start = at - currentBufferPtr + currentBufferRef.byteOffset
        return currentParser.onBody(new FastBuffer(currentBufferRef.buffer, start, len)) || 0
      },
      wasm_on_message_complete: (p) => {
        assert(currentParser.ptr === p)
        return currentParser.onMessageComplete() || 0
      }

      /* eslint-enable camelcase */
    }
  })
}

let llhttpInstance = null
let llhttpPromise = lazyllhttp()
llhttpPromise.catch()

let currentParser = null
let currentBufferRef = null
let currentBufferSize = 0
let currentBufferPtr = null

const USE_NATIVE_TIMER = 0
const USE_FAST_TIMER = 1

// Use fast timers for headers and body to take eventual event loop
// latency into account.
const TIMEOUT_HEADERS = 2 | USE_FAST_TIMER
const TIMEOUT_BODY = 4 | USE_FAST_TIMER

// Use native timers to ignore event loop latency for keep-alive
// handling.
const TIMEOUT_KEEP_ALIVE = 8 | USE_NATIVE_TIMER

class Parser {
  constructor (client, socket, { exports }) {
    assert(Number.isFinite(client[kMaxHeadersSize]) && client[kMaxHeadersSize] > 0)

    this.llhttp = exports
    this.ptr = this.llhttp.llhttp_alloc(constants.TYPE.RESPONSE)
    this.client = client
    this.socket = socket
    this.timeout = null
    this.timeoutValue = null
    this.timeoutType = null
    this.statusCode = null
    this.statusText = ''
    this.upgrade = false
    this.headers = []
    this.headersSize = 0
    this.headersMaxSize = client[kMaxHeadersSize]
    this.shouldKeepAlive = false
    this.paused = false
    this.resume = this.resume.bind(this)

    this.bytesRead = 0

    this.keepAlive = ''
    this.contentLength = ''
    this.connection = ''
    this.maxResponseSize = client[kMaxResponseSize]
  }

  setTimeout (delay, type) {
    // If the existing timer and the new timer are of different timer type
    // (fast or native) or have different delay, we need to clear the existing
    // timer and set a new one.
    if (
      delay !== this.timeoutValue ||
      (type & USE_FAST_TIMER) ^ (this.timeoutType & USE_FAST_TIMER)
    ) {
      // If a timeout is already set, clear it with clearTimeout of the fast
      // timer implementation, as it can clear fast and native timers.
      if (this.timeout) {
        timers.clearTimeout(this.timeout)
        this.timeout = null
      }

      if (delay) {
        if (type & USE_FAST_TIMER) {
          this.timeout = timers.setFastTimeout(onParserTimeout, delay, new WeakRef(this))
        } else {
          this.timeout = setTimeout(onParserTimeout, delay, new WeakRef(this))
          this.timeout.unref()
        }
      }

      this.timeoutValue = delay
    } else if (this.timeout) {
      // istanbul ignore else: only for jest
      if (this.timeout.refresh) {
        this.timeout.refresh()
      }
    }

    this.timeoutType = type
  }

  resume () {
    if (this.socket.destroyed || !this.paused) {
      return
    }

    assert(this.ptr != null)
    assert(currentParser == null)

    this.llhttp.llhttp_resume(this.ptr)

    assert(this.timeoutType === TIMEOUT_BODY)
    if (this.timeout) {
      // istanbul ignore else: only for jest
      if (this.timeout.refresh) {
        this.timeout.refresh()
      }
    }

    this.paused = false
    this.execute(this.socket.read() || EMPTY_BUF) // Flush parser.
    this.readMore()
  }

  readMore () {
    while (!this.paused && this.ptr) {
      const chunk = this.socket.read()
      if (chunk === null) {
        break
      }
      this.execute(chunk)
    }
  }

  execute (data) {
    assert(this.ptr != null)
    assert(currentParser == null)
    assert(!this.paused)

    const { socket, llhttp } = this

    if (data.length > currentBufferSize) {
      if (currentBufferPtr) {
        llhttp.free(currentBufferPtr)
      }
      currentBufferSize = Math.ceil(data.length / 4096) * 4096
      currentBufferPtr = llhttp.malloc(currentBufferSize)
    }

    new Uint8Array(llhttp.memory.buffer, currentBufferPtr, currentBufferSize).set(data)

    // Call `execute` on the wasm parser.
    // We pass the `llhttp_parser` pointer address, the pointer address of buffer view data,
    // and finally the length of bytes to parse.
    // The return value is an error code or `constants.ERROR.OK`.
    try {
      let ret

      try {
        currentBufferRef = data
        currentParser = this
        ret = llhttp.llhttp_execute(this.ptr, currentBufferPtr, data.length)
        /* eslint-disable-next-line no-useless-catch */
      } catch (err) {
        /* istanbul ignore next: difficult to make a test case for */
        throw err
      } finally {
        currentParser = null
        currentBufferRef = null
      }

      const offset = llhttp.llhttp_get_error_pos(this.ptr) - currentBufferPtr

      if (ret === constants.ERROR.PAUSED_UPGRADE) {
        this.onUpgrade(data.slice(offset))
      } else if (ret === constants.ERROR.PAUSED) {
        this.paused = true
        socket.unshift(data.slice(offset))
      } else if (ret !== constants.ERROR.OK) {
        const ptr = llhttp.llhttp_get_error_reason(this.ptr)
        let message = ''
        /* istanbul ignore else: difficult to make a test case for */
        if (ptr) {
          const len = new Uint8Array(llhttp.memory.buffer, ptr).indexOf(0)
          message =
            'Response does not match the HTTP/1.1 protocol (' +
            Buffer.from(llhttp.memory.buffer, ptr, len).toString() +
            ')'
        }
        throw new HTTPParserError(message, constants.ERROR[ret], data.slice(offset))
      }
    } catch (err) {
      util.destroy(socket, err)
    }
  }

  destroy () {
    assert(this.ptr != null)
    assert(currentParser == null)

    this.llhttp.llhttp_free(this.ptr)
    this.ptr = null

    this.timeout && timers.clearTimeout(this.timeout)
    this.timeout = null
    this.timeoutValue = null
    this.timeoutType = null

    this.paused = false
  }

  onStatus (buf) {
    this.statusText = buf.toString()
  }

  onMessageBegin () {
    const { socket, client } = this

    /* istanbul ignore next: difficult to make a test case for */
    if (socket.destroyed) {
      return -1
    }

    const request = client[kQueue][client[kRunningIdx]]
    if (!request) {
      return -1
    }
    request.onResponseStarted()
  }

  onHeaderField (buf) {
    const len = this.headers.length

    if ((len & 1) === 0) {
      this.headers.push(buf)
    } else {
      this.headers[len - 1] = Buffer.concat([this.headers[len - 1], buf])
    }

    this.trackHeader(buf.length)
  }

  onHeaderValue (buf) {
    let len = this.headers.length

    if ((len & 1) === 1) {
      this.headers.push(buf)
      len += 1
    } else {
      this.headers[len - 1] = Buffer.concat([this.headers[len - 1], buf])
    }

    const key = this.headers[len - 2]
    if (key.length === 10) {
      const headerName = util.bufferToLowerCasedHeaderName(key)
      if (headerName === 'keep-alive') {
        this.keepAlive += buf.toString()
      } else if (headerName === 'connection') {
        this.connection += buf.toString()
      }
    } else if (key.length === 14 && util.bufferToLowerCasedHeaderName(key) === 'content-length') {
      this.contentLength += buf.toString()
    }

    this.trackHeader(buf.length)
  }

  trackHeader (len) {
    this.headersSize += len
    if (this.headersSize >= this.headersMaxSize) {
      util.destroy(this.socket, new HeadersOverflowError())
    }
  }

  onUpgrade (head) {
    const { upgrade, client, socket, headers, statusCode } = this

    assert(upgrade)
    assert(client[kSocket] === socket)
    assert(!socket.destroyed)
    assert(!this.paused)
    assert((headers.length & 1) === 0)

    const request = client[kQueue][client[kRunningIdx]]
    assert(request)
    assert(request.upgrade || request.method === 'CONNECT')

    this.statusCode = null
    this.statusText = ''
    this.shouldKeepAlive = null

    this.headers = []
    this.headersSize = 0

    socket.unshift(head)

    socket[kParser].destroy()
    socket[kParser] = null

    socket[kClient] = null
    socket[kError] = null

    removeAllListeners(socket)

    client[kSocket] = null
    client[kHTTPContext] = null // TODO (fix): This is hacky...
    client[kQueue][client[kRunningIdx]++] = null
    client.emit('disconnect', client[kUrl], [client], new InformationalError('upgrade'))

    try {
      request.onUpgrade(statusCode, headers, socket)
    } catch (err) {
      util.destroy(socket, err)
    }

    client[kResume]()
  }

  onHeadersComplete (statusCode, upgrade, shouldKeepAlive) {
    const { client, socket, headers, statusText } = this

    /* istanbul ignore next: difficult to make a test case for */
    if (socket.destroyed) {
      return -1
    }

    const request = client[kQueue][client[kRunningIdx]]

    /* istanbul ignore next: difficult to make a test case for */
    if (!request) {
      return -1
    }

    assert(!this.upgrade)
    assert(this.statusCode < 200)

    if (statusCode === 100) {
      util.destroy(socket, new SocketError('bad response', util.getSocketInfo(socket)))
      return -1
    }

    /* this can only happen if server is misbehaving */
    if (upgrade && !request.upgrade) {
      util.destroy(socket, new SocketError('bad upgrade', util.getSocketInfo(socket)))
      return -1
    }

    assert(this.timeoutType === TIMEOUT_HEADERS)

    this.statusCode = statusCode
    this.shouldKeepAlive = (
      shouldKeepAlive ||
      // Override llhttp value which does not allow keepAlive for HEAD.
      (request.method === 'HEAD' && !socket[kReset] && this.connection.toLowerCase() === 'keep-alive')
    )

    if (this.statusCode >= 200) {
      const bodyTimeout = request.bodyTimeout != null
        ? request.bodyTimeout
        : client[kBodyTimeout]
      this.setTimeout(bodyTimeout, TIMEOUT_BODY)
    } else if (this.timeout) {
      // istanbul ignore else: only for jest
      if (this.timeout.refresh) {
        this.timeout.refresh()
      }
    }

    if (request.method === 'CONNECT') {
      assert(client[kRunning] === 1)
      this.upgrade = true
      return 2
    }

    if (upgrade) {
      assert(client[kRunning] === 1)
      this.upgrade = true
      return 2
    }

    assert((this.headers.length & 1) === 0)
    this.headers = []
    this.headersSize = 0

    if (this.shouldKeepAlive && client[kPipelining]) {
      const keepAliveTimeout = this.keepAlive ? util.parseKeepAliveTimeout(this.keepAlive) : null

      if (keepAliveTimeout != null) {
        const timeout = Math.min(
          keepAliveTimeout - client[kKeepAliveTimeoutThreshold],
          client[kKeepAliveMaxTimeout]
        )
        if (timeout <= 0) {
          socket[kReset] = true
        } else {
          client[kKeepAliveTimeoutValue] = timeout
        }
      } else {
        client[kKeepAliveTimeoutValue] = client[kKeepAliveDefaultTimeout]
      }
    } else {
      // Stop more requests from being dispatched.
      socket[kReset] = true
    }

    const pause = request.onHeaders(statusCode, headers, this.resume, statusText) === false

    if (request.aborted) {
      return -1
    }

    if (request.method === 'HEAD') {
      return 1
    }

    if (statusCode < 200) {
      return 1
    }

    if (socket[kBlocking]) {
      socket[kBlocking] = false
      client[kResume]()
    }

    return pause ? constants.ERROR.PAUSED : 0
  }

  onBody (buf) {
    const { client, socket, statusCode, maxResponseSize } = this

    if (socket.destroyed) {
      return -1
    }

    const request = client[kQueue][client[kRunningIdx]]
    assert(request)

    assert(this.timeoutType === TIMEOUT_BODY)
    if (this.timeout) {
      // istanbul ignore else: only for jest
      if (this.timeout.refresh) {
        this.timeout.refresh()
      }
    }

    assert(statusCode >= 200)

    if (maxResponseSize > -1 && this.bytesRead + buf.length > maxResponseSize) {
      util.destroy(socket, new ResponseExceededMaxSizeError())
      return -1
    }

    this.bytesRead += buf.length

    if (request.onData(buf) === false) {
      return constants.ERROR.PAUSED
    }
  }

  onMessageComplete () {
    const { client, socket, statusCode, upgrade, headers, contentLength, bytesRead, shouldKeepAlive } = this

    if (socket.destroyed && (!statusCode || shouldKeepAlive)) {
      return -1
    }

    if (upgrade) {
      return
    }

    assert(statusCode >= 100)
    assert((this.headers.length & 1) === 0)

    const request = client[kQueue][client[kRunningIdx]]
    assert(request)

    this.statusCode = null
    this.statusText = ''
    this.bytesRead = 0
    this.contentLength = ''
    this.keepAlive = ''
    this.connection = ''

    this.headers = []
    this.headersSize = 0

    if (statusCode < 200) {
      return
    }

    /* istanbul ignore next: should be handled by llhttp? */
    if (request.method !== 'HEAD' && contentLength && bytesRead !== parseInt(contentLength, 10)) {
      util.destroy(socket, new ResponseContentLengthMismatchError())
      return -1
    }

    request.onComplete(headers)

    client[kQueue][client[kRunningIdx]++] = null

    if (socket[kWriting]) {
      assert(client[kRunning] === 0)
      // Response completed before request.
      util.destroy(socket, new InformationalError('reset'))
      return constants.ERROR.PAUSED
    } else if (!shouldKeepAlive) {
      util.destroy(socket, new InformationalError('reset'))
      return constants.ERROR.PAUSED
    } else if (socket[kReset] && client[kRunning] === 0) {
      // Destroy socket once all requests have completed.
      // The request at the tail of the pipeline is the one
      // that requested reset and no further requests should
      // have been queued since then.
      util.destroy(socket, new InformationalError('reset'))
      return constants.ERROR.PAUSED
    } else if (client[kPipelining] == null || client[kPipelining] === 1) {
      // We must wait a full event loop cycle to reuse this socket to make sure
      // that non-spec compliant servers are not closing the connection even if they
      // said they won't.
      setImmediate(() => client[kResume]())
    } else {
      client[kResume]()
    }
  }
}

function onParserTimeout (parser) {
  const { socket, timeoutType, client, paused } = parser.deref()

  /* istanbul ignore else */
  if (timeoutType === TIMEOUT_HEADERS) {
    if (!socket[kWriting] || socket.writableNeedDrain || client[kRunning] > 1) {
      assert(!paused, 'cannot be paused while waiting for headers')
      util.destroy(socket, new HeadersTimeoutError())
    }
  } else if (timeoutType === TIMEOUT_BODY) {
    if (!paused) {
      util.destroy(socket, new BodyTimeoutError())
    }
  } else if (timeoutType === TIMEOUT_KEEP_ALIVE) {
    assert(client[kRunning] === 0 && client[kKeepAliveTimeoutValue])
    util.destroy(socket, new InformationalError('socket idle timeout'))
  }
}

async function connectH1 (client, socket) {
  client[kSocket] = socket

  if (!llhttpInstance) {
    llhttpInstance = await llhttpPromise
    llhttpPromise = null
  }

  socket[kNoRef] = false
  socket[kWriting] = false
  socket[kReset] = false
  socket[kBlocking] = false
  socket[kParser] = new Parser(client, socket, llhttpInstance)

  addListener(socket, 'error', function (err) {
    assert(err.code !== 'ERR_TLS_CERT_ALTNAME_INVALID')

    const parser = this[kParser]

    // On Mac OS, we get an ECONNRESET even if there is a full body to be forwarded
    // to the user.
    if (err.code === 'ECONNRESET' && parser.statusCode && !parser.shouldKeepAlive) {
      // We treat all incoming data so for as a valid response.
      parser.onMessageComplete()
      return
    }

    this[kError] = err

    this[kClient][kOnError](err)
  })
  addListener(socket, 'readable', function () {
    const parser = this[kParser]

    if (parser) {
      parser.readMore()
    }
  })
  addListener(socket, 'end', function () {
    const parser = this[kParser]

    if (parser.statusCode && !parser.shouldKeepAlive) {
      // We treat all incoming data so far as a valid response.
      parser.onMessageComplete()
      return
    }

    util.destroy(this, new SocketError('other side closed', util.getSocketInfo(this)))
  })
  addListener(socket, 'close', function () {
    const client = this[kClient]
    const parser = this[kParser]

    if (parser) {
      if (!this[kError] && parser.statusCode && !parser.shouldKeepAlive) {
        // We treat all incoming data so far as a valid response.
        parser.onMessageComplete()
      }

      this[kParser].destroy()
      this[kParser] = null
    }

    const err = this[kError] || new SocketError('closed', util.getSocketInfo(this))

    client[kSocket] = null
    client[kHTTPContext] = null // TODO (fix): This is hacky...

    if (client.destroyed) {
      assert(client[kPending] === 0)

      // Fail entire queue.
      const requests = client[kQueue].splice(client[kRunningIdx])
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i]
        util.errorRequest(client, request, err)
      }
    } else if (client[kRunning] > 0 && err.code !== 'UND_ERR_INFO') {
      // Fail head of pipeline.
      const request = client[kQueue][client[kRunningIdx]]
      client[kQueue][client[kRunningIdx]++] = null

      util.errorRequest(client, request, err)
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
    version: 'h1',
    defaultPipelining: 1,
    write (...args) {
      return writeH1(client, ...args)
    },
    resume () {
      resumeH1(client)
    },
    destroy (err, callback) {
      if (closed) {
        queueMicrotask(callback)
      } else {
        socket.destroy(err).on('close', callback)
      }
    },
    get destroyed () {
      return socket.destroyed
    },
    busy (request) {
      if (socket[kWriting] || socket[kReset] || socket[kBlocking]) {
        return true
      }

      if (request) {
        if (client[kRunning] > 0 && !request.idempotent) {
          // Non-idempotent request cannot be retried.
          // Ensure that no other requests are inflight and
          // could cause failure.
          return true
        }

        if (client[kRunning] > 0 && (request.upgrade || request.method === 'CONNECT')) {
          // Don't dispatch an upgrade until all preceding requests have completed.
          // A misbehaving server might upgrade the connection before all pipelined
          // request has completed.
          return true
        }

        if (client[kRunning] > 0 && util.bodyLength(request.body) !== 0 &&
          (util.isStream(request.body) || util.isAsyncIterable(request.body) || util.isFormDataLike(request.body))) {
          // Request with stream or iterator body can error while other requests
          // are inflight and indirectly error those as well.
          // Ensure this doesn't happen by waiting for inflight
          // to complete before dispatching.

          // Request with stream or iterator body cannot be retried.
          // Ensure that no other requests are inflight and
          // could cause failure.
          return true
        }
      }

      return false
    }
  }
}

function resumeH1 (client) {
  const socket = client[kSocket]

  if (socket && !socket.destroyed) {
    if (client[kSize] === 0) {
      if (!socket[kNoRef] && socket.unref) {
        socket.unref()
        socket[kNoRef] = true
      }
    } else if (socket[kNoRef] && socket.ref) {
      socket.ref()
      socket[kNoRef] = false
    }

    if (client[kSize] === 0) {
      if (socket[kParser].timeoutType !== TIMEOUT_KEEP_ALIVE) {
        socket[kParser].setTimeout(client[kKeepAliveTimeoutValue], TIMEOUT_KEEP_ALIVE)
      }
    } else if (client[kRunning] > 0 && socket[kParser].statusCode < 200) {
      if (socket[kParser].timeoutType !== TIMEOUT_HEADERS) {
        const request = client[kQueue][client[kRunningIdx]]
        const headersTimeout = request.headersTimeout != null
          ? request.headersTimeout
          : client[kHeadersTimeout]
        socket[kParser].setTimeout(headersTimeout, TIMEOUT_HEADERS)
      }
    }
  }
}

// https://www.rfc-editor.org/rfc/rfc7230#section-3.3.2
function shouldSendContentLength (method) {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && method !== 'TRACE' && method !== 'CONNECT'
}

function writeH1 (client, request) {
  const { method, path, host, upgrade, blocking, reset } = request

  let { body, headers, contentLength } = request

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
    method === 'PATCH' ||
    method === 'QUERY' ||
    method === 'PROPFIND' ||
    method === 'PROPPATCH'
  )

  if (util.isFormDataLike(body)) {
    if (!extractBody) {
      extractBody = require('../web/fetch/body.js').extractBody
    }

    const [bodyStream, contentType] = extractBody(body)
    if (request.contentType == null) {
      headers.push('content-type', contentType)
    }
    body = bodyStream.stream
    contentLength = bodyStream.length
  } else if (util.isBlobLike(body) && request.contentType == null && body.type) {
    headers.push('content-type', body.type)
  }

  if (body && typeof body.read === 'function') {
    // Try to read EOF in order to get length.
    body.read(0)
  }

  const bodyLength = util.bodyLength(body)

  contentLength = bodyLength ?? contentLength

  if (contentLength === null) {
    contentLength = request.contentLength
  }

  if (contentLength === 0 && !expectsPayload) {
    // https://tools.ietf.org/html/rfc7230#section-3.3.2
    // A user agent SHOULD NOT send a Content-Length header field when
    // the request message does not contain a payload body and the method
    // semantics do not anticipate such a body.

    contentLength = null
  }

  // https://github.com/nodejs/undici/issues/2046
  // A user agent may send a Content-Length header with 0 value, this should be allowed.
  if (shouldSendContentLength(method) && contentLength > 0 && request.contentLength !== null && request.contentLength !== contentLength) {
    if (client[kStrictContentLength]) {
      util.errorRequest(client, request, new RequestContentLengthMismatchError())
      return false
    }

    process.emitWarning(new RequestContentLengthMismatchError())
  }

  const socket = client[kSocket]

  const abort = (err) => {
    if (request.aborted || request.completed) {
      return
    }

    util.errorRequest(client, request, err || new RequestAbortedError())

    util.destroy(body)
    util.destroy(socket, new InformationalError('aborted'))
  }

  try {
    request.onConnect(abort)
  } catch (err) {
    util.errorRequest(client, request, err)
  }

  if (request.aborted) {
    return false
  }

  if (method === 'HEAD') {
    // https://github.com/mcollina/undici/issues/258
    // Close after a HEAD request to interop with misbehaving servers
    // that may send a body in the response.

    socket[kReset] = true
  }

  if (upgrade || method === 'CONNECT') {
    // On CONNECT or upgrade, block pipeline from dispatching further
    // requests on this connection.

    socket[kReset] = true
  }

  if (reset != null) {
    socket[kReset] = reset
  }

  if (client[kMaxRequests] && socket[kCounter]++ >= client[kMaxRequests]) {
    socket[kReset] = true
  }

  if (blocking) {
    socket[kBlocking] = true
  }

  let header = `${method} ${path} HTTP/1.1\r\n`

  if (typeof host === 'string') {
    header += `host: ${host}\r\n`
  } else {
    header += client[kHostHeader]
  }

  if (upgrade) {
    header += `connection: upgrade\r\nupgrade: ${upgrade}\r\n`
  } else if (client[kPipelining] && !socket[kReset]) {
    header += 'connection: keep-alive\r\n'
  } else {
    header += 'connection: close\r\n'
  }

  if (Array.isArray(headers)) {
    for (let n = 0; n < headers.length; n += 2) {
      const key = headers[n + 0]
      const val = headers[n + 1]

      if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          header += `${key}: ${val[i]}\r\n`
        }
      } else {
        header += `${key}: ${val}\r\n`
      }
    }
  }

  if (channels.sendHeaders.hasSubscribers) {
    channels.sendHeaders.publish({ request, headers: header, socket })
  }

  /* istanbul ignore else: assertion */
  if (!body || bodyLength === 0) {
    writeBuffer(abort, null, client, request, socket, contentLength, header, expectsPayload)
  } else if (util.isBuffer(body)) {
    writeBuffer(abort, body, client, request, socket, contentLength, header, expectsPayload)
  } else if (util.isBlobLike(body)) {
    if (typeof body.stream === 'function') {
      writeIterable(abort, body.stream(), client, request, socket, contentLength, header, expectsPayload)
    } else {
      writeBlob(abort, body, client, request, socket, contentLength, header, expectsPayload)
    }
  } else if (util.isStream(body)) {
    writeStream(abort, body, client, request, socket, contentLength, header, expectsPayload)
  } else if (util.isIterable(body)) {
    writeIterable(abort, body, client, request, socket, contentLength, header, expectsPayload)
  } else {
    assert(false)
  }

  return true
}

function writeStream (abort, body, client, request, socket, contentLength, header, expectsPayload) {
  assert(contentLength !== 0 || client[kRunning] === 0, 'stream body cannot be pipelined')

  let finished = false

  const writer = new AsyncWriter({ abort, socket, request, contentLength, client, expectsPayload, header })

  const onData = function (chunk) {
    if (finished) {
      return
    }

    try {
      if (!writer.write(chunk) && this.pause) {
        this.pause()
      }
    } catch (err) {
      util.destroy(this, err)
    }
  }
  const onDrain = function () {
    if (finished) {
      return
    }

    if (body.resume) {
      body.resume()
    }
  }
  const onClose = function () {
    // 'close' might be emitted *before* 'error' for
    // broken streams. Wait a tick to avoid this case.
    queueMicrotask(() => {
      // It's only safe to remove 'error' listener after
      // 'close'.
      body.removeListener('error', onFinished)
    })

    if (!finished) {
      const err = new RequestAbortedError()
      queueMicrotask(() => onFinished(err))
    }
  }
  const onFinished = function (err) {
    if (finished) {
      return
    }

    finished = true

    assert(socket.destroyed || (socket[kWriting] && client[kRunning] <= 1))

    socket
      .off('drain', onDrain)
      .off('error', onFinished)

    body
      .removeListener('data', onData)
      .removeListener('end', onFinished)
      .removeListener('close', onClose)

    if (!err) {
      try {
        writer.end()
      } catch (er) {
        err = er
      }
    }

    writer.destroy(err)

    if (err && (err.code !== 'UND_ERR_INFO' || err.message !== 'reset')) {
      util.destroy(body, err)
    } else {
      util.destroy(body)
    }
  }

  body
    .on('data', onData)
    .on('end', onFinished)
    .on('error', onFinished)
    .on('close', onClose)

  if (body.resume) {
    body.resume()
  }

  socket
    .on('drain', onDrain)
    .on('error', onFinished)

  if (body.errorEmitted ?? body.errored) {
    setImmediate(() => onFinished(body.errored))
  } else if (body.endEmitted ?? body.readableEnded) {
    setImmediate(() => onFinished(null))
  }

  if (body.closeEmitted ?? body.closed) {
    setImmediate(onClose)
  }
}

function writeBuffer (abort, body, client, request, socket, contentLength, header, expectsPayload) {
  try {
    if (!body) {
      if (contentLength === 0) {
        socket.write(`${header}content-length: 0\r\n\r\n`, 'latin1')
      } else {
        assert(contentLength === null, 'no body must not have content length')
        socket.write(`${header}\r\n`, 'latin1')
      }
    } else if (util.isBuffer(body)) {
      assert(contentLength === body.byteLength, 'buffer body must have content length')

      socket.cork()
      socket.write(`${header}content-length: ${contentLength}\r\n\r\n`, 'latin1')
      socket.write(body)
      socket.uncork()
      request.onBodySent(body)

      if (!expectsPayload && request.reset !== false) {
        socket[kReset] = true
      }
    }
    request.onRequestSent()

    client[kResume]()
  } catch (err) {
    abort(err)
  }
}

async function writeBlob (abort, body, client, request, socket, contentLength, header, expectsPayload) {
  assert(contentLength === body.size, 'blob body must have content length')

  try {
    if (contentLength != null && contentLength !== body.size) {
      throw new RequestContentLengthMismatchError()
    }

    const buffer = Buffer.from(await body.arrayBuffer())

    socket.cork()
    socket.write(`${header}content-length: ${contentLength}\r\n\r\n`, 'latin1')
    socket.write(buffer)
    socket.uncork()

    request.onBodySent(buffer)
    request.onRequestSent()

    if (!expectsPayload && request.reset !== false) {
      socket[kReset] = true
    }

    client[kResume]()
  } catch (err) {
    abort(err)
  }
}

async function writeIterable (abort, body, client, request, socket, contentLength, header, expectsPayload) {
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

  socket
    .on('close', onDrain)
    .on('drain', onDrain)

  const writer = new AsyncWriter({ abort, socket, request, contentLength, client, expectsPayload, header })
  try {
    // It's up to the user to somehow abort the async iterable.
    for await (const chunk of body) {
      if (socket[kError]) {
        throw socket[kError]
      }

      if (!writer.write(chunk)) {
        await waitForDrain()
      }
    }

    writer.end()
  } catch (err) {
    writer.destroy(err)
  } finally {
    socket
      .off('close', onDrain)
      .off('drain', onDrain)
  }
}

class AsyncWriter {
  constructor ({ abort, socket, request, contentLength, client, expectsPayload, header }) {
    this.socket = socket
    this.request = request
    this.contentLength = contentLength
    this.client = client
    this.bytesWritten = 0
    this.expectsPayload = expectsPayload
    this.header = header
    this.abort = abort

    socket[kWriting] = true
  }

  write (chunk) {
    const { socket, request, contentLength, client, bytesWritten, expectsPayload, header } = this

    if (socket[kError]) {
      throw socket[kError]
    }

    if (socket.destroyed) {
      return false
    }

    const len = Buffer.byteLength(chunk)
    if (!len) {
      return true
    }

    // We should defer writing chunks.
    if (contentLength !== null && bytesWritten + len > contentLength) {
      if (client[kStrictContentLength]) {
        throw new RequestContentLengthMismatchError()
      }

      process.emitWarning(new RequestContentLengthMismatchError())
    }

    socket.cork()

    if (bytesWritten === 0) {
      if (!expectsPayload && request.reset !== false) {
        socket[kReset] = true
      }

      if (contentLength === null) {
        socket.write(`${header}transfer-encoding: chunked\r\n`, 'latin1')
      } else {
        socket.write(`${header}content-length: ${contentLength}\r\n\r\n`, 'latin1')
      }
    }

    if (contentLength === null) {
      socket.write(`\r\n${len.toString(16)}\r\n`, 'latin1')
    }

    this.bytesWritten += len

    const ret = socket.write(chunk)

    socket.uncork()

    request.onBodySent(chunk)

    if (!ret) {
      if (socket[kParser].timeout && socket[kParser].timeoutType === TIMEOUT_HEADERS) {
        // istanbul ignore else: only for jest
        if (socket[kParser].timeout.refresh) {
          socket[kParser].timeout.refresh()
        }
      }
    }

    return ret
  }

  end () {
    const { socket, contentLength, client, bytesWritten, expectsPayload, header, request } = this
    request.onRequestSent()

    socket[kWriting] = false

    if (socket[kError]) {
      throw socket[kError]
    }

    if (socket.destroyed) {
      return
    }

    if (bytesWritten === 0) {
      if (expectsPayload) {
        // https://tools.ietf.org/html/rfc7230#section-3.3.2
        // A user agent SHOULD send a Content-Length in a request message when
        // no Transfer-Encoding is sent and the request method defines a meaning
        // for an enclosed payload body.

        socket.write(`${header}content-length: 0\r\n\r\n`, 'latin1')
      } else {
        socket.write(`${header}\r\n`, 'latin1')
      }
    } else if (contentLength === null) {
      socket.write('\r\n0\r\n\r\n', 'latin1')
    }

    if (contentLength !== null && bytesWritten !== contentLength) {
      if (client[kStrictContentLength]) {
        throw new RequestContentLengthMismatchError()
      } else {
        process.emitWarning(new RequestContentLengthMismatchError())
      }
    }

    if (socket[kParser].timeout && socket[kParser].timeoutType === TIMEOUT_HEADERS) {
      // istanbul ignore else: only for jest
      if (socket[kParser].timeout.refresh) {
        socket[kParser].timeout.refresh()
      }
    }

    client[kResume]()
  }

  destroy (err) {
    const { socket, client, abort } = this

    socket[kWriting] = false

    if (err) {
      assert(client[kRunning] <= 1, 'pipeline should only contain this request')
      abort(err)
    }
  }
}

module.exports = connectH1
