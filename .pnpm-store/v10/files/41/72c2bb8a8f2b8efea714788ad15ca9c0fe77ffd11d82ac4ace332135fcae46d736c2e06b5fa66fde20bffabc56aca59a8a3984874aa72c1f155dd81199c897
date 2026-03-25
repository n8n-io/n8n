'use strict'

const net = require('node:net')
const assert = require('node:assert')
const util = require('./util')
const { InvalidArgumentError, ConnectTimeoutError } = require('./errors')
const timers = require('../util/timers')

function noop () {}

let tls // include tls conditionally since it is not always available

// TODO: session re-use does not wait for the first
// connection to resolve the session and might therefore
// resolve the same servername multiple times even when
// re-use is enabled.

let SessionCache
// FIXME: remove workaround when the Node bug is fixed
// https://github.com/nodejs/node/issues/49344#issuecomment-1741776308
if (global.FinalizationRegistry && !(process.env.NODE_V8_COVERAGE || process.env.UNDICI_NO_FG)) {
  SessionCache = class WeakSessionCache {
    constructor (maxCachedSessions) {
      this._maxCachedSessions = maxCachedSessions
      this._sessionCache = new Map()
      this._sessionRegistry = new global.FinalizationRegistry((key) => {
        if (this._sessionCache.size < this._maxCachedSessions) {
          return
        }

        const ref = this._sessionCache.get(key)
        if (ref !== undefined && ref.deref() === undefined) {
          this._sessionCache.delete(key)
        }
      })
    }

    get (sessionKey) {
      const ref = this._sessionCache.get(sessionKey)
      return ref ? ref.deref() : null
    }

    set (sessionKey, session) {
      if (this._maxCachedSessions === 0) {
        return
      }

      this._sessionCache.set(sessionKey, new WeakRef(session))
      this._sessionRegistry.register(session, sessionKey)
    }
  }
} else {
  SessionCache = class SimpleSessionCache {
    constructor (maxCachedSessions) {
      this._maxCachedSessions = maxCachedSessions
      this._sessionCache = new Map()
    }

    get (sessionKey) {
      return this._sessionCache.get(sessionKey)
    }

    set (sessionKey, session) {
      if (this._maxCachedSessions === 0) {
        return
      }

      if (this._sessionCache.size >= this._maxCachedSessions) {
        // remove the oldest session
        const { value: oldestKey } = this._sessionCache.keys().next()
        this._sessionCache.delete(oldestKey)
      }

      this._sessionCache.set(sessionKey, session)
    }
  }
}

function buildConnector ({ allowH2, maxCachedSessions, socketPath, timeout, session: customSession, ...opts }) {
  if (maxCachedSessions != null && (!Number.isInteger(maxCachedSessions) || maxCachedSessions < 0)) {
    throw new InvalidArgumentError('maxCachedSessions must be a positive integer or zero')
  }

  const options = { path: socketPath, ...opts }
  const sessionCache = new SessionCache(maxCachedSessions == null ? 100 : maxCachedSessions)
  timeout = timeout == null ? 10e3 : timeout
  allowH2 = allowH2 != null ? allowH2 : false
  return function connect ({ hostname, host, protocol, port, servername, localAddress, httpSocket }, callback) {
    let socket
    if (protocol === 'https:') {
      if (!tls) {
        tls = require('node:tls')
      }
      servername = servername || options.servername || util.getServerName(host) || null

      const sessionKey = servername || hostname
      assert(sessionKey)

      const session = customSession || sessionCache.get(sessionKey) || null

      port = port || 443

      socket = tls.connect({
        highWaterMark: 16384, // TLS in node can't have bigger HWM anyway...
        ...options,
        servername,
        session,
        localAddress,
        // TODO(HTTP/2): Add support for h2c
        ALPNProtocols: allowH2 ? ['http/1.1', 'h2'] : ['http/1.1'],
        socket: httpSocket, // upgrade socket connection
        port,
        host: hostname
      })

      socket
        .on('session', function (session) {
          // TODO (fix): Can a session become invalid once established? Don't think so?
          sessionCache.set(sessionKey, session)
        })
    } else {
      assert(!httpSocket, 'httpSocket can only be sent on TLS update')

      port = port || 80

      socket = net.connect({
        highWaterMark: 64 * 1024, // Same as nodejs fs streams.
        ...options,
        localAddress,
        port,
        host: hostname
      })
    }

    // Set TCP keep alive options on the socket here instead of in connect() for the case of assigning the socket
    if (options.keepAlive == null || options.keepAlive) {
      const keepAliveInitialDelay = options.keepAliveInitialDelay === undefined ? 60e3 : options.keepAliveInitialDelay
      socket.setKeepAlive(true, keepAliveInitialDelay)
    }

    const clearConnectTimeout = setupConnectTimeout(new WeakRef(socket), { timeout, hostname, port })

    socket
      .setNoDelay(true)
      .once(protocol === 'https:' ? 'secureConnect' : 'connect', function () {
        queueMicrotask(clearConnectTimeout)

        if (callback) {
          const cb = callback
          callback = null
          cb(null, this)
        }
      })
      .on('error', function (err) {
        queueMicrotask(clearConnectTimeout)

        if (callback) {
          const cb = callback
          callback = null
          cb(err)
        }
      })

    return socket
  }
}

/**
 * @param {WeakRef<net.Socket>} socketWeakRef
 * @param {object} opts
 * @param {number} opts.timeout
 * @param {string} opts.hostname
 * @param {number} opts.port
 * @returns {() => void}
 */
const setupConnectTimeout = process.platform === 'win32'
  ? (socketWeakRef, opts) => {
      if (!opts.timeout) {
        return noop
      }

      let s1 = null
      let s2 = null
      const fastTimer = timers.setFastTimeout(() => {
      // setImmediate is added to make sure that we prioritize socket error events over timeouts
        s1 = setImmediate(() => {
        // Windows needs an extra setImmediate probably due to implementation differences in the socket logic
          s2 = setImmediate(() => onConnectTimeout(socketWeakRef.deref(), opts))
        })
      }, opts.timeout)
      return () => {
        timers.clearFastTimeout(fastTimer)
        clearImmediate(s1)
        clearImmediate(s2)
      }
    }
  : (socketWeakRef, opts) => {
      if (!opts.timeout) {
        return noop
      }

      let s1 = null
      const fastTimer = timers.setFastTimeout(() => {
      // setImmediate is added to make sure that we prioritize socket error events over timeouts
        s1 = setImmediate(() => {
          onConnectTimeout(socketWeakRef.deref(), opts)
        })
      }, opts.timeout)
      return () => {
        timers.clearFastTimeout(fastTimer)
        clearImmediate(s1)
      }
    }

/**
 * @param {net.Socket} socket
 * @param {object} opts
 * @param {number} opts.timeout
 * @param {string} opts.hostname
 * @param {number} opts.port
 */
function onConnectTimeout (socket, opts) {
  // The socket could be already garbage collected
  if (socket == null) {
    return
  }

  let message = 'Connect Timeout Error'
  if (Array.isArray(socket.autoSelectFamilyAttemptedAddresses)) {
    message += ` (attempted addresses: ${socket.autoSelectFamilyAttemptedAddresses.join(', ')},`
  } else {
    message += ` (attempted address: ${opts.hostname}:${opts.port},`
  }

  message += ` timeout: ${opts.timeout}ms)`

  util.destroy(socket, new ConnectTimeoutError(message))
}

module.exports = buildConnector
