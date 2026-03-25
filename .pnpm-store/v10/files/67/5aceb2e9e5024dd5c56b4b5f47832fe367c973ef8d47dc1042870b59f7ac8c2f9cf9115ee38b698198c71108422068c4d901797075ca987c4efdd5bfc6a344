'use strict'

const { kProxy, kClose, kDestroy, kInterceptors } = require('./core/symbols')
const { URL } = require('url')
const Agent = require('./agent')
const Pool = require('./pool')
const DispatcherBase = require('./dispatcher-base')
const { InvalidArgumentError, RequestAbortedError } = require('./core/errors')
const buildConnector = require('./core/connect')

const kAgent = Symbol('proxy agent')
const kClient = Symbol('proxy client')
const kProxyHeaders = Symbol('proxy headers')
const kRequestTls = Symbol('request tls settings')
const kProxyTls = Symbol('proxy tls settings')
const kConnectEndpoint = Symbol('connect endpoint function')

function defaultProtocolPort (protocol) {
  return protocol === 'https:' ? 443 : 80
}

function buildProxyOptions (opts) {
  if (typeof opts === 'string') {
    opts = { uri: opts }
  }

  if (!opts || !opts.uri) {
    throw new InvalidArgumentError('Proxy opts.uri is mandatory')
  }

  return {
    uri: opts.uri,
    protocol: opts.protocol || 'https'
  }
}

function defaultFactory (origin, opts) {
  return new Pool(origin, opts)
}

class ProxyAgent extends DispatcherBase {
  constructor (opts) {
    super(opts)
    this[kProxy] = buildProxyOptions(opts)
    this[kAgent] = new Agent(opts)
    this[kInterceptors] = opts.interceptors && opts.interceptors.ProxyAgent && Array.isArray(opts.interceptors.ProxyAgent)
      ? opts.interceptors.ProxyAgent
      : []

    if (typeof opts === 'string') {
      opts = { uri: opts }
    }

    if (!opts || !opts.uri) {
      throw new InvalidArgumentError('Proxy opts.uri is mandatory')
    }

    const { clientFactory = defaultFactory } = opts

    if (typeof clientFactory !== 'function') {
      throw new InvalidArgumentError('Proxy opts.clientFactory must be a function.')
    }

    this[kRequestTls] = opts.requestTls
    this[kProxyTls] = opts.proxyTls
    this[kProxyHeaders] = opts.headers || {}

    const resolvedUrl = new URL(opts.uri)
    const { origin, port, host, username, password } = resolvedUrl

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
    this[kClient] = clientFactory(resolvedUrl, { connect })
    this[kAgent] = new Agent({
      ...opts,
      connect: async (opts, callback) => {
        let requestedHost = opts.host
        if (!opts.port) {
          requestedHost += `:${defaultProtocolPort(opts.protocol)}`
        }
        try {
          const { socket, statusCode } = await this[kClient].connect({
            origin,
            port,
            path: requestedHost,
            signal: opts.signal,
            headers: {
              ...this[kProxyHeaders],
              host
            }
          })
          if (statusCode !== 200) {
            socket.on('error', () => {}).destroy()
            callback(new RequestAbortedError(`Proxy response (${statusCode}) !== 200 when HTTP Tunneling`))
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
          callback(err)
        }
      }
    })
  }

  dispatch (opts, handler) {
    const { host } = new URL(opts.origin)
    const headers = buildHeaders(opts.headers)
    throwIfProxyAuthIsSent(headers)
    return this[kAgent].dispatch(
      {
        ...opts,
        headers: {
          ...headers,
          host
        }
      },
      handler
    )
  }

  async [kClose] () {
    await this[kAgent].close()
    await this[kClient].close()
  }

  async [kDestroy] () {
    await this[kAgent].destroy()
    await this[kClient].destroy()
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
