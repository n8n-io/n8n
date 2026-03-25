'use strict'

const { kMockCallHistoryAddLog } = require('./mock-symbols')
const { InvalidArgumentError } = require('../core/errors')

function handleFilterCallsWithOptions (criteria, options, handler, store) {
  switch (options.operator) {
    case 'OR':
      store.push(...handler(criteria))

      return store
    case 'AND':
      return handler.call({ logs: store }, criteria)
    default:
      // guard -- should never happens because buildAndValidateFilterCallsOptions is called before
      throw new InvalidArgumentError('options.operator must to be a case insensitive string equal to \'OR\' or \'AND\'')
  }
}

function buildAndValidateFilterCallsOptions (options = {}) {
  const finalOptions = {}

  if ('operator' in options) {
    if (typeof options.operator !== 'string' || (options.operator.toUpperCase() !== 'OR' && options.operator.toUpperCase() !== 'AND')) {
      throw new InvalidArgumentError('options.operator must to be a case insensitive string equal to \'OR\' or \'AND\'')
    }

    return {
      ...finalOptions,
      operator: options.operator.toUpperCase()
    }
  }

  return finalOptions
}

function makeFilterCalls (parameterName) {
  return (parameterValue) => {
    if (typeof parameterValue === 'string' || parameterValue == null) {
      return this.logs.filter((log) => {
        return log[parameterName] === parameterValue
      })
    }
    if (parameterValue instanceof RegExp) {
      return this.logs.filter((log) => {
        return parameterValue.test(log[parameterName])
      })
    }

    throw new InvalidArgumentError(`${parameterName} parameter should be one of string, regexp, undefined or null`)
  }
}
function computeUrlWithMaybeSearchParameters (requestInit) {
  // path can contains query url parameters
  // or query can contains query url parameters
  try {
    const url = new URL(requestInit.path, requestInit.origin)

    // requestInit.path contains query url parameters
    // requestInit.query is then undefined
    if (url.search.length !== 0) {
      return url
    }

    // requestInit.query can be populated here
    url.search = new URLSearchParams(requestInit.query).toString()

    return url
  } catch (error) {
    throw new InvalidArgumentError('An error occurred when computing MockCallHistoryLog.url', { cause: error })
  }
}

class MockCallHistoryLog {
  constructor (requestInit = {}) {
    this.body = requestInit.body
    this.headers = requestInit.headers
    this.method = requestInit.method

    const url = computeUrlWithMaybeSearchParameters(requestInit)

    this.fullUrl = url.toString()
    this.origin = url.origin
    this.path = url.pathname
    this.searchParams = Object.fromEntries(url.searchParams)
    this.protocol = url.protocol
    this.host = url.host
    this.port = url.port
    this.hash = url.hash
  }

  toMap () {
    return new Map([
      ['protocol', this.protocol],
      ['host', this.host],
      ['port', this.port],
      ['origin', this.origin],
      ['path', this.path],
      ['hash', this.hash],
      ['searchParams', this.searchParams],
      ['fullUrl', this.fullUrl],
      ['method', this.method],
      ['body', this.body],
      ['headers', this.headers]]
    )
  }

  toString () {
    const options = { betweenKeyValueSeparator: '->', betweenPairSeparator: '|' }
    let result = ''

    this.toMap().forEach((value, key) => {
      if (typeof value === 'string' || value === undefined || value === null) {
        result = `${result}${key}${options.betweenKeyValueSeparator}${value}${options.betweenPairSeparator}`
      }
      if ((typeof value === 'object' && value !== null) || Array.isArray(value)) {
        result = `${result}${key}${options.betweenKeyValueSeparator}${JSON.stringify(value)}${options.betweenPairSeparator}`
      }
      // maybe miss something for non Record / Array headers and searchParams here
    })

    // delete last betweenPairSeparator
    return result.slice(0, -1)
  }
}

class MockCallHistory {
  logs = []

  calls () {
    return this.logs
  }

  firstCall () {
    return this.logs.at(0)
  }

  lastCall () {
    return this.logs.at(-1)
  }

