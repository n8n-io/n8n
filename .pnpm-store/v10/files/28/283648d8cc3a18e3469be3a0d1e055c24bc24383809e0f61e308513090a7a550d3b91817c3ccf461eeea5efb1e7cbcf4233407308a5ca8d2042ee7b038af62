'use strict'

const { InvalidArgumentError } = require('./core/errors')
const { kClients, kRunning, kClose, kDestroy, kDispatch, kInterceptors } = require('./core/symbols')
const DispatcherBase = require('./dispatcher-base')
const Pool = require('./pool')
const Client = require('./client')
const util = require('./core/util')
const createRedirectInterceptor = require('./interceptor/redirectInterceptor')
const { WeakRef, FinalizationRegistry } = require('./compat/dispatcher-weakref')()

const kOnConnect = Symbol('onConnect')
const kOnDisconnect = Symbol('onDisconnect')
const kOnConnectionError = Symbol('onConnectionError')
const kMaxRedirections = Symbol('maxRedirections')
const kOnDrain = Symbol('onDrain')
const kFactory = Symbol('factory')
const kFinalizer = Symbol('finalizer')
const kOptions = Symbol('options')

function defaultFactory (origin, opts) {
  return opts && opts.connections === 1
    ? new Client(origin, opts)
    : new Pool(origin, opts)
}

class Agent extends DispatcherBase {
  constructor ({ factory = defaultFactory, maxRedirections = 0, connect, ...options } = {}) {
    super()

    if (typeof factory !== 'function') {
      throw new InvalidArgumentError('factory must be a function.')
    }

    if (connect != null && typeof connect !== 'function' && typeof connect !== 'object') {
      throw new InvalidArgumentError('connect must be a function or an object')
    }

    if (!Number.isInteger(maxRedirections) || maxRedirections < 0) {
      throw new InvalidArgumentError('maxRedirections must be a positive number')
    }

    if (connect && typeof connect !== 'function') {
      connect = { ...connect }
    }

    this[kInterceptors] = options.interceptors && options.interceptors.Agent && Array.isArray(options.interceptors.Agent)
      ? options.interceptors.Agent
      : [createRedirectInterceptor({ maxRedirections })]

    this[kOptions] = { ...util.deepClone(options), connect }
    this[kOptions].interceptors = options.interceptors
      ? { ...options.interceptors }
      : undefined
    this[kMaxRedirections] = maxRedirections
    this[kFactory] = factory
    this[kClients] = new Map()
    this[kFinalizer] = new FinalizationRegistry(/* istanbul ignore next: gc is undeterministic */ key => {
      const ref = this[kClients].get(key)
      if (ref !== undefined && ref.deref() === undefined) {
        this[kClients].delete(key)
      }
    })

    const agent = this

    this[kOnDrain] = (origin, targets) => {
      agent.emit('drain', origin, [agent, ...targets])
    }

    this[kOnConnect] = (origin, targets) => {
      agent.emit('connect', origin, [agent, ...targets])
    }

    this[kOnDisconnect] = (origin, targets, err) => {
      agent.emit('disconnect', origin, [agent, ...targets], err)
    }

    this[kOnConnectionError] = (origin, targets, err) => {
      agent.emit('connectionError', origin, [agent, ...targets], err)
    }
  }

  get [kRunning] () {
    let ret = 0
    for (const ref of this[kClients].values()) {
      const client = ref.deref()
      /* istanbul ignore next: gc is undeterministic */
      if (client) {
        ret += client[kRunning]
      }
    }
    return ret
  }

  [kDispatch] (opts, handler) {
    let key
    if (opts.origin && (typeof opts.origin === 'string' || opts.origin instanceof URL)) {
      key = String(opts.origin)
    } else {
      throw new InvalidArgumentError('opts.origin must be a non-empty string or URL.')
    }

    const ref = this[kClients].get(key)

    let dispatcher = ref ? ref.deref() : null
    if (!dispatcher) {
      dispatcher = this[kFactory](opts.origin, this[kOptions])
        .on('drain', this[kOnDrain])
        .on('connect', this[kOnConnect])
        .on('disconnect', this[kOnDisconnect])
        .on('connectionError', this[kOnConnectionError])

      this[kClients].set(key, new WeakRef(dispatcher))
      this[kFinalizer].register(dispatcher, key)
    }

    return dispatcher.dispatch(opts, handler)
  }

  async [kClose] () {
    const closePromises = []
    for (const ref of this[kClients].values()) {
      const client = ref.deref()
      /* istanbul ignore else: gc is undeterministic */
      if (client) {
        closePromises.push(client.close())
      }
    }

    await Promise.all(closePromises)
  }

  async [kDestroy] (err) {
    const destroyPromises = []
    for (const ref of this[kClients].values()) {
      const client = ref.deref()
      /* istanbul ignore else: gc is undeterministic */
      if (client) {
        destroyPromises.push(client.destroy(err))
      }
    }

    await Promise.all(destroyPromises)
  }
}

module.exports = Agent
