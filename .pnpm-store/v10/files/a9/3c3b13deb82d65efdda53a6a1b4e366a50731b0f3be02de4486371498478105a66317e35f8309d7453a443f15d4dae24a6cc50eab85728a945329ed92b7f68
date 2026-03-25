// @ts-check

'use strict'

/* global WebAssembly */

const assert = require('assert')
const net = require('net')
const http = require('http')
const { pipeline } = require('stream')
const util = require('./core/util')
const timers = require('./timers')
const Request = require('./core/request')
const DispatcherBase = require('./dispatcher-base')
const {
  RequestContentLengthMismatchError,
  ResponseContentLengthMismatchError,
  InvalidArgumentError,
  RequestAbortedError,
  HeadersTimeoutError,
  HeadersOverflowError,
  SocketError,
  InformationalError,
  BodyTimeoutError,
  HTTPParserError,
  ResponseExceededMaxSizeError,
  ClientDestroyedError
} = require('./core/errors')
const buildConnector = require('./core/connect')
const {
  kUrl,
  kReset,
  kServerName,
  kClient,
  kBusy,
  kParser,
  kConnect,
  kBlocking,
  kResuming,
  kRunning,
  kPending,
  kSize,
  kWriting,
  kQueue,
  kConnected,
  kConnecting,
  kNeedDrain,
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
  kConnector,
  kMaxRedirections,
  kMaxRequests,
  kCounter,
  kClose,
  kDestroy,
  kDispatch,
  kInterceptors,
  kLocalAddress,
  kMaxResponseSize,
  kHTTPConnVersion,
  // HTTP2
  kHost,
  kHTTP2Session,
  kHTTP2SessionState,
  kHTTP2BuildRequest,
  kHTTP2CopyHeaders,
  kHTTP1BuildRequest
} = require('./core/symbols')

