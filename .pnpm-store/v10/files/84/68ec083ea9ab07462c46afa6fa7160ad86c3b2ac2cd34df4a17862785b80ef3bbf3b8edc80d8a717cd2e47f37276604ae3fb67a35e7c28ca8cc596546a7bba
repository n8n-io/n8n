'use strict'

const Client = require('./lib/client')
const Dispatcher = require('./lib/dispatcher')
const errors = require('./lib/core/errors')
const Pool = require('./lib/pool')
const BalancedPool = require('./lib/balanced-pool')
const Agent = require('./lib/agent')
const util = require('./lib/core/util')
const { InvalidArgumentError } = errors
const api = require('./lib/api')
const buildConnector = require('./lib/core/connect')
const MockClient = require('./lib/mock/mock-client')
const MockAgent = require('./lib/mock/mock-agent')
const MockPool = require('./lib/mock/mock-pool')
const mockErrors = require('./lib/mock/mock-errors')
const ProxyAgent = require('./lib/proxy-agent')
const RetryHandler = require('./lib/handler/RetryHandler')
const { getGlobalDispatcher, setGlobalDispatcher } = require('./lib/global')
const DecoratorHandler = require('./lib/handler/DecoratorHandler')
const RedirectHandler = require('./lib/handler/RedirectHandler')
const createRedirectInterceptor = require('./lib/interceptor/redirectInterceptor')

let hasCrypto
try {
  require('crypto')
  hasCrypto = true
} catch {
  hasCrypto = false
}

Object.assign(Dispatcher.prototype, api)

module.exports.Dispatcher = Dispatcher
module.exports.Client = Client
module.exports.Pool = Pool
module.exports.BalancedPool = BalancedPool
module.exports.Agent = Agent
module.exports.ProxyAgent = ProxyAgent
module.exports.RetryHandler = RetryHandler

module.exports.DecoratorHandler = DecoratorHandler
module.exports.RedirectHandler = RedirectHandler
module.exports.createRedirectInterceptor = createRedirectInterceptor

module.exports.buildConnector = buildConnector
module.exports.errors = errors

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

if (util.nodeMajor > 16 || (util.nodeMajor === 16 && util.nodeMinor >= 8)) {
  let fetchImpl = null
  module.exports.fetch = async function fetch (resource) {
    if (!fetchImpl) {
      fetchImpl = require('./lib/fetch').fetch
    }

    try {
      return await fetchImpl(...arguments)
    } catch (err) {
      if (typeof err === 'object') {
        Error.captureStackTrace(err, this)
      }

      throw err
    }
  }
  module.exports.Headers = require('./lib/fetch/headers').Headers
  module.exports.Response = require('./lib/fetch/response').Response
  module.exports.Request = require('./lib/fetch/request').Request
  module.exports.FormData = require('./lib/fetch/formdata').FormData
  module.exports.File = require('./lib/fetch/file').File
  module.exports.FileReader = require('./lib/fileapi/filereader').FileReader

  const { setGlobalOrigin, getGlobalOrigin } = require('./lib/fetch/global')

  module.exports.setGlobalOrigin = setGlobalOrigin
  module.exports.getGlobalOrigin = getGlobalOrigin

  const { CacheStorage } = require('./lib/cache/cachestorage')
  const { kConstruct } = require('./lib/cache/symbols')

  // Cache & CacheStorage are tightly coupled with fetch. Even if it may run
  // in an older version of Node, it doesn't have any use without fetch.
  module.exports.caches = new CacheStorage(kConstruct)
}

if (util.nodeMajor >= 16) {
  const { deleteCookie, getCookies, getSetCookies, setCookie } = require('./lib/cookies')

  module.exports.deleteCookie = deleteCookie
  module.exports.getCookies = getCookies
  module.exports.getSetCookies = getSetCookies
  module.exports.setCookie = setCookie

  const { parseMIMEType, serializeAMimeType } = require('./lib/fetch/dataURL')

  module.exports.parseMIMEType = parseMIMEType
  module.exports.serializeAMimeType = serializeAMimeType
}

if (util.nodeMajor >= 18 && hasCrypto) {
  const { WebSocket } = require('./lib/websocket/websocket')

  module.exports.WebSocket = WebSocket
}

module.exports.request = makeDispatcher(api.request)
module.exports.stream = makeDispatcher(api.stream)
module.exports.pipeline = makeDispatcher(api.pipeline)
module.exports.connect = makeDispatcher(api.connect)
module.exports.upgrade = makeDispatcher(api.upgrade)

module.exports.MockClient = MockClient
module.exports.MockPool = MockPool
module.exports.MockAgent = MockAgent
module.exports.mockErrors = mockErrors
