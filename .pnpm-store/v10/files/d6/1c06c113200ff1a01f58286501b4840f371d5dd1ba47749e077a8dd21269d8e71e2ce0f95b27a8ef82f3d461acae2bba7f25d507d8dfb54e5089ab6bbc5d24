'use strict'

const { kProxy, kClose, kDestroy, kDispatch } = require('../core/symbols')
const Agent = require('./agent')
const Pool = require('./pool')
const DispatcherBase = require('./dispatcher-base')
const { InvalidArgumentError, RequestAbortedError, SecureProxyConnectionError } = require('../core/errors')
const buildConnector = require('../core/connect')
const Client = require('./client')
const { channels } = require('../core/diagnostics')

const kAgent = Symbol('proxy agent')
const kClient = Symbol('proxy client')
const kProxyHeaders = Symbol('proxy headers')
const kRequestTls = Symbol('request tls settings')
const kProxyTls = Symbol('proxy tls settings')
const kConnectEndpoint = Symbol('connect endpoint function')
const kTunnelProxy = Symbol('tunnel proxy')

function defaultProtocolPort (protocol) {
  return protocol === 'https:' ? 443 : 80
}

function defaultFactory (origin, opts) {
  return new Pool(origin, opts)
}

const noop = () => {}

function defaultAgentFactory (origin, opts) {
  if (opts.connections === 1) {
    return new Client(origin, opts)
  }
  return new Pool(origin, opts)
}

class Http1ProxyWrapper extends DispatcherBase {
  #client

  constructor (proxyUrl, { headers = {}, connect, factory }) {
    if (!proxyUrl) {
      throw new InvalidArgumentError('Proxy URL is mandatory')
    }

    super()

    this[kProxyHeaders] = headers
    if (factory) {
      this.#client = factory(proxyUrl, { connect })
    } else {
      this.#client = new Client(proxyUrl, { connect })
    }
  }

  [kDispatch] (opts, handler) {
    const onHeaders = handler.onHeaders
    handler.onHeaders = function (statusCode, data, resume) {
      if (statusCode === 407) {
        if (typeof handler.onError === 'function') {
          handler.onError(new InvalidArgumentError('Proxy Authentication Required (407)'))
        }
        return
      }
      if (onHeaders) onHeaders.call(this, statusCode, data, resume)
    }

    // Rewrite request as an HTTP1 Proxy request, without tunneling.
    const {
      origin,
      path = '/',
      headers = {}
    } = opts

    opts.path = origin + path

    if (!('host' in headers) && !('Host' in headers)) {
      const { host } = new URL(origin)
      headers.host = host
    }
    opts.headers = { ...this[kProxyHeaders], ...headers }

    return this.#client[kDispatch](opts, handler)
  }

  [kClose] () {
    return this.#client.close()
  }

  [kDestroy] (err) {
    return this.#client.destroy(err)
  }
}