/** @type {import('http2')} */
let http2
try {
  http2 = require('http2')
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

// Experimental
let h2ExperimentalWarned = false

const FastBuffer = Buffer[Symbol.species]

const kClosedResolve = Symbol('kClosedResolve')

const channels = {}

try {
  const diagnosticsChannel = require('diagnostics_channel')
  channels.sendHeaders = diagnosticsChannel.channel('undici:client:sendHeaders')
  channels.beforeConnect = diagnosticsChannel.channel('undici:client:beforeConnect')
  channels.connectError = diagnosticsChannel.channel('undici:client:connectError')
  channels.connected = diagnosticsChannel.channel('undici:client:connected')
} catch {
  channels.sendHeaders = { hasSubscribers: false }
  channels.beforeConnect = { hasSubscribers: false }
  channels.connectError = { hasSubscribers: false }
  channels.connected = { hasSubscribers: false }
}

/**
 * @type {import('../types/client').default}
 */
class Client extends DispatcherBase {
  /**
   *
   * @param {string|URL} url
   * @param {import('../types/client').Client.Options} options
   */
  constructor (url, {
    interceptors,
    maxHeaderSize,
    headersTimeout,
    socketTimeout,
    requestTimeout,
    connectTimeout,
    bodyTimeout,
    idleTimeout,
    keepAlive,
    keepAliveTimeout,
    maxKeepAliveTimeout,
    keepAliveMaxTimeout,
    keepAliveTimeoutThreshold,
    socketPath,
    pipelining,
    tls,
    strictContentLength,
    maxCachedSessions,
    maxRedirections,
    connect,
    maxRequestsPerClient,
    localAddress,
    maxResponseSize,
    autoSelectFamily,
    autoSelectFamilyAttemptTimeout,
    // h2
    allowH2,
    maxConcurrentStreams
  } = {}) {
    super()

    if (keepAlive !== undefined) {
      throw new InvalidArgumentError('unsupported keepAlive, use pipelining=0 instead')
    }

    if (socketTimeout !== undefined) {
      throw new InvalidArgumentError('unsupported socketTimeout, use headersTimeout & bodyTimeout instead')
    }

    if (requestTimeout !== undefined) {
      throw new InvalidArgumentError('unsupported requestTimeout, use headersTimeout & bodyTimeout instead')
    }

    if (idleTimeout !== undefined) {
      throw new InvalidArgumentError('unsupported idleTimeout, use keepAliveTimeout instead')
    }

    if (maxKeepAliveTimeout !== undefined) {
      throw new InvalidArgumentError('unsupported maxKeepAliveTimeout, use keepAliveMaxTimeout instead')
    }

    if (maxHeaderSize != null && !Number.isFinite(maxHeaderSize)) {
      throw new InvalidArgumentError('invalid maxHeaderSize')
    }

    if (socketPath != null && typeof socketPath !== 'string') {
      throw new InvalidArgumentError('invalid socketPath')
    }

    if (connectTimeout != null && (!Number.isFinite(connectTimeout) || connectTimeout < 0)) {
      throw new InvalidArgumentError('invalid connectTimeout')
    }

    if (keepAliveTimeout != null && (!Number.isFinite(keepAliveTimeout) || keepAliveTimeout <= 0)) {
      throw new InvalidArgumentError('invalid keepAliveTimeout')
    }

    if (keepAliveMaxTimeout != null && (!Number.isFinite(keepAliveMaxTimeout) || keepAliveMaxTimeout <= 0)) {
      throw new InvalidArgumentError('invalid keepAliveMaxTimeout')
    }

    if (keepAliveTimeoutThreshold != null && !Number.isFinite(keepAliveTimeoutThreshold)) {
      throw new InvalidArgumentError('invalid keepAliveTimeoutThreshold')
    }

    if (headersTimeout != null && (!Number.isInteger(headersTimeout) || headersTimeout < 0)) {
      throw new InvalidArgumentError('headersTimeout must be a positive integer or zero')
    }

    if (bodyTimeout != null && (!Number.isInteger(bodyTimeout) || bodyTimeout < 0)) {
      throw new InvalidArgumentError('bodyTimeout must be a positive integer or zero')
    }

    if (connect != null && typeof connect !== 'function' && typeof connect !== 'object') {
      throw new InvalidArgumentError('connect must be a function or an object')
    }

    if (maxRedirections != null && (!Number.isInteger(maxRedirections) || maxRedirections < 0)) {
      throw new InvalidArgumentError('maxRedirections must be a positive number')
    }

    if (maxRequestsPerClient != null && (!Number.isInteger(maxRequestsPerClient) || maxRequestsPerClient < 0)) {
      throw new InvalidArgumentError('maxRequestsPerClient must be a positive number')
    }

    if (localAddress != null && (typeof localAddress !== 'string' || net.isIP(localAddress) === 0)) {
      throw new InvalidArgumentError('localAddress must be valid string IP address')
    }

    if (maxResponseSize != null && (!Number.isInteger(maxResponseSize) || maxResponseSize < -1)) {
      throw new InvalidArgumentError('maxResponseSize must be a positive number')
    }

    if (
      autoSelectFamilyAttemptTimeout != null &&
      (!Number.isInteger(autoSelectFamilyAttemptTimeout) || autoSelectFamilyAttemptTimeout < -1)
    ) {
      throw new InvalidArgumentError('autoSelectFamilyAttemptTimeout must be a positive number')
    }

    // h2
    if (allowH2 != null && typeof allowH2 !== 'boolean') {
      throw new InvalidArgumentError('allowH2 must be a valid boolean value')
    }

    if (maxConcurrentStreams != null && (typeof maxConcurrentStreams !== 'number' || maxConcurrentStreams < 1)) {
      throw new InvalidArgumentError('maxConcurrentStreams must be a possitive integer, greater than 0')
    }

    if (typeof connect !== 'function') {
      connect = buildConnector({
        ...tls,
        maxCachedSessions,
        allowH2,
        socketPath,
        timeout: connectTimeout,
        ...(util.nodeHasAutoSelectFamily && autoSelectFamily ? { autoSelectFamily, autoSelectFamilyAttemptTimeout } : undefined),
        ...connect
      })
    }

    this[kInterceptors] = interceptors && interceptors.Client && Array.isArray(interceptors.Client)
      ? interceptors.Client
      : [createRedirectInterceptor({ maxRedirections })]
    this[kUrl] = util.parseOrigin(url)
    this[kConnector] = connect
    this[kSocket] = null
    this[kPipelining] = pipelining != null ? pipelining : 1
    this[kMaxHeadersSize] = maxHeaderSize || http.maxHeaderSize
    this[kKeepAliveDefaultTimeout] = keepAliveTimeout == null ? 4e3 : keepAliveTimeout
    this[kKeepAliveMaxTimeout] = keepAliveMaxTimeout == null ? 600e3 : keepAliveMaxTimeout
    this[kKeepAliveTimeoutThreshold] = keepAliveTimeoutThreshold == null ? 1e3 : keepAliveTimeoutThreshold
    this[kKeepAliveTimeoutValue] = this[kKeepAliveDefaultTimeout]
    this[kServerName] = null
    this[kLocalAddress] = localAddress != null ? localAddress : null
    this[kResuming] = 0 // 0, idle, 1, scheduled, 2 resuming
    this[kNeedDrain] = 0 // 0, idle, 1, scheduled, 2 resuming
    this[kHostHeader] = `host: ${this[kUrl].hostname}${this[kUrl].port ? `:${this[kUrl].port}` : ''}\r\n`
    this[kBodyTimeout] = bodyTimeout != null ? bodyTimeout : 300e3
    this[kHeadersTimeout] = headersTimeout != null ? headersTimeout : 300e3
    this[kStrictContentLength] = strictContentLength == null ? true : strictContentLength
    this[kMaxRedirections] = maxRedirections
    this[kMaxRequests] = maxRequestsPerClient
    this[kClosedResolve] = null
    this[kMaxResponseSize] = maxResponseSize > -1 ? maxResponseSize : -1
    this[kHTTPConnVersion] = 'h1'

    // HTTP/2
    this[kHTTP2Session] = null
    this[kHTTP2SessionState] = !allowH2
      ? null
      : {
        // streams: null, // Fixed queue of streams - For future support of `push`
          openStreams: 0, // Keep track of them to decide wether or not unref the session
          maxConcurrentStreams: maxConcurrentStreams != null ? maxConcurrentStreams : 100 // Max peerConcurrentStreams for a Node h2 server
        }
    this[kHost] = `${this[kUrl].hostname}${this[kUrl].port ? `:${this[kUrl].port}` : ''}`

    // kQueue is built up of 3 sections separated by
    // the kRunningIdx and kPendingIdx indices.
    // |   complete   |   running   |   pending   |
    //                ^ kRunningIdx ^ kPendingIdx ^ kQueue.length
    // kRunningIdx points to the first running element.
    // kPendingIdx points to the first pending element.
    // This implements a fast queue with an amortized
    // time of O(1).

    this[kQueue] = []
    this[kRunningIdx] = 0
    this[kPendingIdx] = 0
  }

  get pipelining () {
    return this[kPipelining]
  }

  set pipelining (value) {
    this[kPipelining] = value
    resume(this, true)
  }

  get [kPending] () {
    return this[kQueue].length - this[kPendingIdx]
  }

  get [kRunning] () {
    return this[kPendingIdx] - this[kRunningIdx]
  }

  get [kSize] () {
    return this[kQueue].length - this[kRunningIdx]
  }

  get [kConnected] () {
    return !!this[kSocket] && !this[kConnecting] && !this[kSocket].destroyed
  }

  get [kBusy] () {
    const socket = this[kSocket]
    return (
      (socket && (socket[kReset] || socket[kWriting] || socket[kBlocking])) ||
      (this[kSize] >= (this[kPipelining] || 1)) ||
      this[kPending] > 0
    )
  }

  /* istanbul ignore: only used for test */
  [kConnect] (cb) {
    connect(this)
    this.once('connect', cb)
  }

  [kDispatch] (opts, handler) {
    const origin = opts.origin || this[kUrl].origin

    const request = this[kHTTPConnVersion] === 'h2'
      ? Request[kHTTP2BuildRequest](origin, opts, handler)
      : Request[kHTTP1BuildRequest](origin, opts, handler)

    this[kQueue].push(request)
    if (this[kResuming]) {
      // Do nothing.
    } else if (util.bodyLength(request.body) == null && util.isIterable(request.body)) {
      // Wait a tick in case stream/iterator is ended in the same tick.
      this[kResuming] = 1
      process.nextTick(resume, this)
    } else {
      resume(this, true)
    }

    if (this[kResuming] && this[kNeedDrain] !== 2 && this[kBusy]) {
      this[kNeedDrain] = 2
    }

    return this[kNeedDrain] < 2
  }

  async [kClose] () {
    // TODO: for H2 we need to gracefully flush the remaining enqueued
    // request and close each stream.
    return new Promise((resolve) => {
      if (!this[kSize]) {
        resolve(null)
      } else {
        this[kClosedResolve] = resolve
      }
    })
  }

  async [kDestroy] (err) {
    return new Promise((resolve) => {
      const requests = this[kQueue].splice(this[kPendingIdx])
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i]
        errorRequest(this, request, err)
      }

      const callback = () => {
        if (this[kClosedResolve]) {
          // TODO (fix): Should we error here with ClientDestroyedError?
          this[kClosedResolve]()
          this[kClosedResolve] = null
        }
        resolve()
      }

      if (this[kHTTP2Session] != null) {
        util.destroy(this[kHTTP2Session], err)
        this[kHTTP2Session] = null
        this[kHTTP2SessionState] = null
      }

      if (!this[kSocket]) {
        queueMicrotask(callback)
      } else {
        util.destroy(this[kSocket].on('close', callback), err)
      }

      resume(this)
    })
  }
}

