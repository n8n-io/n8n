'use strict'

const {
  PoolBase,
  kClients,
  kNeedDrain,
  kAddClient,
  kGetDispatcher,
  kRemoveClient
} = require('./pool-base')
const Client = require('./client')
const {
  InvalidArgumentError
} = require('../core/errors')
const util = require('../core/util')
const { kUrl } = require('../core/symbols')
const buildConnector = require('../core/connect')

const kOptions = Symbol('options')
const kConnections = Symbol('connections')
const kFactory = Symbol('factory')
const kIndex = Symbol('index')

function defaultFactory (origin, opts) {
  return new Client(origin, opts)
}

class RoundRobinPool extends PoolBase {
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
    clientTtl,
    ...options
  } = {}) {
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
        ...(typeof autoSelectFamily === 'boolean' ? { autoSelectFamily, autoSelectFamilyAttemptTimeout } : undefined),
        ...connect
      })
    }

    super()

    this[kConnections] = connections || null
    this[kUrl] = util.parseOrigin(origin)
    this[kOptions] = { ...util.deepClone(options), connect, allowH2, clientTtl }
    this[kOptions].interceptors = options.interceptors
      ? { ...options.interceptors }
      : undefined
    this[kFactory] = factory
    this[kIndex] = -1

    this.on('connect', (origin, targets) => {
      if (clientTtl != null && clientTtl > 0) {
        for (const target of targets) {
          Object.assign(target, { ttl: Date.now() })
        }
      }
    })

    this.on('connectionError', (origin, targets, error) => {
      for (const target of targets) {
        const idx = this[kClients].indexOf(target)
        if (idx !== -1) {
          this[kClients].splice(idx, 1)
        }
      }
    })
  }

  [kGetDispatcher] () {
    const clientTtlOption = this[kOptions].clientTtl
    const clientsLength = this[kClients].length

    // If we have no clients yet, create one
    if (clientsLength === 0) {
      const dispatcher = this[kFactory](this[kUrl], this[kOptions])
      this[kAddClient](dispatcher)
      return dispatcher
    }

    // Round-robin through existing clients
    let checked = 0
    while (checked < clientsLength) {
      this[kIndex] = (this[kIndex] + 1) % clientsLength
      const client = this[kClients][this[kIndex]]

      // Check if client is stale (TTL expired)
      if (clientTtlOption != null && clientTtlOption > 0 && client.ttl && ((Date.now() - client.ttl) > clientTtlOption)) {
        this[kRemoveClient](client)
        checked++
        continue
      }

      // Return client if it's not draining
      if (!client[kNeedDrain]) {
        return client
      }

      checked++
    }

    // All clients are busy, create a new one if we haven't reached the limit
    if (!this[kConnections] || clientsLength < this[kConnections]) {
      const dispatcher = this[kFactory](this[kUrl], this[kOptions])
      this[kAddClient](dispatcher)
      return dispatcher
    }
  }
}

module.exports = RoundRobinPool
