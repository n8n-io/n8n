'use strict'

const DispatcherBase = require('./dispatcher-base')
const FixedQueue = require('./fixed-queue')
const { kConnected, kSize, kRunning, kPending, kQueued, kBusy, kFree, kUrl, kClose, kDestroy, kDispatch } = require('../core/symbols')
const PoolStats = require('./pool-stats')

const kClients = Symbol('clients')
const kNeedDrain = Symbol('needDrain')
const kQueue = Symbol('queue')
const kClosedResolve = Symbol('closed resolve')
const kOnDrain = Symbol('onDrain')
const kOnConnect = Symbol('onConnect')
const kOnDisconnect = Symbol('onDisconnect')
const kOnConnectionError = Symbol('onConnectionError')
const kGetDispatcher = Symbol('get dispatcher')
const kAddClient = Symbol('add client')
const kRemoveClient = Symbol('remove client')
const kStats = Symbol('stats')

class PoolBase extends DispatcherBase {
  constructor () {
    super()

    this[kQueue] = new FixedQueue()
    this[kClients] = []
    this[kQueued] = 0

    const pool = this

    this[kOnDrain] = function onDrain (origin, targets) {
      const queue = pool[kQueue]

      let needDrain = false

      while (!needDrain) {
        const item = queue.shift()
        if (!item) {
          break
        }
        pool[kQueued]--
        needDrain = !this.dispatch(item.opts, item.handler)
      }

      this[kNeedDrain] = needDrain

      if (!this[kNeedDrain] && pool[kNeedDrain]) {
        pool[kNeedDrain] = false
        pool.emit('drain', origin, [pool, ...targets])
      }

      if (pool[kClosedResolve] && queue.isEmpty()) {
        Promise
          .all(pool[kClients].map(c => c.close()))
          .then(pool[kClosedResolve])
      }
    }

    this[kOnConnect] = (origin, targets) => {
      pool.emit('connect', origin, [pool, ...targets])
    }

    this[kOnDisconnect] = (origin, targets, err) => {
      pool.emit('disconnect', origin, [pool, ...targets], err)
    }

    this[kOnConnectionError] = (origin, targets, err) => {
      pool.emit('connectionError', origin, [pool, ...targets], err)
    }

    this[kStats] = new PoolStats(this)
  }

  get [kBusy] () {
    return this[kNeedDrain]
  }

  get [kConnected] () {
    return this[kClients].filter(client => client[kConnected]).length
  }

  get [kFree] () {
    return this[kClients].filter(client => client[kConnected] && !client[kNeedDrain]).length
  }

  get [kPending] () {
    let ret = this[kQueued]
    for (const { [kPending]: pending } of this[kClients]) {
      ret += pending
    }
    return ret
  }

  get [kRunning] () {
    let ret = 0
    for (const { [kRunning]: running } of this[kClients]) {
      ret += running
    }
    return ret
  }

  get [kSize] () {
    let ret = this[kQueued]
    for (const { [kSize]: size } of this[kClients]) {
      ret += size
    }
    return ret
  }

  get stats () {
    return this[kStats]
  }

  async [kClose] () {
    if (this[kQueue].isEmpty()) {
      await Promise.all(this[kClients].map(c => c.close()))
    } else {
      await new Promise((resolve) => {
        this[kClosedResolve] = resolve
      })
    }
  }

  async [kDestroy] (err) {
    while (true) {
      const item = this[kQueue].shift()
      if (!item) {
        break
      }
      item.handler.onError(err)
    }

    await Promise.all(this[kClients].map(c => c.destroy(err)))
  }

  [kDispatch] (opts, handler) {
    const dispatcher = this[kGetDispatcher]()

    if (!dispatcher) {
      this[kNeedDrain] = true
      this[kQueue].push({ opts, handler })
      this[kQueued]++
    } else if (!dispatcher.dispatch(opts, handler)) {
      dispatcher[kNeedDrain] = true
      this[kNeedDrain] = !this[kGetDispatcher]()
    }

    return !this[kNeedDrain]
  }

  [kAddClient] (client) {
    client
      .on('drain', this[kOnDrain])
      .on('connect', this[kOnConnect])
      .on('disconnect', this[kOnDisconnect])
      .on('connectionError', this[kOnConnectionError])

    this[kClients].push(client)

    if (this[kNeedDrain]) {
      queueMicrotask(() => {
        if (this[kNeedDrain]) {
          this[kOnDrain](client[kUrl], [this, client])
        }
      })
    }

    return this
  }

  [kRemoveClient] (client) {
    client.close(() => {
      const idx = this[kClients].indexOf(client)
      if (idx !== -1) {
        this[kClients].splice(idx, 1)
      }
    })

    this[kNeedDrain] = this[kClients].some(dispatcher => (
      !dispatcher[kNeedDrain] &&
      dispatcher.closed !== true &&
      dispatcher.destroyed !== true
    ))
  }
}

module.exports = {
  PoolBase,
  kClients,
  kNeedDrain,
  kAddClient,
  kRemoveClient,
  kGetDispatcher
}