function onHttp2SessionError (err) {
  assert(err.code !== 'ERR_TLS_CERT_ALTNAME_INVALID')

  this[kSocket][kError] = err

  onError(this[kClient], err)
}

function onHttp2FrameError (type, code, id) {
  const err = new InformationalError(`HTTP/2: "frameError" received - type ${type}, code ${code}`)

  if (id === 0) {
    this[kSocket][kError] = err
    onError(this[kClient], err)
  }
}

function onHttp2SessionEnd () {
  util.destroy(this, new SocketError('other side closed'))
  util.destroy(this[kSocket], new SocketError('other side closed'))
}

function onHTTP2GoAway (code) {
  const client = this[kClient]
  const err = new InformationalError(`HTTP/2: "GOAWAY" frame received with code ${code}`)
  client[kSocket] = null
  client[kHTTP2Session] = null

  if (client.destroyed) {
    assert(this[kPending] === 0)

    // Fail entire queue.
    const requests = client[kQueue].splice(client[kRunningIdx])
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i]
      errorRequest(this, request, err)
    }
  } else if (client[kRunning] > 0) {
    // Fail head of pipeline.
    const request = client[kQueue][client[kRunningIdx]]
    client[kQueue][client[kRunningIdx]++] = null

    errorRequest(client, request, err)
  }

  client[kPendingIdx] = client[kRunningIdx]

  assert(client[kRunning] === 0)

  client.emit('disconnect',
    client[kUrl],
    [client],
    err
  )

  resume(client)
}

const constants = require('./llhttp/constants')
const createRedirectInterceptor = require('./interceptor/redirectInterceptor')
const EMPTY_BUF = Buffer.alloc(0)

