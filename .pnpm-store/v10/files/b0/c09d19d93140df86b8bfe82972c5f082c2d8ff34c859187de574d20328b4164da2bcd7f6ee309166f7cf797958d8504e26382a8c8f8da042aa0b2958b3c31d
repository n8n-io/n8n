'use strict'

const assert = require('node:assert')
const net = require('node:net')
const http = require('node:http')
const util = require('../core/util.js')
const { ClientStats } = require('../util/stats.js')
const { channels } = require('../core/diagnostics.js')
const Request = require('../core/request.js')
const DispatcherBase = require('./dispatcher-base')
const {
  InvalidArgumentError,
  InformationalError,
  ClientDestroyedError
} = require('../core/errors.js')
const buildConnector = require('../core/connect.js')
const {
  kUrl,
  kServerName,
  kClient,
  kBusy,
  kConnect,
  kResuming,
  kRunning,
  kPending,
  kSize,
  kQueue,
  kConnected,
  kConnecting,
  kNeedDrain,
  kKeepAliveDefaultTimeout,
  kHostHeader,
  kPendingIdx,
  kRunningIdx,
  kError,
  kPipelining,
  kKeepAliveTimeoutValue,
  kMaxHeadersSize,
  kKeepAliveMaxTimeout,
  kKeepAliveTimeoutThreshold,
  kHeadersTimeout,
  kBodyTimeout,
  kStrictContentLength,
  kConnector,
  kMaxRequests,
  kCounter,
  kClose,
  kDestroy,
  kDispatch,
  kLocalAddress,
  kMaxResponseSize,
  kOnError,
  kHTTPContext,
  kMaxConcurrentStreams,
  kResume
} = require('../core/symbols.js')
const connectH1 = require('./client-h1.js')
const connectH2 = require('./client-h2.js')

const kClosedResolve = Symbol('kClosedResolve')

const getDefaultNodeMaxHeaderSize = http &&
  http.maxHeaderSize &&
  Number.isInteger(http.maxHeaderSize) &&
  http.maxHeaderSize > 0
  ? () => http.maxHeaderSize
  : () => { throw new InvalidArgumentError('http module not available or http.maxHeaderSize invalid') }

const noop = () => {}

function getPipelining (client) {
  return client[kPipelining] ?? client[kHTTPContext]?.defaultPipelining ?? 1
}

/**
 * @type {import('../../types/client.js').default}
 */
