const { kFree, kConnected, kPending, kQueued, kRunning, kSize } = require('./core/symbols')
const kPool = Symbol('pool')

class PoolStats {
  constructor (pool) {
    this[kPool] = pool
  }

  get connected () {
    return this[kPool][kConnected]
  }

  get free () {
    return this[kPool][kFree]
  }

  get pending () {
    return this[kPool][kPending]
  }

  get queued () {
    return this[kPool][kQueued]
  }

  get running () {
    return this[kPool][kRunning]
  }

  get size () {
    return this[kPool][kSize]
  }
}

module.exports = PoolStats
