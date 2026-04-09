'use strict'

const net = require('node:net')
const { URL } = require('node:url')

let tls // include tls conditionally since it is not always available
const DispatcherBase = require('./dispatcher-base')
const { InvalidArgumentError } = require('../core/errors')
const { Socks5Client } = require('../core/socks5-client')
const { kDispatch, kClose, kDestroy } = require('../core/symbols')
const Pool = require('./pool')
const buildConnector = require('../core/connect')
const { debuglog } = require('node:util')

const debug = debuglog('undici:socks5-proxy')

const kProxyUrl = Symbol('proxy url')
const kProxyHeaders = Symbol('proxy headers')
const kProxyAuth = Symbol('proxy auth')
const kPool = Symbol('pool')
const kConnector = Symbol('connector')

// Static flag to ensure warning is only emitted once per process
let experimentalWarningEmitted = false

/**
 * SOCKS5 proxy agent for dispatching requests through a SOCKS5 proxy
 */
class Socks5ProxyAgent extends DispatcherBase {
  constructor (proxyUrl, options = {}) {
    super()

    // Emit experimental warning only once
    if (!experimentalWarningEmitted) {
      process.emitWarning(
        'SOCKS5 proxy support is experimental and subject to change',
        'ExperimentalWarning'
      )
      experimentalWarningEmitted = true
    }

    if (!proxyUrl) {
      throw new InvalidArgumentError('Proxy URL is mandatory')
    }

    // Parse proxy URL
    const url = typeof proxyUrl === 'string' ? new URL(proxyUrl) : proxyUrl

    if (url.protocol !== 'socks5:' && url.protocol !== 'socks:') {
      throw new InvalidArgumentError('Proxy URL must use socks5:// or socks:// protocol')
    }

    this[kProxyUrl] = url
    this[kProxyHeaders] = options.headers || {}

    // Extract auth from URL or options
    this[kProxyAuth] = {
      username: options.username || (url.username ? decodeURIComponent(url.username) : null),
      password: options.password || (url.password ? decodeURIComponent(url.password) : null)
    }

    // Create connector for proxy connection
    this[kConnector] = options.connect || buildConnector({
      ...options.proxyTls,
      servername: options.proxyTls?.servername || url.hostname
    })

    // Pool for the actual HTTP connections (with SOCKS5 tunnel connect function)
    this[kPool] = null
  }

  /**
   * Create a SOCKS5 connection to the proxy
   */
  async createSocks5Connection (targetHost, targetPort) {
    const proxyHost = this[kProxyUrl].hostname
    const proxyPort = parseInt(this[kProxyUrl].port) || 1080

    debug('creating SOCKS5 connection to', proxyHost, proxyPort)

    // Connect to the SOCKS5 proxy
    const socket = await new Promise((resolve, reject) => {
      const onConnect = () => {
        socket.removeListener('error', onError)
        resolve(socket)
      }

      const onError = (err) => {
        socket.removeListener('connect', onConnect)
        reject(err)
      }

      const socket = net.connect({
        host: proxyHost,
        port: proxyPort
      })

      socket.once('connect', onConnect)
      socket.once('error', onError)
    })

    // Create SOCKS5 client
    const socks5Client = new Socks5Client(socket, this[kProxyAuth])

    // Handle SOCKS5 errors
    socks5Client.on('error', (err) => {
      debug('SOCKS5 error:', err)
      socket.destroy()
    })

    // Perform SOCKS5 handshake
    await socks5Client.handshake()

    // Wait for authentication (if required)
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SOCKS5 authentication timeout'))
      }, 5000)

      const onAuthenticated = () => {
        clearTimeout(timeout)
        socks5Client.removeListener('error', onError)
        resolve()
      }

      const onError = (err) => {
        clearTimeout(timeout)
        socks5Client.removeListener('authenticated', onAuthenticated)
        reject(err)
      }

      // Check if already authenticated (for NO_AUTH method)
      if (socks5Client.state === 'authenticated') {
        clearTimeout(timeout)
        resolve()
      } else {
        socks5Client.once('authenticated', onAuthenticated)
        socks5Client.once('error', onError)
      }
    })

    // Send CONNECT command
    await socks5Client.connect(targetHost, targetPort)

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SOCKS5 connection timeout'))
      }, 5000)

      const onConnected = (info) => {
        debug('SOCKS5 tunnel established to', targetHost, targetPort, 'via', info)
        clearTimeout(timeout)
        socks5Client.removeListener('error', onError)
        resolve()
      }

      const onError = (err) => {
        clearTimeout(timeout)
        socks5Client.removeListener('connected', onConnected)
        reject(err)
      }

      socks5Client.once('connected', onConnected)
      socks5Client.once('error', onError)
    })

    return socket
  }

  /**
   * Dispatch a request through the SOCKS5 proxy
   */
  async [kDispatch] (opts, handler) {
    const { origin } = opts

    debug('dispatching request to', origin, 'via SOCKS5')

    try {
      // Create Pool with custom connect function if we don't have one yet
      if (!this[kPool] || this[kPool].destroyed || this[kPool].closed) {
        this[kPool] = new Pool(origin, {
          pipelining: opts.pipelining,
          connections: opts.connections,
          connect: async (connectOpts, callback) => {
            try {
              const url = new URL(origin)
              const targetHost = url.hostname
              const targetPort = parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80)

              debug('establishing SOCKS5 connection to', targetHost, targetPort)

              // Create SOCKS5 tunnel
              const socket = await this.createSocks5Connection(targetHost, targetPort)

              // Handle TLS if needed
              let finalSocket = socket
              if (url.protocol === 'https:') {
                if (!tls) {
                  tls = require('node:tls')
                }
                debug('upgrading to TLS')
                finalSocket = tls.connect({
                  socket,
                  servername: targetHost,
                  ...connectOpts.tls || {}
                })

                await new Promise((resolve, reject) => {
                  finalSocket.once('secureConnect', resolve)
                  finalSocket.once('error', reject)
                })
              }

              callback(null, finalSocket)
            } catch (err) {
              debug('SOCKS5 connection error:', err)
              callback(err)
            }
          }
        })
      }

      // Dispatch the request through the pool
      return this[kPool][kDispatch](opts, handler)
    } catch (err) {
      debug('dispatch error:', err)
      if (typeof handler.onError === 'function') {
        handler.onError(err)
      } else {
        throw err
      }
    }
  }

  async [kClose] () {
    if (this[kPool]) {
      await this[kPool].close()
    }
  }

  async [kDestroy] (err) {
    if (this[kPool]) {
      await this[kPool].destroy(err)
    }
  }
}

module.exports = Socks5ProxyAgent
