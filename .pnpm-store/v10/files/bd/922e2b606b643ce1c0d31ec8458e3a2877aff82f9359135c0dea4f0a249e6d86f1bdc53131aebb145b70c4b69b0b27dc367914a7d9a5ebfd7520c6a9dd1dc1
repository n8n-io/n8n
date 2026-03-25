'use strict'

const Client = require('./lib/dispatcher/client')
const Dispatcher = require('./lib/dispatcher/dispatcher')
const Pool = require('./lib/dispatcher/pool')
const BalancedPool = require('./lib/dispatcher/balanced-pool')
const RoundRobinPool = require('./lib/dispatcher/round-robin-pool')
const Agent = require('./lib/dispatcher/agent')
const ProxyAgent = require('./lib/dispatcher/proxy-agent')
const EnvHttpProxyAgent = require('./lib/dispatcher/env-http-proxy-agent')
const RetryAgent = require('./lib/dispatcher/retry-agent')
const H2CClient = require('./lib/dispatcher/h2c-client')
const errors = require('./lib/core/errors')
const util = require('./lib/core/util')
const { InvalidArgumentError } = errors
const api = require('./lib/api')
const buildConnector = require('./lib/core/connect')
const MockClient = require('./lib/mock/mock-client')
const { MockCallHistory, MockCallHistoryLog } = require('./lib/mock/mock-call-history')
const MockAgent = require('./lib/mock/mock-agent')
const MockPool = require('./lib/mock/mock-pool')
const SnapshotAgent = require('./lib/mock/snapshot-agent')
const mockErrors = require('./lib/mock/mock-errors')
const RetryHandler = require('./lib/handler/retry-handler')
const { getGlobalDispatcher, setGlobalDispatcher } = require('./lib/global')
const DecoratorHandler = require('./lib/handler/decorator-handler')
const RedirectHandler = require('./lib/handler/redirect-handler')

Object.assign(Dispatcher.prototype, api)

module.exports.Dispatcher = Dispatcher
module.exports.Client = Client
module.exports.Pool = Pool
module.exports.BalancedPool = BalancedPool
module.exports.RoundRobinPool = RoundRobinPool
module.exports.Agent = Agent
module.exports.ProxyAgent = ProxyAgent
module.exports.EnvHttpProxyAgent = EnvHttpProxyAgent
module.exports.RetryAgent = RetryAgent
module.exports.H2CClient = H2CClient
module.exports.RetryHandler = RetryHandler

module.exports.DecoratorHandler = DecoratorHandler
module.exports.RedirectHandler = RedirectHandler
module.exports.interceptors = {
  redirect: require('./lib/interceptor/redirect'),
  responseError: require('./lib/interceptor/response-error'),
  retry: require('./lib/interceptor/retry'),
  dump: require('./lib/interceptor/dump'),
  dns: require('./lib/interceptor/dns'),
  cache: require('./lib/interceptor/cache'),
  decompress: require('./lib/interceptor/decompress'),
  deduplicate: require('./lib/interceptor/deduplicate')
}

module.exports.cacheStores = {
  MemoryCacheStore: require('./lib/cache/memory-cache-store')
}

const SqliteCacheStore = require('./lib/cache/sqlite-cache-store')
module.exports.cacheStores.SqliteCacheStore = SqliteCacheStore

module.exports.buildConnector = buildConnector
module.exports.errors = errors
module.exports.util = {
  parseHeaders: util.parseHeaders,
  headerNameToString: util.headerNameToString
}

function makeDispatcher (fn) {
  return (url, opts, handler) => {
    if (typeof opts === 'function') {
      handler = opts
      opts = null
    }

    if (!url || (typeof url !== 'string' && typeof url !== 'object' && !(url instanceof URL))) {
      throw new InvalidArgumentError('invalid url')
    }

    if (opts != null && typeof opts !== 'object') {
      throw new InvalidArgumentError('invalid opts')
    }

    if (opts && opts.path != null) {
      if (typeof opts.path !== 'string') {
        throw new InvalidArgumentError('invalid opts.path')
      }

      let path = opts.path
      if (!opts.path.startsWith('/')) {
        path = `/${path}`
      }

      url = new URL(util.parseOrigin(url).origin + path)
    } else {
      if (!opts) {
        opts = typeof url === 'object' ? url : {}
      }

      url = util.parseURL(url)
    }

    const { agent, dispatcher = getGlobalDispatcher() } = opts

    if (agent) {
      throw new InvalidArgumentError('unsupported opts.agent. Did you mean opts.client?')
    }

    return fn.call(dispatcher, {
      ...opts,
      origin: url.origin,
      path: url.search ? `${url.pathname}${url.search}` : url.pathname,
      method: opts.method || (opts.body ? 'PUT' : 'GET')
    }, handler)
  }
}