  nthCall (number) {
    if (typeof number !== 'number') {
      throw new InvalidArgumentError('nthCall must be called with a number')
    }
    if (!Number.isInteger(number)) {
      throw new InvalidArgumentError('nthCall must be called with an integer')
    }
    if (Math.sign(number) !== 1) {
      throw new InvalidArgumentError('nthCall must be called with a positive value. use firstCall or lastCall instead')
    }

    // non zero based index. this is more human readable
    return this.logs.at(number - 1)
  }

  filterCalls (criteria, options) {
    // perf
    if (this.logs.length === 0) {
      return this.logs
    }
    if (typeof criteria === 'function') {
      return this.logs.filter(criteria)
    }
    if (criteria instanceof RegExp) {
      return this.logs.filter((log) => {
        return criteria.test(log.toString())
      })
    }
    if (typeof criteria === 'object' && criteria !== null) {
      // no criteria - returning all logs
      if (Object.keys(criteria).length === 0) {
        return this.logs
      }

      const finalOptions = { operator: 'OR', ...buildAndValidateFilterCallsOptions(options) }

      let maybeDuplicatedLogsFiltered = []
      if ('protocol' in criteria) {
        maybeDuplicatedLogsFiltered = handleFilterCallsWithOptions(criteria.protocol, finalOptions, this.filterCallsByProtocol, maybeDuplicatedLogsFiltered)
      }
      if ('host' in criteria) {
        maybeDuplicatedLogsFiltered = handleFilterCallsWithOptions(criteria.host, finalOptions, this.filterCallsByHost, maybeDuplicatedLogsFiltered)
      }
      if ('port' in criteria) {
        maybeDuplicatedLogsFiltered = handleFilterCallsWithOptions(criteria.port, finalOptions, this.filterCallsByPort, maybeDuplicatedLogsFiltered)
      }
      if ('origin' in criteria) {
        maybeDuplicatedLogsFiltered = handleFilterCallsWithOptions(criteria.origin, finalOptions, this.filterCallsByOrigin, maybeDuplicatedLogsFiltered)
      }
      if ('path' in criteria) {
        maybeDuplicatedLogsFiltered = handleFilterCallsWithOptions(criteria.path, finalOptions, this.filterCallsByPath, maybeDuplicatedLogsFiltered)
      }
      if ('hash' in criteria) {
        maybeDuplicatedLogsFiltered = handleFilterCallsWithOptions(criteria.hash, finalOptions, this.filterCallsByHash, maybeDuplicatedLogsFiltered)
      }
      if ('fullUrl' in criteria) {
        maybeDuplicatedLogsFiltered = handleFilterCallsWithOptions(criteria.fullUrl, finalOptions, this.filterCallsByFullUrl, maybeDuplicatedLogsFiltered)
      }
      if ('method' in criteria) {
        maybeDuplicatedLogsFiltered = handleFilterCallsWithOptions(criteria.method, finalOptions, this.filterCallsByMethod, maybeDuplicatedLogsFiltered)
      }

      const uniqLogsFiltered = [...new Set(maybeDuplicatedLogsFiltered)]

      return uniqLogsFiltered
    }

    throw new InvalidArgumentError('criteria parameter should be one of function, regexp, or object')
  }

  filterCallsByProtocol = makeFilterCalls.call(this, 'protocol')

  filterCallsByHost = makeFilterCalls.call(this, 'host')

  filterCallsByPort = makeFilterCalls.call(this, 'port')

  filterCallsByOrigin = makeFilterCalls.call(this, 'origin')

  filterCallsByPath = makeFilterCalls.call(this, 'path')

  filterCallsByHash = makeFilterCalls.call(this, 'hash')

  filterCallsByFullUrl = makeFilterCalls.call(this, 'fullUrl')

  filterCallsByMethod = makeFilterCalls.call(this, 'method')

  clear () {
    this.logs = []
  }

  [kMockCallHistoryAddLog] (requestInit) {
    const log = new MockCallHistoryLog(requestInit)

    this.logs.push(log)

    return log
  }

  * [Symbol.iterator] () {
    for (const log of this.calls()) {
      yield log
    }
  }
}

module.exports.MockCallHistory = MockCallHistory
module.exports.MockCallHistoryLog = MockCallHistoryLog
