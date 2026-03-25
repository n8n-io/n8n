'use strict'

/**
 * @module nock/intercept
 */

const { InterceptedRequestRouter } = require('./intercepted_request_router')
const common = require('./common')
const { inherits } = require('util')
const http = require('http')
const { intercept: debug } = require('./debug')
const globalEmitter = require('./global_emitter')
const { BatchInterceptor } = require('@mswjs/interceptors')
const {
  default: nodeInterceptors,
} = require('@mswjs/interceptors/presets/node')
const { createResponse } = require('./create_response')
const { once } = require('events')

const interceptor = new BatchInterceptor({
  name: 'nock-interceptor',
  interceptors: nodeInterceptors,
})
let isNockActive = false

/**
 * @name NetConnectNotAllowedError
 * @private
 * @desc Error trying to make a connection when disabled external access.
 * @class
 * @example
 * nock.disableNetConnect();
 * http.get('http://zombo.com');
 * // throw NetConnectNotAllowedError
 */
function NetConnectNotAllowedError(host, path) {
  Error.call(this)

  this.name = 'NetConnectNotAllowedError'
  this.code = 'ENETUNREACH'
  this.message = `Nock: Disallowed net connect for "${host}${path}"`

  Error.captureStackTrace(this, this.constructor)
}

inherits(NetConnectNotAllowedError, Error)

let allInterceptors = {}
let allowNetConnect

/**
 * Enabled real request.
 * @public
 * @param {String|RegExp} matcher=RegExp.new('.*') Expression to match
 * @example
 * // Enables all real requests
 * nock.enableNetConnect();
 * @example
 * // Enables real requests for url that matches google
 * nock.enableNetConnect('google');
 * @example
 * // Enables real requests for url that matches google and amazon
 * nock.enableNetConnect(/(google|amazon)/);
 * @example
 * // Enables real requests for url that includes google
 * nock.enableNetConnect(host => host.includes('google'));
 */
function enableNetConnect(matcher) {
  if (typeof matcher === 'string') {
    allowNetConnect = new RegExp(matcher)
  } else if (matcher instanceof RegExp) {
    allowNetConnect = matcher
  } else if (typeof matcher === 'function') {
    allowNetConnect = { test: matcher }
  } else {
    allowNetConnect = /.*/
  }
}

function isEnabledForNetConnect(options) {
  common.normalizeRequestOptions(options)

  const enabled = allowNetConnect && allowNetConnect.test(options.host)
  debug('Net connect', enabled ? '' : 'not', 'enabled for', options.host)
  return enabled
}

/**
 * Disable all real requests.
 * @public
 * @example
 * nock.disableNetConnect();
 */
function disableNetConnect() {
  allowNetConnect = undefined
}

function isOn() {
  return !isOff()
}

function isOff() {
  return process.env.NOCK_OFF === 'true'
}

function addInterceptor(key, interceptor, scope, scopeOptions, host) {
  if (!(key in allInterceptors)) {
    allInterceptors[key] = { key, interceptors: [] }
  }
  interceptor.__nock_scope = scope

  //  We need scope's key and scope options for scope filtering function (if defined)
  interceptor.__nock_scopeKey = key
  interceptor.__nock_scopeOptions = scopeOptions
  //  We need scope's host for setting correct request headers for filtered scopes.
  interceptor.__nock_scopeHost = host
  interceptor.interceptionCounter = 0

  if (scopeOptions.allowUnmocked) allInterceptors[key].allowUnmocked = true

  allInterceptors[key].interceptors.push(interceptor)
}

function remove(interceptor) {
  if (interceptor.__nock_scope.shouldPersist() || --interceptor.counter > 0) {
    return
  }

  const { basePath } = interceptor
  const interceptors =
    (allInterceptors[basePath] && allInterceptors[basePath].interceptors) || []

  // TODO: There is a clearer way to write that we want to delete the first
  // matching instance. I'm also not sure why we couldn't delete _all_
  // matching instances.
  interceptors.some(function (thisInterceptor, i) {
    return thisInterceptor === interceptor ? interceptors.splice(i, 1) : false
  })
}

function removeAll() {
  Object.keys(allInterceptors).forEach(function (key) {
    allInterceptors[key].interceptors.forEach(function (interceptor) {
      interceptor.scope.keyedInterceptors = {}
    })
  })
  allInterceptors = {}
}