class ProxyAgent extends DispatcherBase {
  constructor (opts) {
    if (!opts || (typeof opts === 'object' && !(opts instanceof URL) && !opts.uri)) {
      throw new InvalidArgumentError('Proxy uri is mandatory')
    }

    const { clientFactory = defaultFactory } = opts
    if (typeof clientFactory !== 'function') {
      throw new InvalidArgumentError('Proxy opts.clientFactory must be a function.')
    }

    const { proxyTunnel = true } = opts

    super()

    const url = this.#getUrl(opts)
    const { href, origin, port, protocol, username, password, hostname: proxyHostname } = url

    this[kProxy] = { uri: href, protocol }
    this[kRequestTls] = opts.requestTls
    this[kProxyTls] = opts.proxyTls
    this[kProxyHeaders] = opts.headers || {}
    this[kTunnelProxy] = proxyTunnel

    if (opts.auth && opts.token) {
      throw new InvalidArgumentError('opts.auth cannot be used in combination with opts.token')
    } else if (opts.auth) {
      /* @deprecated in favour of opts.token */
      this[kProxyHeaders]['proxy-authorization'] = `Basic ${opts.auth}`
    } else if (opts.token) {
      this[kProxyHeaders]['proxy-authorization'] = opts.token
    } else if (username && password) {
      this[kProxyHeaders]['proxy-authorization'] = `Basic ${Buffer.from(`${decodeURIComponent(username)}:${decodeURIComponent(password)}`).toString('base64')}`
    }

    const connect = buildConnector({ ...opts.proxyTls })
    this[kConnectEndpoint] = buildConnector({ ...opts.requestTls })

    const agentFactory = opts.factory || defaultAgentFactory
    const factory = (origin, options) => {
      const { protocol } = new URL(origin)
      if (!this[kTunnelProxy] && protocol === 'http:' && this[kProxy].protocol === 'http:') {
        return new Http1ProxyWrapper(this[kProxy].uri, {
          headers: this[kProxyHeaders],
          connect,
          factory: agentFactory
        })
      }
      return agentFactory(origin, options)
    }
    this[kClient] = clientFactory(url, { connect })
    this[kAgent] = new Agent({
      ...opts,
      factory,
      connect: async (opts, callback) => {
        let requestedPath = opts.host
        if (!opts.port) {
          requestedPath += `:${defaultProtocolPort(opts.protocol)}`
        }
        try {
          const connectParams = {
            origin,
            port,
            path: requestedPath,
            signal: opts.signal,
            headers: {
              ...this[kProxyHeaders],
              host: opts.host,
              ...(opts.connections == null || opts.connections > 0 ? { 'proxy-connection': 'keep-alive' } : {})
            },
            servername: this[kProxyTls]?.servername || proxyHostname
          }
          const { socket, statusCode } = await this[kClient].connect(connectParams)
          if (statusCode !== 200) {
            socket.on('error', noop).destroy()
            callback(new RequestAbortedError(`Proxy response (${statusCode}) !== 200 when HTTP Tunneling`))
            return
          }

          if (channels.proxyConnected.hasSubscribers) {
            channels.proxyConnected.publish({
              socket,
              connectParams
            })
          }

          if (opts.protocol !== 'https:') {
            callback(null, socket)
            return
          }
          let servername
          if (this[kRequestTls]) {
            servername = this[kRequestTls].servername
          } else {
            servername = opts.servername
          }
          this[kConnectEndpoint]({ ...opts, servername, httpSocket: socket }, callback)
        } catch (err) {
          if (err.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
            // Throw a custom error to avoid loop in client.js#connect
            callback(new SecureProxyConnectionError(err))
          } else {
            callback(err)
          }
        }
      }
    })
  }

  dispatch (opts, handler) {
    const headers = buildHeaders(opts.headers)
    throwIfProxyAuthIsSent(headers)

    if (headers && !('host' in headers) && !('Host' in headers)) {
      const { host } = new URL(opts.origin)
      headers.host = host
    }

    return this[kAgent].dispatch(
      {
        ...opts,
        headers
      },
      handler
    )
  }

  /**
   * @param {import('../../types/proxy-agent').ProxyAgent.Options | string | URL} opts
   * @returns {URL}
   */
  #getUrl (opts) {
    if (typeof opts === 'string') {
      return new URL(opts)
    } else if (opts instanceof URL) {
      return opts
    } else {
      return new URL(opts.uri)
    }
  }

  [kClose] () {
    return Promise.all([
      this[kAgent].close(),
      this[kClient].close()
    ])
  }

  [kDestroy] () {
    return Promise.all([
      this[kAgent].destroy(),
      this[kClient].destroy()
    ])
  }
}

/**
 * @param {string[] | Record<string, string>} headers
 * @returns {Record<string, string>}
 */
function buildHeaders (headers) {
  // When using undici.fetch, the headers list is stored
  // as an array.
  if (Array.isArray(headers)) {
    /** @type {Record<string, string>} */
    const headersPair = {}

    for (let i = 0; i < headers.length; i += 2) {
      headersPair[headers[i]] = headers[i + 1]
    }

    return headersPair
  }

  return headers
}

/**
 * @param {Record<string, string>} headers
 *
 * Previous versions of ProxyAgent suggests the Proxy-Authorization in request headers
 * Nevertheless, it was changed and to avoid a security vulnerability by end users
 * this check was created.
 * It should be removed in the next major version for performance reasons
 */
function throwIfProxyAuthIsSent (headers) {
  const existProxyAuth = headers && Object.keys(headers)
    .find((key) => key.toLowerCase() === 'proxy-authorization')
  if (existProxyAuth) {
    throw new InvalidArgumentError('Proxy-Authorization should be sent in ProxyAgent constructor')
  }
}

module.exports = ProxyAgent
