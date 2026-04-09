'use strict'

const { kClients } = require('../core/symbols')
const Agent = require('../dispatcher/agent')
const {
  kAgent,
  kMockAgentSet,
  kMockAgentGet,
  kDispatches,
  kIsMockActive,
  kNetConnect,
  kGetNetConnect,
  kOptions,
  kFactory,
  kMockAgentRegisterCallHistory,
  kMockAgentIsCallHistoryEnabled,
  kMockAgentAddCallHistoryLog,
  kMockAgentMockCallHistoryInstance,
  kMockAgentAcceptsNonStandardSearchParameters,
  kMockCallHistoryAddLog,
  kIgnoreTrailingSlash
} = require('./mock-symbols')
const MockClient = require('./mock-client')
const MockPool = require('./mock-pool')
const { matchValue, normalizeSearchParams, buildAndValidateMockOptions, normalizeOrigin } = require('./mock-utils')
const { InvalidArgumentError, UndiciError } = require('../core/errors')
const Dispatcher = require('../dispatcher/dispatcher')
const PendingInterceptorsFormatter = require('./pending-interceptors-formatter')
const { MockCallHistory } = require('./mock-call-history')

class MockAgent extends Dispatcher {
  constructor (opts = {}) {
    super(opts)

    const mockOptions = buildAndValidateMockOptions(opts)

    this[kNetConnect] = true
    this[kIsMockActive] = true
    this[kMockAgentIsCallHistoryEnabled] = mockOptions.enableCallHistory ?? false
    this[kMockAgentAcceptsNonStandardSearchParameters] = mockOptions.acceptNonStandardSearchParameters ?? false
    this[kIgnoreTrailingSlash] = mockOptions.ignoreTrailingSlash ?? false

    // Instantiate Agent and encapsulate
    if (opts?.agent && typeof opts.agent.dispatch !== 'function') {
      throw new InvalidArgumentError('Argument opts.agent must implement Agent')
    }
    const agent = opts?.agent ? opts.agent : new Agent(opts)
    this[kAgent] = agent

    this[kClients] = agent[kClients]
    this[kOptions] = mockOptions

    if (this[kMockAgentIsCallHistoryEnabled]) {
      this[kMockAgentRegisterCallHistory]()
    }
  }

  get (origin) {
    // Normalize origin to handle URL objects and case-insensitive hostnames
    const normalizedOrigin = normalizeOrigin(origin)
    const originKey = this[kIgnoreTrailingSlash] ? normalizedOrigin.replace(/\/$/, '') : normalizedOrigin

    let dispatcher = this[kMockAgentGet](originKey)

    if (!dispatcher) {
      dispatcher = this[kFactory](originKey)
      this[kMockAgentSet](originKey, dispatcher)
    }
    return dispatcher
  }

  dispatch (opts, handler) {
    opts.origin = normalizeOrigin(opts.origin)

    // Call MockAgent.get to perform additional setup before dispatching as normal
    this.get(opts.origin)

    this[kMockAgentAddCallHistoryLog](opts)

    const acceptNonStandardSearchParameters = this[kMockAgentAcceptsNonStandardSearchParameters]

    const dispatchOpts = { ...opts }

    if (acceptNonStandardSearchParameters && dispatchOpts.path) {
      const [path, searchParams] = dispatchOpts.path.split('?')
      const normalizedSearchParams = normalizeSearchParams(searchParams, acceptNonStandardSearchParameters)
      dispatchOpts.path = `${path}?${normalizedSearchParams}`
    }

    return this[kAgent].dispatch(dispatchOpts, handler)
  }

  async close () {
    this.clearCallHistory()
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

  enableCallHistory () {
    this[kMockAgentIsCallHistoryEnabled] = true

    return this
  }

  disableCallHistory () {
    this[kMockAgentIsCallHistoryEnabled] = false

    return this
  }

  getCallHistory () {
    return this[kMockAgentMockCallHistoryInstance]
  }

  clearCallHistory () {
    if (this[kMockAgentMockCallHistoryInstance] !== undefined) {
      this[kMockAgentMockCallHistoryInstance].clear()
    }
  }

  // This is required to bypass issues caused by using global symbols - see:
  // https://github.com/nodejs/undici/issues/1447
  get isMockActive () {
    return this[kIsMockActive]
  }

  [kMockAgentRegisterCallHistory] () {
    if (this[kMockAgentMockCallHistoryInstance] === undefined) {
      this[kMockAgentMockCallHistoryInstance] = new MockCallHistory()
    }
  }

  [kMockAgentAddCallHistoryLog] (opts) {
    if (this[kMockAgentIsCallHistoryEnabled]) {
      // additional setup when enableCallHistory class method is used after mockAgent instantiation
      this[kMockAgentRegisterCallHistory]()

      // add call history log on every call (intercepted or not)
      this[kMockAgentMockCallHistoryInstance][kMockCallHistoryAddLog](opts)
    }
  }

  [kMockAgentSet] (origin, dispatcher) {
    this[kClients].set(origin, { count: 0, dispatcher })
  }

  [kFactory] (origin) {
    const mockOptions = Object.assign({ agent: this }, this[kOptions])
    return this[kOptions] && this[kOptions].connections === 1
      ? new MockClient(origin, mockOptions)
      : new MockPool(origin, mockOptions)
  }

  [kMockAgentGet] (origin) {
    // First check if we can immediately find it
    const result = this[kClients].get(origin)
    if (result?.dispatcher) {
      return result.dispatcher
    }

    // If the origin is not a string create a dummy parent pool and return to user
    if (typeof origin !== 'string') {
      const dispatcher = this[kFactory]('http://localhost:9999')
      this[kMockAgentSet](origin, dispatcher)
      return dispatcher
    }

    // If we match, create a pool and assign the same dispatches
    for (const [keyMatcher, result] of Array.from(this[kClients])) {
      if (result && typeof keyMatcher !== 'string' && matchValue(keyMatcher, origin)) {
        const dispatcher = this[kFactory](origin)
        this[kMockAgentSet](origin, dispatcher)
        dispatcher[kDispatches] = result.dispatcher[kDispatches]
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
      .flatMap(([origin, result]) => result.dispatcher[kDispatches].map(dispatch => ({ ...dispatch, origin })))
      .filter(({ pending }) => pending)
  }

  assertNoPendingInterceptors ({ pendingInterceptorsFormatter = new PendingInterceptorsFormatter() } = {}) {
    const pending = this.pendingInterceptors()

    if (pending.length === 0) {
      return
    }

    throw new UndiciError(
      pending.length === 1
        ? `1 interceptor is pending:\n\n${pendingInterceptorsFormatter.format(pending)}`.trim()
        : `${pending.length} interceptors are pending:\n\n${pendingInterceptorsFormatter.format(pending)}`.trim()
    )
  }
}

module.exports = MockAgent