class Client extends DispatcherBase {
  /**
   *
   * @param {string|URL} url
   * @param {import('../../types/client.js').Client.Options} options
   */
  constructor (url, {
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
    connect,
    maxRequestsPerClient,
    localAddress,
    maxResponseSize,
    autoSelectFamily,
    autoSelectFamilyAttemptTimeout,
    // h2
    maxConcurrentStreams,
    allowH2,
    useH2c
  } = {}) {
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

    if (maxHeaderSize != null) {
      if (!Number.isInteger(maxHeaderSize) || maxHeaderSize < 1) {
        throw new InvalidArgumentError('invalid maxHeaderSize')
      }
    } else {
      // If maxHeaderSize is not provided, use the default value from the http module
      // or if that is not available, throw an error.
      maxHeaderSize = getDefaultNodeMaxHeaderSize()
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
      throw new InvalidArgumentError('maxConcurrentStreams must be a positive integer, greater than 0')
    }

    if (useH2c != null && typeof useH2c !== 'boolean') {
      throw new InvalidArgumentError('useH2c must be a valid boolean value')
    }

    super()

    if (typeof connect !== 'function') {
      connect = buildConnector({
        ...tls,
        maxCachedSessions,
        allowH2,
        useH2c,
        socketPath,
        timeout: connectTimeout,
        ...(typeof autoSelectFamily === 'boolean' ? { autoSelectFamily, autoSelectFamilyAttemptTimeout } : undefined),
        ...connect
      })
    }

    this[kUrl] = util.parseOrigin(url)
    this[kConnector] = connect
    this[kPipelining] = pipelining != null ? pipelining : 1
    this[kMaxHeadersSize] = maxHeaderSize
    this[kKeepAliveDefaultTimeout] = keepAliveTimeout == null ? 4e3 : keepAliveTimeout
    this[kKeepAliveMaxTimeout] = keepAliveMaxTimeout == null ? 600e3 : keepAliveMaxTimeout
    this[kKeepAliveTimeoutThreshold] = keepAliveTimeoutThreshold == null ? 2e3 : keepAliveTimeoutThreshold
    this[kKeepAliveTimeoutValue] = this[kKeepAliveDefaultTimeout]
    this[kServerName] = null
    this[kLocalAddress] = localAddress != null ? localAddress : null
    this[kResuming] = 0 // 0, idle, 1, scheduled, 2 resuming
    this[kNeedDrain] = 0 // 0, idle, 1, scheduled, 2 resuming
    this[kHostHeader] = `host: ${this[kUrl].hostname}${this[kUrl].port ? `:${this[kUrl].port}` : ''}\r\n`
    this[kBodyTimeout] = bodyTimeout != null ? bodyTimeout : 300e3
    this[kHeadersTimeout] = headersTimeout != null ? headersTimeout : 300e3
    this[kStrictContentLength] = strictContentLength == null ? true : strictContentLength
    this[kMaxRequests] = maxRequestsPerClient
    this[kClosedResolve] = null
    this[kMaxResponseSize] = maxResponseSize > -1 ? maxResponseSize : -1
    this[kMaxConcurrentStreams] = maxConcurrentStreams != null ? maxConcurrentStreams : 100 // Max peerConcurrentStreams for a Node h2 server
    this[kHTTPContext] = null

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

    this[kResume] = (sync) => resume(this, sync)
    this[kOnError] = (err) => onError(this, err)
  }

  get pipelining () {
    return this[kPipelining]
  }

  set pipelining (value) {
    this[kPipelining] = value
    this[kResume](true)
  }

  get stats () {
    return new ClientStats(this)
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
    return !!this[kHTTPContext] && !this[kConnecting] && !this[kHTTPContext].destroyed
  }

  get [kBusy] () {
    return Boolean(
      this[kHTTPContext]?.busy(null) ||
      (this[kSize] >= (getPipelining(this) || 1)) ||
      this[kPending] > 0
    )
  }

  [kConnect] (cb) {
    connect(this)
    this.once('connect', cb)
  }

  [kDispatch] (opts, handler) {
    const request = new Request(this[kUrl].origin, opts, handler)

    this[kQueue].push(request)
    if (this[kResuming]) {
      // Do nothing.
    } else if (util.bodyLength(request.body) == null && util.isIterable(request.body)) {
      // Wait a tick in case stream/iterator is ended in the same tick.
      this[kResuming] = 1
      queueMicrotask(() => resume(this))
    } else {
      this[kResume](true)
    }

    if (this[kResuming] && this[kNeedDrain] !== 2 && this[kBusy]) {
      this[kNeedDrain] = 2
    }

    return this[kNeedDrain] < 2
  }

  [kClose] () {
    // TODO: for H2 we need to gracefully flush the remaining enqueued
    // request and close each stream.
    return new Promise((resolve) => {
      if (this[kSize]) {
        this[kClosedResolve] = resolve
      } else {
        resolve(null)
      }
    })
  }

  [kDestroy] (err) {
    return new Promise((resolve) => {
      const requests = this[kQueue].splice(this[kPendingIdx])
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i]
        util.errorRequest(this, request, err)
      }

      const callback = () => {
        if (this[kClosedResolve]) {
          // TODO (fix): Should we error here with ClientDestroyedError?
          this[kClosedResolve]()
          this[kClosedResolve] = null
        }
        resolve(null)
      }

      if (this[kHTTPContext]) {
        this[kHTTPContext].destroy(err, callback)
        this[kHTTPContext] = null
      } else {
        queueMicrotask(callback)
      }

      this[kResume]()
    })
  }
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
      util.errorRequest(client, request, err)
    }
    assert(client[kSize] === 0)
  }
}