async function lazyllhttp () {
  const llhttpWasmData = process.env.JEST_WORKER_ID ? require('./llhttp/llhttp-wasm.js') : undefined

  let mod
  try {
    mod = await WebAssembly.compile(Buffer.from(require('./llhttp/llhttp_simd-wasm.js'), 'base64'))
  } catch (e) {
    /* istanbul ignore next */

    // We could check if the error was caused by the simd option not
    // being enabled, but the occurring of this other error
    // * https://github.com/emscripten-core/emscripten/issues/11495
    // got me to remove that check to avoid breaking Node 12.
    mod = await WebAssembly.compile(Buffer.from(llhttpWasmData || require('./llhttp/llhttp-wasm.js'), 'base64'))
  }

  return await WebAssembly.instantiate(mod, {
    env: {
      /* eslint-disable camelcase */

      wasm_on_url: (p, at, len) => {
        /* istanbul ignore next */
        return 0
      },
      wasm_on_status: (p, at, len) => {
        assert.strictEqual(currentParser.ptr, p)
        const start = at - currentBufferPtr + currentBufferRef.byteOffset
        return currentParser.onStatus(new FastBuffer(currentBufferRef.buffer, start, len)) || 0
      },
      wasm_on_message_begin: (p) => {
        assert.strictEqual(currentParser.ptr, p)
        return currentParser.onMessageBegin() || 0
      },
      wasm_on_header_field: (p, at, len) => {
        assert.strictEqual(currentParser.ptr, p)
        const start = at - currentBufferPtr + currentBufferRef.byteOffset
        return currentParser.onHeaderField(new FastBuffer(currentBufferRef.buffer, start, len)) || 0
      },
      wasm_on_header_value: (p, at, len) => {
        assert.strictEqual(currentParser.ptr, p)
        const start = at - currentBufferPtr + currentBufferRef.byteOffset
        return currentParser.onHeaderValue(new FastBuffer(currentBufferRef.buffer, start, len)) || 0
      },
      wasm_on_headers_complete: (p, statusCode, upgrade, shouldKeepAlive) => {
        assert.strictEqual(currentParser.ptr, p)
        return currentParser.onHeadersComplete(statusCode, Boolean(upgrade), Boolean(shouldKeepAlive)) || 0
      },
      wasm_on_body: (p, at, len) => {
        assert.strictEqual(currentParser.ptr, p)
        const start = at - currentBufferPtr + currentBufferRef.byteOffset
        return currentParser.onBody(new FastBuffer(currentBufferRef.buffer, start, len)) || 0
      },
      wasm_on_message_complete: (p) => {
        assert.strictEqual(currentParser.ptr, p)
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

const TIMEOUT_HEADERS = 1
const TIMEOUT_BODY = 2
const TIMEOUT_IDLE = 3

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

  setTimeout (value, type) {
    this.timeoutType = type
    if (value !== this.timeoutValue) {
      timers.clearTimeout(this.timeout)
      if (value) {
        this.timeout = timers.setTimeout(onParserTimeout, value, this)
        // istanbul ignore else: only for jest
        if (this.timeout.unref) {
          this.timeout.unref()
        }
      } else {
        this.timeout = null
      }
      this.timeoutValue = value
    } else if (this.timeout) {
      // istanbul ignore else: only for jest
      if (this.timeout.refresh) {
        this.timeout.refresh()
      }
    }
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

    timers.clearTimeout(this.timeout)
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
    if (key.length === 10 && key.toString().toLowerCase() === 'keep-alive') {
      this.keepAlive += buf.toString()
    } else if (key.length === 10 && key.toString().toLowerCase() === 'connection') {
      this.connection += buf.toString()
    } else if (key.length === 14 && key.toString().toLowerCase() === 'content-length') {
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

    const request = client[kQueue][client[kRunningIdx]]
    assert(request)

    assert(!socket.destroyed)
    assert(socket === client[kSocket])
    assert(!this.paused)
    assert(request.upgrade || request.method === 'CONNECT')

    this.statusCode = null
    this.statusText = ''
    this.shouldKeepAlive = null

    assert(this.headers.length % 2 === 0)
    this.headers = []
    this.headersSize = 0

    socket.unshift(head)

    socket[kParser].destroy()
    socket[kParser] = null

    socket[kClient] = null
    socket[kError] = null
    socket
      .removeListener('error', onSocketError)
      .removeListener('readable', onSocketReadable)
      .removeListener('end', onSocketEnd)
      .removeListener('close', onSocketClose)

    client[kSocket] = null
    client[kQueue][client[kRunningIdx]++] = null
    client.emit('disconnect', client[kUrl], [client], new InformationalError('upgrade'))

    try {
      request.onUpgrade(statusCode, headers, socket)
    } catch (err) {
      util.destroy(socket, err)
    }

    resume(client)
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

    assert.strictEqual(this.timeoutType, TIMEOUT_HEADERS)

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

    assert(this.headers.length % 2 === 0)
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
      resume(client)
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

    assert.strictEqual(this.timeoutType, TIMEOUT_BODY)
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

    const request = client[kQueue][client[kRunningIdx]]
    assert(request)

    assert(statusCode >= 100)

    this.statusCode = null
    this.statusText = ''
    this.bytesRead = 0
    this.contentLength = ''
    this.keepAlive = ''
    this.connection = ''

    assert(this.headers.length % 2 === 0)
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
      assert.strictEqual(client[kRunning], 0)
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
    } else if (client[kPipelining] === 1) {
      // We must wait a full event loop cycle to reuse this socket to make sure
      // that non-spec compliant servers are not closing the connection even if they
      // said they won't.
      setImmediate(resume, client)
    } else {
      resume(client)
    }
  }
}

function onParserTimeout (parser) {
  const { socket, timeoutType, client } = parser

  /* istanbul ignore else */
  if (timeoutType === TIMEOUT_HEADERS) {
    if (!socket[kWriting] || socket.writableNeedDrain || client[kRunning] > 1) {
      assert(!parser.paused, 'cannot be paused while waiting for headers')
      util.destroy(socket, new HeadersTimeoutError())
    }
  } else if (timeoutType === TIMEOUT_BODY) {
    if (!parser.paused) {
      util.destroy(socket, new BodyTimeoutError())
    }
  } else if (timeoutType === TIMEOUT_IDLE) {
    assert(client[kRunning] === 0 && client[kKeepAliveTimeoutValue])
    util.destroy(socket, new InformationalError('socket idle timeout'))
  }
}

function onSocketReadable () {
  const { [kParser]: parser } = this
  if (parser) {
    parser.readMore()
  }
}

function onSocketError (err) {
  const { [kClient]: client, [kParser]: parser } = this

  assert(err.code !== 'ERR_TLS_CERT_ALTNAME_INVALID')

  if (client[kHTTPConnVersion] !== 'h2') {
    // On Mac OS, we get an ECONNRESET even if there is a full body to be forwarded
    // to the user.
    if (err.code === 'ECONNRESET' && parser.statusCode && !parser.shouldKeepAlive) {
      // We treat all incoming data so for as a valid response.
      parser.onMessageComplete()
      return
    }
  }

  this[kError] = err

  onError(this[kClient], err)
}

function onError (client, err) {
  if (
    client[kRunning] === 0 &&
    err.code !== 'UND_ERR_INFO' &&
    err.code !== 'UND_ERR_SOCKET'
  ) {
    // Error is not caused by running request and not a recoverable
    // socket error.

    assert(client[kPendingIdx] === client[kRunningIdx])

    const requests = client[kQueue].splice(client[kRunningIdx])
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i]
      errorRequest(client, request, err)
    }
    assert(client[kSize] === 0)
  }
}

function onSocketEnd () {
  const { [kParser]: parser, [kClient]: client } = this

  if (client[kHTTPConnVersion] !== 'h2') {
    if (parser.statusCode && !parser.shouldKeepAlive) {
      // We treat all incoming data so far as a valid response.
      parser.onMessageComplete()
      return
    }
  }

  util.destroy(this, new SocketError('other side closed', util.getSocketInfo(this)))
}

function onSocketClose () {
  const { [kClient]: client, [kParser]: parser } = this

  if (client[kHTTPConnVersion] === 'h1' && parser) {
    if (!this[kError] && parser.statusCode && !parser.shouldKeepAlive) {
      // We treat all incoming data so far as a valid response.
      parser.onMessageComplete()
    }

    this[kParser].destroy()
    this[kParser] = null
  }

  const err = this[kError] || new SocketError('closed', util.getSocketInfo(this))

  client[kSocket] = null

  if (client.destroyed) {
    assert(client[kPending] === 0)

    // Fail entire queue.
    const requests = client[kQueue].splice(client[kRunningIdx])
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i]
      errorRequest(client, request, err)
    }
  } else if (client[kRunning] > 0 && err.code !== 'UND_ERR_INFO') {
    // Fail head of pipeline.
    const request = client[kQueue][client[kRunningIdx]]
    client[kQueue][client[kRunningIdx]++] = null

    errorRequest(client, request, err)
  }

  client[kPendingIdx] = client[kRunningIdx]

  assert(client[kRunning] === 0)

  client.emit('disconnect', client[kUrl], [client], err)

  resume(client)
}

