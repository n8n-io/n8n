'use strict'

const {
  PoolBase,
  kClients,
  kNeedDrain,
  kAddClient,
  kGetDispatcher
} = require('./pool-base')
const Client = require('./client')
const {
  InvalidArgumentError
} = require('./core/errors')
const util = require('./core/util')
const { kUrl, kInterceptors } = require('./core/symbols')
const buildConnector = require('./core/connect')

const kOptions = Symbol('options')
const kConnections = Symbol('connections')
const kFactory = Symbol('factory')

function defaultFactory (origin, opts) {
  return new Client(origin, opts)
}

class Pool extends PoolBase {
  constructor (origin, {
    connections,
    factory = defaultFactory,
    connect,
    connectTimeout,
    tls,
    maxCachedSessions,
    socketPath,
    autoSelectFamily,
    autoSelectFamilyAttemptTimeout,
    allowH2,
    ...options
  } = {}) {
    super()

    if (connections != null && (!Number.isFinite(connections) || connections < 0)) {
      throw new InvalidArgumentError('invalid connections')
    }

    if (typeof factory !== 'function') {
      throw new InvalidArgumentError('factory must be a function.')
    }

    if (connect != null && typeof connect !== 'function' && typeof connect !== 'object') {
      throw new InvalidArgumentError('connect must be a function or an object')
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

    this[kInterceptors] = options.interceptors && options.interceptors.Pool && Array.isArray(options.interceptors.Pool)
      ? options.interceptors.Pool
      : []
    this[kConnections] = connections || null
    this[kUrl] = util.parseOrigin(origin)
    this[kOptions] = { ...util.deepClone(options), connect, allowH2 }
    this[kOptions].interceptors = options.interceptors
      ? { ...options.interceptors }
      : undefined
    this[kFactory] = factory

    this.on('connectionError', (origin, targets, error) => {
      // If a connection error occurs, we remove the client from the pool,
      // and emit a connectionError event. They will not be re-used.
      // Fixes https://github.com/nodejs/undici/issues/3895
      for (const target of targets) {
        // Do not use kRemoveClient here, as it will close the client,
        // but the client cannot be closed in this state.
        const idx = this[kClients].indexOf(target)
        if (idx !== -1) {
          this[kClients].splice(idx, 1)
        }
      }
    })
  }

  [kGetDispatcher] () {
    let dispatcher = this[kClients].find(dispatcher => !dispatcher[kNeedDrain])

    if (dispatcher) {
      return dispatcher
    }

    if (!this[kConnections] || this[kClients].length < this[kConnections]) {
      dispatcher = this[kFactory](this[kUrl], this[kOptions])
      this[kAddClient](dispatcher)
    }

    return dispatcher
  }
}

module.exports = Pool
