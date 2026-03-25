'use strict'

const { promisify } = require('node:util')
const Pool = require('../dispatcher/pool')
const { buildMockDispatch } = require('./mock-utils')
const {
  kDispatches,
  kMockAgent,
  kClose,
  kOriginalClose,
  kOrigin,
  kOriginalDispatch,
  kConnected,
  kIgnoreTrailingSlash
} = require('./mock-symbols')
const { MockInterceptor } = require('./mock-interceptor')
const Symbols = require('../core/symbols')
const { InvalidArgumentError } = require('../core/errors')

/**
 * MockPool provides an API that extends the Pool to influence the mockDispatches.
 */
class MockPool extends Pool {
  constructor (origin, opts) {
    if (!opts || !opts.agent || typeof opts.agent.dispatch !== 'function') {
      throw new InvalidArgumentError('Argument opts.agent must implement Agent')
    }

    super(origin, opts)

    this[kMockAgent] = opts.agent
    this[kOrigin] = origin
    this[kIgnoreTrailingSlash] = opts.ignoreTrailingSlash ?? false
    this[kDispatches] = []
    this[kConnected] = 1
    this[kOriginalDispatch] = this.dispatch
    this[kOriginalClose] = this.close.bind(this)

    this.dispatch = buildMockDispatch.call(this)
    this.close = this[kClose]
  }

  get [Symbols.kConnected] () {
    return this[kConnected]
  }

  /**
   * Sets up the base interceptor for mocking replies from undici.
   */
  intercept (opts) {
    return new MockInterceptor(
      opts && { ignoreTrailingSlash: this[kIgnoreTrailingSlash], ...opts },
      this[kDispatches]
    )
  }

  cleanMocks () {
    this[kDispatches] = []
  }

  async [kClose] () {
    await promisify(this[kOriginalClose])()
    this[kConnected] = 0
    this[kMockAgent][Symbols.kClients].delete(this[kOrigin])
  }
}

module.exports = MockPool