async function connect (client) {
  assert(!client[kConnecting])
  assert(!client[kSocket])

  let { host, hostname, protocol, port } = client[kUrl]

  // Resolve ipv6
  if (hostname[0] === '[') {
    const idx = hostname.indexOf(']')

    assert(idx !== -1)
    const ip = hostname.substring(1, idx)

    assert(net.isIP(ip))
    hostname = ip
  }

  client[kConnecting] = true

  if (channels.beforeConnect.hasSubscribers) {
    channels.beforeConnect.publish({
      connectParams: {
        host,
        hostname,
        protocol,
        port,
        servername: client[kServerName],
        localAddress: client[kLocalAddress]
      },
      connector: client[kConnector]
    })
  }

  try {
    const socket = await new Promise((resolve, reject) => {
      client[kConnector]({
        host,
        hostname,
        protocol,
        port,
        servername: client[kServerName],
        localAddress: client[kLocalAddress]
      }, (err, socket) => {
        if (err) {
          reject(err)
        } else {
          resolve(socket)
        }
      })
    })

    if (client.destroyed) {
      util.destroy(socket.on('error', () => {}), new ClientDestroyedError())
      return
    }

    client[kConnecting] = false

    assert(socket)

    const isH2 = socket.alpnProtocol === 'h2'
    if (isH2) {
      if (!h2ExperimentalWarned) {
        h2ExperimentalWarned = true
        process.emitWarning('H2 support is experimental, expect them to change at any time.', {
          code: 'UNDICI-H2'
        })
      }

      const session = http2.connect(client[kUrl], {
        createConnection: () => socket,
        peerMaxConcurrentStreams: client[kHTTP2SessionState].maxConcurrentStreams
      })

      client[kHTTPConnVersion] = 'h2'
      session[kClient] = client
      session[kSocket] = socket
      session.on('error', onHttp2SessionError)
      session.on('frameError', onHttp2FrameError)
      session.on('end', onHttp2SessionEnd)
      session.on('goaway', onHTTP2GoAway)
      session.on('close', onSocketClose)
      session.unref()

      client[kHTTP2Session] = session
      socket[kHTTP2Session] = session
    } else {
      if (!llhttpInstance) {
        llhttpInstance = await llhttpPromise
        llhttpPromise = null
      }

      socket[kNoRef] = false
      socket[kWriting] = false
      socket[kReset] = false
      socket[kBlocking] = false
      socket[kParser] = new Parser(client, socket, llhttpInstance)
    }

    socket[kCounter] = 0
    socket[kMaxRequests] = client[kMaxRequests]
    socket[kClient] = client
    socket[kError] = null

    socket
      .on('error', onSocketError)
      .on('readable', onSocketReadable)
      .on('end', onSocketEnd)
      .on('close', onSocketClose)

    client[kSocket] = socket

    if (channels.connected.hasSubscribers) {
      channels.connected.publish({
        connectParams: {
          host,
          hostname,
          protocol,
          port,
          servername: client[kServerName],
          localAddress: client[kLocalAddress]
        },
        connector: client[kConnector],
        socket
      })
    }
    client.emit('connect', client[kUrl], [client])
  } catch (err) {
    if (client.destroyed) {
      return
    }

    client[kConnecting] = false

    if (channels.connectError.hasSubscribers) {
      channels.connectError.publish({
        connectParams: {
          host,
          hostname,
          protocol,
          port,
          servername: client[kServerName],
          localAddress: client[kLocalAddress]
        },
        connector: client[kConnector],
        error: err
      })
    }

    if (err.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
      assert(client[kRunning] === 0)
      while (client[kPending] > 0 && client[kQueue][client[kPendingIdx]].servername === client[kServerName]) {
        const request = client[kQueue][client[kPendingIdx]++]
        errorRequest(client, request, err)
      }
    } else {
      onError(client, err)
    }

    client.emit('connectionError', client[kUrl], [client], err)
  }

  resume(client)
}

