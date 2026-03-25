'use strict'

const { kClients } = require('../core/symbols')
const Agent = require('../agent')
const {
  kAgent,
  kMockAgentSet,
  kMockAgentGet,
  kDispatches,
  kIsMockActive,
  kNetConnect,
  kGetNetConnect,
  kOptions,
  kFactory
} = require('./mock-symbols')
const MockClient = require('./mock-client')
const MockPool = require('./mock-pool')
const { matchValue, buildMockOptions } = require('./mock-utils')
const { InvalidArgumentError, UndiciError } = require('../core/errors')
const Dispatcher = require('../dispatcher')
const Pluralizer = require('./pluralizer')
const PendingInterceptorsFormatter = require('./pending-interceptors-formatter')

class FakeWeakRef {
  constructor (value) {
    this.value = value
  }

  deref () {
    return this.value
  }
}

class MockAgent extends Dispatcher {
  constructor (opts) {
    super(opts)

    this[kNetConnect] = true
    this[kIsMockActive] = true

    // Instantiate Agent and encapsulate
    if ((opts && opts.agent && typeof opts.agent.dispatch !== 'function')) {
      throw new InvalidArgumentError('Argument opts.agent must implement Agent')
    }
    const agent = opts && opts.agent ? opts.agent : new Agent(opts)
    this[kAgent] = agent

    this[kClients] = agent[kClients]
    this[kOptions] = buildMockOptions(opts)
  }

  get (origin) {
    let dispatcher = this[kMockAgentGet](origin)

    if (!dispatcher) {
      dispatcher = this[kFactory](origin)
      this[kMockAgentSet](origin, dispatcher)
    }
    return dispatcher
  }

  dispatch (opts, handler) {
    // Call MockAgent.get to perform additional setup before dispatching as normal
    this.get(opts.origin)
    return this[kAgent].dispatch(opts, handler)
  }

  async close () {
    await this[kAgent].close()
    this[kClients].clear()
  }

  deactivate () {
    this[kIsMockActive] = false
  }

  activate () {
    this[kIsMockActive] = true
  }

  enableNetConnect (matcher) {
    if (typeof matcher === 'string' || typeof matcher === 'function' || matcher instanceof RegExp) {
      if (Array.isArray(this[kNetConnect])) {
        this[kNetConnect].push(matcher)
      } else {
        this[kNetConnect] = [matcher]
      }
    } else if (typeof matcher === 'undefined') {
      this[kNetConnect] = true
    } else {
      throw new InvalidArgumentError('Unsupported matcher. Must be one of String|Function|RegExp.')
    }
  }

  disableNetConnect () {
    this[kNetConnect] = false
  }

  // This is required to bypass issues caused by using global symbols - see:
  // https://github.com/nodejs/undici/issues/1447
  get isMockActive () {
    return this[kIsMockActive]
  }

  [kMockAgentSet] (origin, dispatcher) {
    this[kClients].set(origin, new FakeWeakRef(dispatcher))
  }

  [kFactory] (origin) {
    const mockOptions = Object.assign({ agent: this }, this[kOptions])
    return this[kOptions] && this[kOptions].connections === 1
      ? new MockClient(origin, mockOptions)
      : new MockPool(origin, mockOptions)
  }

  [kMockAgentGet] (origin) {
    // First check if we can immediately find it
    const ref = this[kClients].get(origin)
    if (ref) {
      return ref.deref()
    }

    // If the origin is not a string create a dummy parent pool and return to user
    if (typeof origin !== 'string') {
      const dispatcher = this[kFactory]('http://localhost:9999')
      this[kMockAgentSet](origin, dispatcher)
      return dispatcher
    }

    // If we match, create a pool and assign the same dispatches
    for (const [keyMatcher, nonExplicitRef] of Array.from(this[kClients])) {
      const nonExplicitDispatcher = nonExplicitRef.deref()
      if (nonExplicitDispatcher && typeof keyMatcher !== 'string' && matchValue(keyMatcher, origin)) {
        const dispatcher = this[kFactory](origin)
        this[kMockAgentSet](origin, dispatcher)
        dispatcher[kDispatches] = nonExplicitDispatcher[kDispatches]
        return dispatcher
      }
    }
  }

  [kGetNetConnect] () {
    return this[kNetConnect]
  }

  pendingInterceptors () {
    const mockAgentClients = this[kClients]

    return Array.from(mockAgentClients.entries())
      .flatMap(([origin, scope]) => scope.deref()[kDispatches].map(dispatch => ({ ...dispatch, origin })))
      .filter(({ pending }) => pending)
  }

  assertNoPendingInterceptors ({ pendingInterceptorsFormatter = new PendingInterceptorsFormatter() } = {}) {
    const pending = this.pendingInterceptors()

    if (pending.length === 0) {
      return
    }

    const pluralizer = new Pluralizer('interceptor', 'interceptors').pluralize(pending.length)

    throw new UndiciError(`
${pluralizer.count} ${pluralizer.noun} ${pluralizer.is} pending:

${pendingInterceptorsFormatter.format(pending)}
`.trim())
  }
}

module.exports = MockAgent
