'use strict'

const {
  BalancedPoolMissingUpstreamError,
  InvalidArgumentError
} = require('../core/errors')
const {
  PoolBase,
  kClients,
  kNeedDrain,
  kAddClient,
  kRemoveClient,
  kGetDispatcher
} = require('./pool-base')
const Pool = require('./pool')
const { kUrl } = require('../core/symbols')
const { parseOrigin } = require('../core/util')
const kFactory = Symbol('factory')

const kOptions = Symbol('options')
const kGreatestCommonDivisor = Symbol('kGreatestCommonDivisor')
const kCurrentWeight = Symbol('kCurrentWeight')
const kIndex = Symbol('kIndex')
const kWeight = Symbol('kWeight')
const kMaxWeightPerServer = Symbol('kMaxWeightPerServer')
const kErrorPenalty = Symbol('kErrorPenalty')

/**
 * Calculate the greatest common divisor of two numbers by
 * using the Euclidean algorithm.
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function getGreatestCommonDivisor (a, b) {
  if (a === 0) return b

  while (b !== 0) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

function defaultFactory (origin, opts) {
  return new Pool(origin, opts)
}

class BalancedPool extends PoolBase {
  constructor (upstreams = [], { factory = defaultFactory, ...opts } = {}) {
    if (typeof factory !== 'function') {
      throw new InvalidArgumentError('factory must be a function.')
    }

    super()

    this[kOptions] = opts
    this[kIndex] = -1
    this[kCurrentWeight] = 0

    this[kMaxWeightPerServer] = this[kOptions].maxWeightPerServer || 100
    this[kErrorPenalty] = this[kOptions].errorPenalty || 15

    if (!Array.isArray(upstreams)) {
      upstreams = [upstreams]
    }

    this[kFactory] = factory

    for (const upstream of upstreams) {
      this.addUpstream(upstream)
    }
    this._updateBalancedPoolStats()
  }

  addUpstream (upstream) {
    const upstreamOrigin = parseOrigin(upstream).origin

    if (this[kClients].find((pool) => (
      pool[kUrl].origin === upstreamOrigin &&
      pool.closed !== true &&
      pool.destroyed !== true
    ))) {
      return this
    }
    const pool = this[kFactory](upstreamOrigin, Object.assign({}, this[kOptions]))

    this[kAddClient](pool)
    pool.on('connect', () => {
      pool[kWeight] = Math.min(this[kMaxWeightPerServer], pool[kWeight] + this[kErrorPenalty])
    })

    pool.on('connectionError', () => {
      pool[kWeight] = Math.max(1, pool[kWeight] - this[kErrorPenalty])
      this._updateBalancedPoolStats()
    })

    pool.on('disconnect', (...args) => {
      const err = args[2]
      if (err && err.code === 'UND_ERR_SOCKET') {
        // decrease the weight of the pool.
        pool[kWeight] = Math.max(1, pool[kWeight] - this[kErrorPenalty])
        this._updateBalancedPoolStats()
      }
    })

    for (const client of this[kClients]) {
      client[kWeight] = this[kMaxWeightPerServer]
    }

    this._updateBalancedPoolStats()

    return this
  }

  _updateBalancedPoolStats () {
    let result = 0
    for (let i = 0; i < this[kClients].length; i++) {
      result = getGreatestCommonDivisor(this[kClients][i][kWeight], result)
    }

    this[kGreatestCommonDivisor] = result
  }

  removeUpstream (upstream) {
    const upstreamOrigin = parseOrigin(upstream).origin

    const pool = this[kClients].find((pool) => (
      pool[kUrl].origin === upstreamOrigin &&
      pool.closed !== true &&
      pool.destroyed !== true
    ))

    if (pool) {
      this[kRemoveClient](pool)
    }

    return this
  }

  getUpstream (upstream) {
    const upstreamOrigin = parseOrigin(upstream).origin

    return this[kClients].find((pool) => (
      pool[kUrl].origin === upstreamOrigin &&
      pool.closed !== true &&
      pool.destroyed !== true
    ))
  }

  get upstreams () {
    return this[kClients]
      .filter(dispatcher => dispatcher.closed !== true && dispatcher.destroyed !== true)
      .map((p) => p[kUrl].origin)
  }

  [kGetDispatcher] () {
    // We validate that pools is greater than 0,
    // otherwise we would have to wait until an upstream
    // is added, which might never happen.
    if (this[kClients].length === 0) {
      throw new BalancedPoolMissingUpstreamError()
    }

    const dispatcher = this[kClients].find(dispatcher => (
      !dispatcher[kNeedDrain] &&
      dispatcher.closed !== true &&
      dispatcher.destroyed !== true
    ))

    if (!dispatcher) {
      return
    }

    const allClientsBusy = this[kClients].map(pool => pool[kNeedDrain]).reduce((a, b) => a && b, true)

    if (allClientsBusy) {
      return
    }

    let counter = 0

    let maxWeightIndex = this[kClients].findIndex(pool => !pool[kNeedDrain])

    while (counter++ < this[kClients].length) {
      this[kIndex] = (this[kIndex] + 1) % this[kClients].length
      const pool = this[kClients][this[kIndex]]

      // find pool index with the largest weight
      if (pool[kWeight] > this[kClients][maxWeightIndex][kWeight] && !pool[kNeedDrain]) {
        maxWeightIndex = this[kIndex]
      }

      // decrease the current weight every `this[kClients].length`.
      if (this[kIndex] === 0) {
        // Set the current weight to the next lower weight.
        this[kCurrentWeight] = this[kCurrentWeight] - this[kGreatestCommonDivisor]

        if (this[kCurrentWeight] <= 0) {
          this[kCurrentWeight] = this[kMaxWeightPerServer]
        }
      }
      if (pool[kWeight] >= this[kCurrentWeight] && (!pool[kNeedDrain])) {
        return pool
      }
    }

    this[kCurrentWeight] = this[kClients][maxWeightIndex][kWeight]
    this[kIndex] = maxWeightIndex
    return this[kClients][maxWeightIndex]
  }
}

module.exports = BalancedPool