function emitDrain (client) {
  client[kNeedDrain] = 0
  client.emit('drain', client[kUrl], [client])
}

function resume (client, sync) {
  if (client[kResuming] === 2) {
    return
  }

  client[kResuming] = 2

  _resume(client, sync)
  client[kResuming] = 0

  if (client[kRunningIdx] > 256) {
    client[kQueue].splice(0, client[kRunningIdx])
    client[kPendingIdx] -= client[kRunningIdx]
    client[kRunningIdx] = 0
  }
}

function _resume (client, sync) {
  while (true) {
    if (client.destroyed) {
      assert(client[kPending] === 0)
      return
    }

    if (client[kClosedResolve] && !client[kSize]) {
      client[kClosedResolve]()
      client[kClosedResolve] = null
      return
    }

    const socket = client[kSocket]

    if (socket && !socket.destroyed && socket.alpnProtocol !== 'h2') {
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
        if (socket[kParser].timeoutType !== TIMEOUT_IDLE) {
          socket[kParser].setTimeout(client[kKeepAliveTimeoutValue], TIMEOUT_IDLE)
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

    if (client[kBusy]) {
      client[kNeedDrain] = 2
    } else if (client[kNeedDrain] === 2) {
      if (sync) {
        client[kNeedDrain] = 1
        process.nextTick(emitDrain, client)
      } else {
        emitDrain(client)
      }
      continue
    }

    if (client[kPending] === 0) {
      return
    }

    if (client[kRunning] >= (client[kPipelining] || 1)) {
      return
    }

    const request = client[kQueue][client[kPendingIdx]]

    if (client[kUrl].protocol === 'https:' && client[kServerName] !== request.servername) {
      if (client[kRunning] > 0) {
        return
      }

      client[kServerName] = request.servername

      if (socket && socket.servername !== request.servername) {
        util.destroy(socket, new InformationalError('servername changed'))
        return
      }
    }

    if (client[kConnecting]) {
      return
    }

    if (!socket && !client[kHTTP2Session]) {
      connect(client)
      return
    }

    if (socket.destroyed || socket[kWriting] || socket[kReset] || socket[kBlocking]) {
      return
    }

    if (client[kRunning] > 0 && !request.idempotent) {
      // Non-idempotent request cannot be retried.
      // Ensure that no other requests are inflight and
      // could cause failure.
      return
    }

    if (client[kRunning] > 0 && (request.upgrade || request.method === 'CONNECT')) {
      // Don't dispatch an upgrade until all preceding requests have completed.
      // A misbehaving server might upgrade the connection before all pipelined
      // request has completed.
      return
    }

    if (client[kRunning] > 0 && util.bodyLength(request.body) !== 0 &&
      (util.isStream(request.body) || util.isAsyncIterable(request.body))) {
      // Request with stream or iterator body can error while other requests
      // are inflight and indirectly error those as well.
      // Ensure this doesn't happen by waiting for inflight
      // to complete before dispatching.

      // Request with stream or iterator body cannot be retried.
      // Ensure that no other requests are inflight and
      // could cause failure.
      return
    }

    if (!request.aborted && write(client, request)) {
      client[kPendingIdx]++
    } else {
      client[kQueue].splice(client[kPendingIdx], 1)
    }
  }
}

// https://www.rfc-editor.org/rfc/rfc7230#section-3.3.2
function shouldSendContentLength (method) {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && method !== 'TRACE' && method !== 'CONNECT'
}

function write (client, request) {
  if (client[kHTTPConnVersion] === 'h2') {
    writeH2(client, client[kHTTP2Session], request)
    return
  }

  const { body, method, path, host, upgrade, headers, blocking, reset } = request

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

  const bodyLength = util.bodyLength(body)

  let contentLength = bodyLength

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
      errorRequest(client, request, new RequestContentLengthMismatchError())
      return false
    }

    process.emitWarning(new RequestContentLengthMismatchError())
  }

  const socket = client[kSocket]

  try {
    request.onConnect((err) => {
      if (request.aborted || request.completed) {
        return
      }

      errorRequest(client, request, err || new RequestAbortedError())

      util.destroy(socket, new InformationalError('aborted'))
    })
  } catch (err) {
    errorRequest(client, request, err)
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

  if (headers) {
    header += headers
  }

  if (channels.sendHeaders.hasSubscribers) {
    channels.sendHeaders.publish({ request, headers: header, socket })
  }

  /* istanbul ignore else: assertion */
  if (!body || bodyLength === 0) {
    if (contentLength === 0) {
      socket.write(`${header}content-length: 0\r\n\r\n`, 'latin1')
    } else {
      assert(contentLength === null, 'no body must not have content length')
      socket.write(`${header}\r\n`, 'latin1')
    }
    request.onRequestSent()
  } else if (util.isBuffer(body)) {
    assert(contentLength === body.byteLength, 'buffer body must have content length')

    socket.cork()
    socket.write(`${header}content-length: ${contentLength}\r\n\r\n`, 'latin1')
    socket.write(body)
    socket.uncork()
    request.onBodySent(body)
    request.onRequestSent()
    if (!expectsPayload) {
      socket[kReset] = true
    }
  } else if (util.isBlobLike(body)) {
    if (typeof body.stream === 'function') {
      writeIterable({ body: body.stream(), client, request, socket, contentLength, header, expectsPayload })
    } else {
      writeBlob({ body, client, request, socket, contentLength, header, expectsPayload })
    }
  } else if (util.isStream(body)) {
    writeStream({ body, client, request, socket, contentLength, header, expectsPayload })
  } else if (util.isIterable(body)) {
    writeIterable({ body, client, request, socket, contentLength, header, expectsPayload })
  } else {
    assert(false)
  }

  return true
}

function writeH2 (client, session, request) {
  const { body, method, path, host, upgrade, expectContinue, signal, headers: reqHeaders } = request

  let headers
  if (typeof reqHeaders === 'string') headers = Request[kHTTP2CopyHeaders](reqHeaders.trim())
  else headers = reqHeaders

  if (upgrade) {
    errorRequest(client, request, new Error('Upgrade not supported for H2'))
    return false
  }

  try {
    // TODO(HTTP/2): Should we call onConnect immediately or on stream ready event?
    request.onConnect((err) => {
      if (request.aborted || request.completed) {
        return
      }

      errorRequest(client, request, err || new RequestAbortedError())
    })
  } catch (err) {
    errorRequest(client, request, err)
  }

  if (request.aborted) {
    return false
  }

  /** @type {import('node:http2').ClientHttp2Stream} */
  let stream
  const h2State = client[kHTTP2SessionState]

  headers[HTTP2_HEADER_AUTHORITY] = host || client[kHost]
  headers[HTTP2_HEADER_METHOD] = method

  if (method === 'CONNECT') {
    session.ref()
    // we are already connected, streams are pending, first request
    // will create a new stream. We trigger a request to create the stream and wait until
    // `ready` event is triggered
    // We disabled endStream to allow the user to write to the stream
    stream = session.request(headers, { endStream: false, signal })

    if (stream.id && !stream.pending) {
      request.onUpgrade(null, null, stream)
      ++h2State.openStreams
    } else {
      stream.once('ready', () => {
        request.onUpgrade(null, null, stream)
        ++h2State.openStreams
      })
    }

    stream.once('close', () => {
      h2State.openStreams -= 1
      // TODO(HTTP/2): unref only if current streams count is 0
      if (h2State.openStreams === 0) session.unref()
    })

    return true
  }

  // https://tools.ietf.org/html/rfc7540#section-8.3
  // :path and :scheme headers must be omited when sending CONNECT

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
      errorRequest(client, request, new RequestContentLengthMismatchError())
      return false
    }

    process.emitWarning(new RequestContentLengthMismatchError())
  }

  if (contentLength != null) {
    assert(body, 'no body must not have content length')
    headers[HTTP2_HEADER_CONTENT_LENGTH] = `${contentLength}`
  }

  session.ref()

  const shouldEndStream = method === 'GET' || method === 'HEAD'
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

  // Increment counter as we have new several streams open
  ++h2State.openStreams

  stream.once('response', headers => {
    const { [HTTP2_HEADER_STATUS]: statusCode, ...realHeaders } = headers

    if (request.onHeaders(Number(statusCode), realHeaders, stream.resume.bind(stream), '') === false) {
      stream.pause()
    }
  })

  stream.once('end', () => {
    request.onComplete([])
  })

  stream.on('data', (chunk) => {
    if (request.onData(chunk) === false) {
      stream.pause()
    }
  })

  stream.once('close', () => {
    h2State.openStreams -= 1
    // TODO(HTTP/2): unref only if current streams count is 0
    if (h2State.openStreams === 0) {
      session.unref()
    }
  })

  stream.once('error', function (err) {
    if (client[kHTTP2Session] && !client[kHTTP2Session].destroyed && !this.closed && !this.destroyed) {
      h2State.streams -= 1
      util.destroy(stream, err)
    }
  })

  stream.once('frameError', (type, code) => {
    const err = new InformationalError(`HTTP/2: "frameError" received - type ${type}, code ${code}`)
    errorRequest(client, request, err)

    if (client[kHTTP2Session] && !client[kHTTP2Session].destroyed && !this.closed && !this.destroyed) {
      h2State.streams -= 1
      util.destroy(stream, err)
    }
  })

  // stream.on('aborted', () => {
  //   // TODO(HTTP/2): Support aborted
  // })

  // stream.on('timeout', () => {
  //   // TODO(HTTP/2): Support timeout
  // })

  // stream.on('push', headers => {
  //   // TODO(HTTP/2): Suppor push
  // })

  // stream.on('trailers', headers => {
  //   // TODO(HTTP/2): Support trailers
  // })

  return true

  function writeBodyH2 () {
    /* istanbul ignore else: assertion */
    if (!body) {
      request.onRequestSent()
    } else if (util.isBuffer(body)) {
      assert(contentLength === body.byteLength, 'buffer body must have content length')
      stream.cork()
      stream.write(body)
      stream.uncork()
      stream.end()
      request.onBodySent(body)
      request.onRequestSent()
    } else if (util.isBlobLike(body)) {
      if (typeof body.stream === 'function') {
        writeIterable({
          client,
          request,
          contentLength,
          h2stream: stream,
          expectsPayload,
          body: body.stream(),
          socket: client[kSocket],
          header: ''
        })
      } else {
        writeBlob({
          body,
          client,
          request,
          contentLength,
          expectsPayload,
          h2stream: stream,
          header: '',
          socket: client[kSocket]
        })
      }
    } else if (util.isStream(body)) {
      writeStream({
        body,
        client,
        request,
        contentLength,
        expectsPayload,
        socket: client[kSocket],
        h2stream: stream,
        header: ''
      })
    } else if (util.isIterable(body)) {
      writeIterable({
        body,
        client,
        request,
        contentLength,
        expectsPayload,
        header: '',
        h2stream: stream,
        socket: client[kSocket]
      })
    } else {
      assert(false)
    }
  }
}

