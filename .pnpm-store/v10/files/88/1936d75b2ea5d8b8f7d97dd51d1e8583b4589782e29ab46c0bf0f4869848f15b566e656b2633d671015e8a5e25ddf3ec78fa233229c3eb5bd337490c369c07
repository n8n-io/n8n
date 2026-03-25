'use strict'

const Client = require('./lib/dispatcher/client')
const Dispatcher = require('./lib/dispatcher/dispatcher')
const Pool = require('./lib/dispatcher/pool')
const BalancedPool = require('./lib/dispatcher/balanced-pool')
const Agent = require('./lib/dispatcher/agent')
const ProxyAgent = require('./lib/dispatcher/proxy-agent')
const EnvHttpProxyAgent = require('./lib/dispatcher/env-http-proxy-agent')
const RetryAgent = require('./lib/dispatcher/retry-agent')
const errors = require('./lib/core/errors')
const util = require('./lib/core/util')
const { InvalidArgumentError } = errors
const api = require('./lib/api')
const buildConnector = require('./lib/core/connect')
const MockClient = require('./lib/mock/mock-client')
const MockAgent = require('./lib/mock/mock-agent')
const MockPool = require('./lib/mock/mock-pool')
const mockErrors = require('./lib/mock/mock-errors')
const RetryHandler = require('./lib/handler/retry-handler')
const { getGlobalDispatcher, setGlobalDispatcher } = require('./lib/global')
const DecoratorHandler = require('./lib/handler/decorator-handler')
const RedirectHandler = require('./lib/handler/redirect-handler')
const createRedirectInterceptor = require('./lib/interceptor/redirect-interceptor')

Object.assign(Dispatcher.prototype, api)

module.exports.Dispatcher = Dispatcher
module.exports.Client = Client
module.exports.Pool = Pool
module.exports.BalancedPool = BalancedPool
module.exports.Agent = Agent
module.exports.ProxyAgent = ProxyAgent
module.exports.EnvHttpProxyAgent = EnvHttpProxyAgent
module.exports.RetryAgent = RetryAgent
module.exports.RetryHandler = RetryHandler

module.exports.DecoratorHandler = DecoratorHandler
module.exports.RedirectHandler = RedirectHandler
module.exports.createRedirectInterceptor = createRedirectInterceptor
module.exports.interceptors = {
  redirect: require('./lib/interceptor/redirect'),
  retry: require('./lib/interceptor/retry'),
  dump: require('./lib/interceptor/dump'),
  dns: require('./lib/interceptor/dns')
}

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
module.exports.fetch = async function fetch (init, options = undefined) {
  try {
    return await fetchImpl(init, options)
  } catch (err) {
    if (err && typeof err === 'object') {
      Error.captureStackTrace(err)
    }

    throw err
  }
}
module.exports.Headers = require('./lib/web/fetch/headers').Headers
module.exports.Response = require('./lib/web/fetch/response').Response
module.exports.Request = require('./lib/web/fetch/request').Request
module.exports.FormData = require('./lib/web/fetch/formdata').FormData
module.exports.File = globalThis.File ?? require('node:buffer').File
module.exports.FileReader = require('./lib/web/fileapi/filereader').FileReader

const { setGlobalOrigin, getGlobalOrigin } = require('./lib/web/fetch/global')

module.exports.setGlobalOrigin = setGlobalOrigin
module.exports.getGlobalOrigin = getGlobalOrigin

const { CacheStorage } = require('./lib/web/cache/cachestorage')
const { kConstruct } = require('./lib/web/cache/symbols')

// Cache & CacheStorage are tightly coupled with fetch. Even if it may run
// in an older version of Node, it doesn't have any use without fetch.
module.exports.caches = new CacheStorage(kConstruct)

const { deleteCookie, getCookies, getSetCookies, setCookie } = require('./lib/web/cookies')

module.exports.deleteCookie = deleteCookie
module.exports.getCookies = getCookies
module.exports.getSetCookies = getSetCookies
module.exports.setCookie = setCookie

const { parseMIMEType, serializeAMimeType } = require('./lib/web/fetch/data-url')

module.exports.parseMIMEType = parseMIMEType
module.exports.serializeAMimeType = serializeAMimeType

const { CloseEvent, ErrorEvent, MessageEvent } = require('./lib/web/websocket/events')
module.exports.WebSocket = require('./lib/web/websocket/websocket').WebSocket
module.exports.CloseEvent = CloseEvent
module.exports.ErrorEvent = ErrorEvent
module.exports.MessageEvent = MessageEvent

module.exports.request = makeDispatcher(api.request)
module.exports.stream = makeDispatcher(api.stream)
module.exports.pipeline = makeDispatcher(api.pipeline)
module.exports.connect = makeDispatcher(api.connect)
module.exports.upgrade = makeDispatcher(api.upgrade)

module.exports.MockClient = MockClient
module.exports.MockPool = MockPool
module.exports.MockAgent = MockAgent
module.exports.mockErrors = mockErrors

const { EventSource } = require('./lib/web/eventsource/eventsource')

module.exports.EventSource = EventSource
