'use strict'

const {
  kConnected,
  kPending,
  kRunning,
  kSize,
  kFree,
  kQueued
} = require('../core/symbols')

class ClientStats {
  constructor (client) {
    this.connected = client[kConnected]
    this.pending = client[kPending]
    this.running = client[kRunning]
    this.size = client[kSize]
  }
}

class PoolStats {
  constructor (pool) {
    this.connected = pool[kConnected]
    this.free = pool[kFree]
    this.pending = pool[kPending]
    this.queued = pool[kQueued]
    this.running = pool[kRunning]
    this.size = pool[kSize]
  }
}

module.exports = { ClientStats, PoolStats }