function writeStream ({ h2stream, body, client, request, socket, contentLength, header, expectsPayload }) {
  assert(contentLength !== 0 || client[kRunning] === 0, 'stream body cannot be pipelined')

  if (client[kHTTPConnVersion] === 'h2') {
    // For HTTP/2, is enough to pipe the stream
    const pipe = pipeline(
      body,
      h2stream,
      (err) => {
        if (err) {
          util.destroy(body, err)
          util.destroy(h2stream, err)
        } else {
          request.onRequestSent()
        }
      }
    )

    pipe.on('data', onPipeData)
    pipe.once('end', () => {
      pipe.removeListener('data', onPipeData)
      util.destroy(pipe)
    })

    function onPipeData (chunk) {
      request.onBodySent(chunk)
    }

    return
  }

  let finished = false

  const writer = new AsyncWriter({ socket, request, contentLength, client, expectsPayload, header })

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
  const onAbort = function () {
    if (finished) {
      return
    }
    const err = new RequestAbortedError()
    queueMicrotask(() => onFinished(err))
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
      .removeListener('error', onFinished)
      .removeListener('close', onAbort)

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
    .on('close', onAbort)

  if (body.resume) {
    body.resume()
  }

  socket
    .on('drain', onDrain)
    .on('error', onFinished)
}

async function writeBlob ({ h2stream, body, client, request, socket, contentLength, header, expectsPayload }) {
  assert(contentLength === body.size, 'blob body must have content length')

  const isH2 = client[kHTTPConnVersion] === 'h2'
  try {
    if (contentLength != null && contentLength !== body.size) {
      throw new RequestContentLengthMismatchError()
    }

    const buffer = Buffer.from(await body.arrayBuffer())

    if (isH2) {
      h2stream.cork()
      h2stream.write(buffer)
      h2stream.uncork()
    } else {
      socket.cork()
      socket.write(`${header}content-length: ${contentLength}\r\n\r\n`, 'latin1')
      socket.write(buffer)
      socket.uncork()
    }

    request.onBodySent(buffer)
    request.onRequestSent()

    if (!expectsPayload) {
      socket[kReset] = true
    }

    resume(client)
  } catch (err) {
    util.destroy(isH2 ? h2stream : socket, err)
  }
}

async function writeIterable ({ h2stream, body, client, request, socket, contentLength, header, expectsPayload }) {
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

  if (client[kHTTPConnVersion] === 'h2') {
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
    } catch (err) {
      h2stream.destroy(err)
    } finally {
      request.onRequestSent()
      h2stream.end()
      h2stream
        .off('close', onDrain)
        .off('drain', onDrain)
    }

    return
  }

  socket
    .on('close', onDrain)
    .on('drain', onDrain)

  const writer = new AsyncWriter({ socket, request, contentLength, client, expectsPayload, header })
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
  constructor ({ socket, request, contentLength, client, expectsPayload, header }) {
    this.socket = socket
    this.request = request
    this.contentLength = contentLength
    this.client = client
    this.bytesWritten = 0
    this.expectsPayload = expectsPayload
    this.header = header

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
      if (!expectsPayload) {
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

    resume(client)
  }

  destroy (err) {
    const { socket, client } = this

    socket[kWriting] = false

    if (err) {
      assert(client[kRunning] <= 1, 'pipeline should only contain this request')
      util.destroy(socket, err)
    }
  }
}

function errorRequest (client, request, err) {
  try {
    request.onError(err)
    assert(request.aborted)
  } catch (err) {
    client.emit('error', err)
  }
}

module.exports = Client