/**
 * @param {Client} client
 * @returns {void}
 */
function connect (client) {
  assert(!client[kConnecting])
  assert(!client[kHTTPContext])

  let { host, hostname, protocol, port } = client[kUrl]

  // Resolve ipv6
  if (hostname[0] === '[') {
    const idx = hostname.indexOf(']')

    assert(idx !== -1)
    const ip = hostname.substring(1, idx)

    assert(net.isIPv6(ip))
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
        version: client[kHTTPContext]?.version,
        servername: client[kServerName],
        localAddress: client[kLocalAddress]
      },
      connector: client[kConnector]
    })
  }

  client[kConnector]({
    host,
    hostname,
    protocol,
    port,
    servername: client[kServerName],
    localAddress: client[kLocalAddress]
  }, (err, socket) => {
    if (err) {
      handleConnectError(client, err, { host, hostname, protocol, port })
      client[kResume]()
      return
    }

    if (client.destroyed) {
      util.destroy(socket.on('error', noop), new ClientDestroyedError())
      client[kResume]()
      return
    }

    assert(socket)

    try {
      client[kHTTPContext] = socket.alpnProtocol === 'h2'
        ? connectH2(client, socket)
        : connectH1(client, socket)
    } catch (err) {
      socket.destroy().on('error', noop)
      handleConnectError(client, err, { host, hostname, protocol, port })
      client[kResume]()
      return
    }

    client[kConnecting] = false

    socket[kCounter] = 0
    socket[kMaxRequests] = client[kMaxRequests]
    socket[kClient] = client
    socket[kError] = null

    if (channels.connected.hasSubscribers) {
      channels.connected.publish({
        connectParams: {
          host,
          hostname,
          protocol,
          port,
          version: client[kHTTPContext]?.version,
          servername: client[kServerName],
          localAddress: client[kLocalAddress]
        },
        connector: client[kConnector],
        socket
      })
    }

    client.emit('connect', client[kUrl], [client])
    client[kResume]()
  })
}

function handleConnectError (client, err, { host, hostname, protocol, port }) {
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
        version: client[kHTTPContext]?.version,
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
      util.errorRequest(client, request, err)
    }
  } else {
    onError(client, err)
  }

  client.emit('connectionError', client[kUrl], [client], err)
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

    if (client[kHTTPContext]) {
      client[kHTTPContext].resume()
    }

    if (client[kBusy]) {
      client[kNeedDrain] = 2
    } else if (client[kNeedDrain] === 2) {
      if (sync) {
        client[kNeedDrain] = 1
        queueMicrotask(() => emitDrain(client))
      } else {
        emitDrain(client)
      }
      continue
    }

    if (client[kPending] === 0) {
      return
    }

    if (client[kRunning] >= (getPipelining(client) || 1)) {
      return
    }

    const request = client[kQueue][client[kPendingIdx]]

    if (client[kUrl].protocol === 'https:' && client[kServerName] !== request.servername) {
      if (client[kRunning] > 0) {
        return
      }

      client[kServerName] = request.servername
      client[kHTTPContext]?.destroy(new InformationalError('servername changed'), () => {
        client[kHTTPContext] = null
        resume(client)
      })
    }

    if (client[kConnecting]) {
      return
    }

    if (!client[kHTTPContext]) {
      connect(client)
      return
    }

    if (client[kHTTPContext].destroyed) {
      return
    }

    if (client[kHTTPContext].busy(request)) {
      return
    }

    if (!request.aborted && client[kHTTPContext].write(request)) {
      client[kPendingIdx]++
    } else {
      client[kQueue].splice(client[kPendingIdx], 1)
    }
  }
}

module.exports = Client
