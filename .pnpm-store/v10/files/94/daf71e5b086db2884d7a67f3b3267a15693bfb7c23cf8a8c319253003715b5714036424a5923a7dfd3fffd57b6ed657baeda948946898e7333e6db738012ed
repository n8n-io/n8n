'use strict'

const { PoolStats } = require('../util/stats.js')
const DispatcherBase = require('./dispatcher-base')
const FixedQueue = require('./fixed-queue')
const { kConnected, kSize, kRunning, kPending, kQueued, kBusy, kFree, kUrl, kClose, kDestroy, kDispatch } = require('../core/symbols')

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

class PoolBase extends DispatcherBase {
  [kQueue] = new FixedQueue();

  [kQueued] = 0;

  [kClients] = [];

  [kNeedDrain] = false;

  [kOnDrain] (client, origin, targets) {
    const queue = this[kQueue]

    let needDrain = false

    while (!needDrain) {
      const item = queue.shift()
      if (!item) {
        break
      }
      this[kQueued]--
      needDrain = !client.dispatch(item.opts, item.handler)
    }

    client[kNeedDrain] = needDrain

    if (!needDrain && this[kNeedDrain]) {
      this[kNeedDrain] = false
      this.emit('drain', origin, [this, ...targets])
    }

    if (this[kClosedResolve] && queue.isEmpty()) {
      const closeAll = new Array(this[kClients].length)
      for (let i = 0; i < this[kClients].length; i++) {
        closeAll[i] = this[kClients][i].close()
      }
      return Promise.all(closeAll)
        .then(this[kClosedResolve])
    }
  }

  [kOnConnect] = (origin, targets) => {
    this.emit('connect', origin, [this, ...targets])
  };

  [kOnDisconnect] = (origin, targets, err) => {
    this.emit('disconnect', origin, [this, ...targets], err)
  };

  [kOnConnectionError] = (origin, targets, err) => {
    this.emit('connectionError', origin, [this, ...targets], err)
  }

  get [kBusy] () {
    return this[kNeedDrain]
  }

  get [kConnected] () {
    let ret = 0
    for (const { [kConnected]: connected } of this[kClients]) {
      ret += connected
    }
    return ret
  }

  get [kFree] () {
    let ret = 0
    for (const { [kConnected]: connected, [kNeedDrain]: needDrain } of this[kClients]) {
      ret += connected && !needDrain
    }
    return ret
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
    return new PoolStats(this)
  }

  [kClose] () {
    if (this[kQueue].isEmpty()) {
      const closeAll = new Array(this[kClients].length)
      for (let i = 0; i < this[kClients].length; i++) {
        closeAll[i] = this[kClients][i].close()
      }
      return Promise.all(closeAll)
    } else {
      return new Promise((resolve) => {
        this[kClosedResolve] = resolve
      })
    }
  }

  [kDestroy] (err) {
    while (true) {
      const item = this[kQueue].shift()
      if (!item) {
        break
      }
      item.handler.onError(err)
    }

    const destroyAll = new Array(this[kClients].length)
    for (let i = 0; i < this[kClients].length; i++) {
      destroyAll[i] = this[kClients][i].destroy(err)
    }
    return Promise.all(destroyAll)
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
      .on('drain', this[kOnDrain].bind(this, client))
      .on('connect', this[kOnConnect])
      .on('disconnect', this[kOnDisconnect])
      .on('connectionError', this[kOnConnectionError])

    this[kClients].push(client)

    if (this[kNeedDrain]) {
      queueMicrotask(() => {
        if (this[kNeedDrain]) {
          this[kOnDrain](client, client[kUrl], [client, this])
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