/**
 * Return all the Interceptors whose Scopes match against the base path of the provided options.
 *
 * @returns {Interceptor[]}
 */
function interceptorsFor(options) {
  common.normalizeRequestOptions(options)

  debug('interceptors for %j', options.host)

  const basePath = `${options.proto}://${options.host}`

  debug('filtering interceptors for basepath', basePath)

  // First try to use filteringScope if any of the interceptors has it defined.
  for (const { key, interceptors, allowUnmocked } of Object.values(
    allInterceptors,
  )) {
    for (const interceptor of interceptors) {
      const { filteringScope } = interceptor.__nock_scopeOptions

      // If scope filtering function is defined and returns a truthy value then
      // we have to treat this as a match.
      if (filteringScope && filteringScope(basePath)) {
        interceptor.scope.logger('found matching scope interceptor')

        // Keep the filtered scope (its key) to signal the rest of the module
        // that this wasn't an exact but filtered match.
        interceptors.forEach(ic => {
          ic.__nock_filteredScope = ic.__nock_scopeKey
        })
        return interceptors
      }
    }

    if (common.matchStringOrRegexp(basePath, key)) {
      if (allowUnmocked && interceptors.length === 0) {
        debug('matched base path with allowUnmocked (no matching interceptors)')
        return [
          {
            options: { allowUnmocked: true },
            matchOrigin() {
              return false
            },
          },
        ]
      } else {
        debug(
          `matched base path (${interceptors.length} interceptor${
            interceptors.length > 1 ? 's' : ''
          })`,
        )
        return interceptors
      }
    }
  }

  return undefined
}

function removeInterceptor(options) {
  // Lazily import to avoid circular imports.
  const Interceptor = require('./interceptor')

  let baseUrl, key, method, proto
  if (options instanceof Interceptor) {
    baseUrl = options.basePath
    key = options._key
  } else {
    proto = options.proto ? options.proto : 'http'

    common.normalizeRequestOptions(options)
    baseUrl = `${proto}://${options.host}`
    method = (options.method && options.method.toUpperCase()) || 'GET'
    key = `${method} ${baseUrl}${options.path || '/'}`
  }

  if (
    allInterceptors[baseUrl] &&
    allInterceptors[baseUrl].interceptors.length > 0
  ) {
    for (let i = 0; i < allInterceptors[baseUrl].interceptors.length; i++) {
      const interceptor = allInterceptors[baseUrl].interceptors[i]
      if (
        options instanceof Interceptor
          ? interceptor === options
          : interceptor._key === key
      ) {
        allInterceptors[baseUrl].interceptors.splice(i, 1)
        interceptor.scope.remove(key, interceptor)
        break
      }
    }

    return true
  }

  return false
}
//  Variable where we keep the ClientRequest we have overridden
//  (which might or might not be node's original http.ClientRequest)
let originalClientRequest

function overrideClientRequest() {
  // Here's some background discussion about overriding ClientRequest:
  // - https://github.com/nodejitsu/mock-request/issues/4
  // - https://github.com/nock/nock/issues/26
  // It would be good to add a comment that explains this more clearly.
  debug('Overriding ClientRequest')

  // ----- Extending http.ClientRequest

  //  Define the overriding client request that nock uses internally.
  function OverriddenClientRequest(...args) {
    const { options, callback } = common.normalizeClientRequestArgs(...args)

    if (Object.keys(options).length === 0) {
      // As weird as it is, it's possible to call `http.request` without
      // options, and it makes a request to localhost or somesuch. We should
      // support it too, for parity. However it doesn't work today, and fixing
      // it seems low priority. Giving an explicit error is nicer than
      // crashing with a weird stack trace. `http[s].request()`, nock's other
      // client-facing entry point, makes a similar check.
      // https://github.com/nock/nock/pull/1386
      // https://github.com/nock/nock/pull/1440
      throw Error(
        'Creating a ClientRequest with empty `options` is not supported in Nock',
      )
    }

    http.OutgoingMessage.call(this)

    //  Filter the interceptors per request options.
    const interceptors = interceptorsFor(options)

    if (isOn() && interceptors) {
      debug('using', interceptors.length, 'interceptors')

      //  Use filtered interceptors to intercept requests.
      // TODO: this shouldn't be a class anymore
      // the overrider explicitly overrides methods and attrs on the request so the `assign` below should be removed.
      const overrider = new InterceptedRequestRouter({
        req: this,
        options,
        interceptors,
      })
      Object.assign(this, overrider)

      if (callback) {
        this.once('response', callback)
      }
    } else {
      debug('falling back to original ClientRequest')

      //  Fallback to original ClientRequest if nock is off or the net connection is enabled.
      if (isOff() || isEnabledForNetConnect(options)) {
        originalClientRequest.apply(this, arguments)
      } else {
        common.setImmediate(
          function () {
            const error = new NetConnectNotAllowedError(
              options.host,
              options.path,
            )
            this.emit('error', error)
          }.bind(this),
        )
      }
    }
  }
  inherits(OverriddenClientRequest, http.ClientRequest)

  //  Override the http module's request but keep the original so that we can use it and later restore it.
  //  NOTE: We only override http.ClientRequest as https module also uses it.
  originalClientRequest = http.ClientRequest
  http.ClientRequest = OverriddenClientRequest

  debug('ClientRequest overridden')
}