module.exports.setGlobalDispatcher = setGlobalDispatcher
module.exports.getGlobalDispatcher = getGlobalDispatcher

const fetchImpl = require('./lib/web/fetch').fetch

module.exports.fetch = function fetch (init, options = undefined) {
  return fetchImpl(init, options).catch(err => {
    if (err && typeof err === 'object') {
      Error.captureStackTrace(err)
    }
    throw err
  })
}
module.exports.Headers = require('./lib/web/fetch/headers').Headers
module.exports.Response = require('./lib/web/fetch/response').Response
module.exports.Request = require('./lib/web/fetch/request').Request
module.exports.FormData = require('./lib/web/fetch/formdata').FormData

const { setGlobalOrigin, getGlobalOrigin } = require('./lib/web/fetch/global')

module.exports.setGlobalOrigin = setGlobalOrigin
module.exports.getGlobalOrigin = getGlobalOrigin

const { CacheStorage } = require('./lib/web/cache/cachestorage')
const { kConstruct } = require('./lib/core/symbols')

module.exports.caches = new CacheStorage(kConstruct)

const { deleteCookie, getCookies, getSetCookies, setCookie, parseCookie } = require('./lib/web/cookies')

module.exports.deleteCookie = deleteCookie
module.exports.getCookies = getCookies
module.exports.getSetCookies = getSetCookies
module.exports.setCookie = setCookie
module.exports.parseCookie = parseCookie

const { parseMIMEType, serializeAMimeType } = require('./lib/web/fetch/data-url')

module.exports.parseMIMEType = parseMIMEType
module.exports.serializeAMimeType = serializeAMimeType

const { CloseEvent, ErrorEvent, MessageEvent } = require('./lib/web/websocket/events')
const { WebSocket, ping } = require('./lib/web/websocket/websocket')
module.exports.WebSocket = WebSocket
module.exports.CloseEvent = CloseEvent
module.exports.ErrorEvent = ErrorEvent
module.exports.MessageEvent = MessageEvent
module.exports.ping = ping

module.exports.WebSocketStream = require('./lib/web/websocket/stream/websocketstream').WebSocketStream
module.exports.WebSocketError = require('./lib/web/websocket/stream/websocketerror').WebSocketError

module.exports.request = makeDispatcher(api.request)
module.exports.stream = makeDispatcher(api.stream)
module.exports.pipeline = makeDispatcher(api.pipeline)
module.exports.connect = makeDispatcher(api.connect)
module.exports.upgrade = makeDispatcher(api.upgrade)

module.exports.MockClient = MockClient
module.exports.MockCallHistory = MockCallHistory
module.exports.MockCallHistoryLog = MockCallHistoryLog
module.exports.MockPool = MockPool
module.exports.MockAgent = MockAgent
module.exports.SnapshotAgent = SnapshotAgent
module.exports.mockErrors = mockErrors

const { EventSource } = require('./lib/web/eventsource/eventsource')

module.exports.EventSource = EventSource

function install () {
  globalThis.fetch = module.exports.fetch
  globalThis.Headers = module.exports.Headers
  globalThis.Response = module.exports.Response
  globalThis.Request = module.exports.Request
  globalThis.FormData = module.exports.FormData
  globalThis.WebSocket = module.exports.WebSocket
  globalThis.CloseEvent = module.exports.CloseEvent
  globalThis.ErrorEvent = module.exports.ErrorEvent
  globalThis.MessageEvent = module.exports.MessageEvent
  globalThis.EventSource = module.exports.EventSource
}

module.exports.install = install