function restoreOverriddenClientRequest() {
  debug('restoring overridden ClientRequest')

  //  Restore the ClientRequest we have overridden.
  if (!originalClientRequest) {
    debug('- ClientRequest was not overridden')
  } else {
    isNockActive = false
    interceptor.dispose()
    http.ClientRequest = originalClientRequest
    originalClientRequest = undefined

    debug('- ClientRequest restored')
  }
}

function isActive() {
  return isNockActive
}

function interceptorScopes() {
  const nestedInterceptors = Object.values(allInterceptors).map(
    i => i.interceptors,
  )
  const scopes = new Set([].concat(...nestedInterceptors).map(i => i.scope))
  return [...scopes]
}

function isDone() {
  return interceptorScopes().every(scope => scope.isDone())
}

function pendingMocks() {
  return [].concat(...interceptorScopes().map(scope => scope.pendingMocks()))
}

function activeMocks() {
  return [].concat(...interceptorScopes().map(scope => scope.activeMocks()))
}

function activate() {
  if (isNockActive) {
    throw new Error('Nock already active')
  }

  overrideClientRequest()
  interceptor.apply()
  // Force msw to forward Nock's error instead of coerce it into 500 error
  interceptor.on('unhandledException', ({ controller, error }) => {
    controller.errorWith(error)
  })
  interceptor.on(
    'request',
    async function ({ request: mswRequest, controller }) {
      const request = mswRequest.clone()
      const { options } = common.normalizeClientRequestArgs(request.url)
      options.proto = options.protocol.slice(0, -1)
      options.method = request.method
      const interceptors = interceptorsFor(options)
      if (isOn() && interceptors) {
        const matches = interceptors.some(interceptor =>
          interceptor.matchOrigin(options),
        )
        const allowUnmocked = interceptors.some(
          interceptor => interceptor.options.allowUnmocked,
        )

        const nockRequest = common.convertFetchRequestToClientRequest(request)
        if (!matches && allowUnmocked) {
          globalEmitter.emit('no match', nockRequest)
        } else {
          nockRequest.on('response', nockResponse => {
            const response = createResponse(nockResponse, mswRequest.signal)
            controller.respondWith(response)
          })

          const promise = Promise.race([
            // TODO: temp hacky way to handle allowUnmocked in startPlayback
            once(nockRequest, 'real-request'),
            once(nockRequest, 'error'),
            once(nockRequest, 'response'),
          ])
          const buffer = await request.arrayBuffer()
          nockRequest.write(buffer)
          nockRequest.end()
          await promise
        }
      } else {
        globalEmitter.emit('no match', options)
        if (!(isOff() || isEnabledForNetConnect(options))) {
          throw new NetConnectNotAllowedError(options.host, options.path)
        }
      }
    },
  )
  isNockActive = true
}

module.exports = {
  addInterceptor,
  remove,
  removeAll,
  removeInterceptor,
  isOn,
  activate,
  isActive,
  isDone,
  pendingMocks,
  activeMocks,
  enableNetConnect,
  disableNetConnect,
  restoreOverriddenClientRequest,
  abortPendingRequests: common.removeAllTimers,
}
