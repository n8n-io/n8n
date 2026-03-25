'use strict'

const { MockNotMatchedError } = require('./mock-errors')
const {
  kDispatches,
  kMockAgent,
  kOriginalDispatch,
  kOrigin,
  kGetNetConnect
} = require('./mock-symbols')
const { serializePathWithQuery } = require('../core/util')
const { STATUS_CODES } = require('node:http')
const {
  types: {
    isPromise
  }
} = require('node:util')
const { InvalidArgumentError } = require('../core/errors')

function matchValue (match, value) {
  if (typeof match === 'string') {
    return match === value
  }
  if (match instanceof RegExp) {
    return match.test(value)
  }
  if (typeof match === 'function') {
    return match(value) === true
  }
  return false
}

function lowerCaseEntries (headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([headerName, headerValue]) => {
      return [headerName.toLocaleLowerCase(), headerValue]
    })
  )
}

/**
 * @param {import('../../index').Headers|string[]|Record<string, string>} headers
 * @param {string} key
 */
function getHeaderByName (headers, key) {
  if (Array.isArray(headers)) {
    for (let i = 0; i < headers.length; i += 2) {
      if (headers[i].toLocaleLowerCase() === key.toLocaleLowerCase()) {
        return headers[i + 1]
      }
    }

    return undefined
  } else if (typeof headers.get === 'function') {
    return headers.get(key)
  } else {
    return lowerCaseEntries(headers)[key.toLocaleLowerCase()]
  }
}

/** @param {string[]} headers */
function buildHeadersFromArray (headers) { // fetch HeadersList
  const clone = headers.slice()
  const entries = []
  for (let index = 0; index < clone.length; index += 2) {
    entries.push([clone[index], clone[index + 1]])
  }
  return Object.fromEntries(entries)
}

function matchHeaders (mockDispatch, headers) {
  if (typeof mockDispatch.headers === 'function') {
    if (Array.isArray(headers)) { // fetch HeadersList
      headers = buildHeadersFromArray(headers)
    }
    return mockDispatch.headers(headers ? lowerCaseEntries(headers) : {})
  }
  if (typeof mockDispatch.headers === 'undefined') {
    return true
  }
  if (typeof headers !== 'object' || typeof mockDispatch.headers !== 'object') {
    return false
  }

  for (const [matchHeaderName, matchHeaderValue] of Object.entries(mockDispatch.headers)) {
    const headerValue = getHeaderByName(headers, matchHeaderName)

    if (!matchValue(matchHeaderValue, headerValue)) {
      return false
    }
  }
  return true
}

function normalizeSearchParams (query) {
  if (typeof query !== 'string') {
    return query
  }

  const originalQp = new URLSearchParams(query)
  const normalizedQp = new URLSearchParams()

  for (let [key, value] of originalQp.entries()) {
    key = key.replace('[]', '')

    const valueRepresentsString = /^(['"]).*\1$/.test(value)
    if (valueRepresentsString) {
      normalizedQp.append(key, value)
      continue
    }

    if (value.includes(',')) {
      const values = value.split(',')
      for (const v of values) {
        normalizedQp.append(key, v)
      }
      continue
    }

    normalizedQp.append(key, value)
  }

  return normalizedQp
}

function safeUrl (path) {
  if (typeof path !== 'string') {
    return path
  }
  const pathSegments = path.split('?', 3)
  if (pathSegments.length !== 2) {
    return path
  }

  const qp = new URLSearchParams(pathSegments.pop())
  qp.sort()
  return [...pathSegments, qp.toString()].join('?')
}

function matchKey (mockDispatch, { path, method, body, headers }) {
  const pathMatch = matchValue(mockDispatch.path, path)
  const methodMatch = matchValue(mockDispatch.method, method)
  const bodyMatch = typeof mockDispatch.body !== 'undefined' ? matchValue(mockDispatch.body, body) : true
  const headersMatch = matchHeaders(mockDispatch, headers)
  return pathMatch && methodMatch && bodyMatch && headersMatch
}

function getResponseData (data) {
  if (Buffer.isBuffer(data)) {
    return data
  } else if (data instanceof Uint8Array) {
    return data
  } else if (data instanceof ArrayBuffer) {
    return data
  } else if (typeof data === 'object') {
    return JSON.stringify(data)
  } else if (data) {
    return data.toString()
  } else {
    return ''
  }
}

function getMockDispatch (mockDispatches, key) {
  const basePath = key.query ? serializePathWithQuery(key.path, key.query) : key.path
  const resolvedPath = typeof basePath === 'string' ? safeUrl(basePath) : basePath

  const resolvedPathWithoutTrailingSlash = removeTrailingSlash(resolvedPath)

  // Match path
  let matchedMockDispatches = mockDispatches
    .filter(({ consumed }) => !consumed)
    .filter(({ path, ignoreTrailingSlash }) => {
      return ignoreTrailingSlash
        ? matchValue(removeTrailingSlash(safeUrl(path)), resolvedPathWithoutTrailingSlash)
        : matchValue(safeUrl(path), resolvedPath)
    })
  if (matchedMockDispatches.length === 0) {
    throw new MockNotMatchedError(`Mock dispatch not matched for path '${resolvedPath}'`)
  }

  // Match method
  matchedMockDispatches = matchedMockDispatches.filter(({ method }) => matchValue(method, key.method))
  if (matchedMockDispatches.length === 0) {
    throw new MockNotMatchedError(`Mock dispatch not matched for method '${key.method}' on path '${resolvedPath}'`)
  }

  // Match body
  matchedMockDispatches = matchedMockDispatches.filter(({ body }) => typeof body !== 'undefined' ? matchValue(body, key.body) : true)
  if (matchedMockDispatches.length === 0) {
    throw new MockNotMatchedError(`Mock dispatch not matched for body '${key.body}' on path '${resolvedPath}'`)
  }

  // Match headers
  matchedMockDispatches = matchedMockDispatches.filter((mockDispatch) => matchHeaders(mockDispatch, key.headers))
  if (matchedMockDispatches.length === 0) {
    const headers = typeof key.headers === 'object' ? JSON.stringify(key.headers) : key.headers
    throw new MockNotMatchedError(`Mock dispatch not matched for headers '${headers}' on path '${resolvedPath}'`)
  }

  return matchedMockDispatches[0]
}

function addMockDispatch (mockDispatches, key, data, opts) {
  const baseData = { timesInvoked: 0, times: 1, persist: false, consumed: false, ...opts }
  const replyData = typeof data === 'function' ? { callback: data } : { ...data }
  const newMockDispatch = { ...baseData, ...key, pending: true, data: { error: null, ...replyData } }
  mockDispatches.push(newMockDispatch)
  return newMockDispatch
}

function deleteMockDispatch (mockDispatches, key) {
  const index = mockDispatches.findIndex(dispatch => {
    if (!dispatch.consumed) {
      return false
    }
    return matchKey(dispatch, key)
  })
  if (index !== -1) {
    mockDispatches.splice(index, 1)
  }
}

/**
 * @param {string} path Path to remove trailing slash from
 */
function removeTrailingSlash (path) {
  while (path.endsWith('/')) {
    path = path.slice(0, -1)
  }

  if (path.length === 0) {
    path = '/'
  }

  return path
}

function buildKey (opts) {
  const { path, method, body, headers, query } = opts

  return {
    path,
    method,
    body,
    headers,
    query
  }
}

function generateKeyValues (data) {
  const keys = Object.keys(data)
  const result = []
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const value = data[key]
    const name = Buffer.from(`${key}`)
    if (Array.isArray(value)) {
      for (let j = 0; j < value.length; ++j) {
        result.push(name, Buffer.from(`${value[j]}`))
      }
    } else {
      result.push(name, Buffer.from(`${value}`))
    }
  }
  return result
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 * @param {number} statusCode
 */
function getStatusText (statusCode) {
  return STATUS_CODES[statusCode] || 'unknown'
}

async function getResponse (body) {
  const buffers = []
  for await (const data of body) {
    buffers.push(data)
  }
  return Buffer.concat(buffers).toString('utf8')
}

/**
 * Mock dispatch function used to simulate undici dispatches
 */
function mockDispatch (opts, handler) {
  // Get mock dispatch from built key
  const key = buildKey(opts)
  const mockDispatch = getMockDispatch(this[kDispatches], key)

  mockDispatch.timesInvoked++

  // Here's where we resolve a callback if a callback is present for the dispatch data.
  if (mockDispatch.data.callback) {
    mockDispatch.data = { ...mockDispatch.data, ...mockDispatch.data.callback(opts) }
  }

  // Parse mockDispatch data
  const { data: { statusCode, data, headers, trailers, error }, delay, persist } = mockDispatch
  const { timesInvoked, times } = mockDispatch

  // If it's used up and not persistent, mark as consumed
  mockDispatch.consumed = !persist && timesInvoked >= times
  mockDispatch.pending = timesInvoked < times

  // If specified, trigger dispatch error
  if (error !== null) {
    deleteMockDispatch(this[kDispatches], key)
    handler.onError(error)
    return true
  }

  // Handle the request with a delay if necessary
  if (typeof delay === 'number' && delay > 0) {
    setTimeout(() => {
      handleReply(this[kDispatches])
    }, delay)
  } else {
    handleReply(this[kDispatches])
  }

  function handleReply (mockDispatches, _data = data) {
    // fetch's HeadersList is a 1D string array
    const optsHeaders = Array.isArray(opts.headers)
      ? buildHeadersFromArray(opts.headers)
      : opts.headers
    const body = typeof _data === 'function'
      ? _data({ ...opts, headers: optsHeaders })
      : _data

    // util.types.isPromise is likely needed for jest.
    if (isPromise(body)) {
      // If handleReply is asynchronous, throwing an error
      // in the callback will reject the promise, rather than
      // synchronously throw the error, which breaks some tests.
      // Rather, we wait for the callback to resolve if it is a
      // promise, and then re-run handleReply with the new body.
      return body.then((newData) => handleReply(mockDispatches, newData))
    }

    const responseData = getResponseData(body)
    const responseHeaders = generateKeyValues(headers)
    const responseTrailers = generateKeyValues(trailers)

    handler.onConnect?.(err => handler.onError(err), null)
    handler.onHeaders?.(statusCode, responseHeaders, resume, getStatusText(statusCode))
    handler.onData?.(Buffer.from(responseData))
    handler.onComplete?.(responseTrailers)
    deleteMockDispatch(mockDispatches, key)
  }

  function resume () {}

  return true
}

function buildMockDispatch () {
  const agent = this[kMockAgent]
  const origin = this[kOrigin]
  const originalDispatch = this[kOriginalDispatch]

  return function dispatch (opts, handler) {
    if (agent.isMockActive) {
      try {
        mockDispatch.call(this, opts, handler)
      } catch (error) {
        if (error.code === 'UND_MOCK_ERR_MOCK_NOT_MATCHED') {
          const netConnect = agent[kGetNetConnect]()
          if (netConnect === false) {
            throw new MockNotMatchedError(`${error.message}: subsequent request to origin ${origin} was not allowed (net.connect disabled)`)
          }
          if (checkNetConnect(netConnect, origin)) {
            originalDispatch.call(this, opts, handler)
          } else {
            throw new MockNotMatchedError(`${error.message}: subsequent request to origin ${origin} was not allowed (net.connect is not enabled for this origin)`)
          }
        } else {
          throw error
        }
      }
    } else {
      originalDispatch.call(this, opts, handler)
    }
  }
}

function checkNetConnect (netConnect, origin) {
  const url = new URL(origin)
  if (netConnect === true) {
    return true
  } else if (Array.isArray(netConnect) && netConnect.some((matcher) => matchValue(matcher, url.host))) {
    return true
  }
  return false
}

function buildAndValidateMockOptions (opts) {
  const { agent, ...mockOptions } = opts

  if ('enableCallHistory' in mockOptions && typeof mockOptions.enableCallHistory !== 'boolean') {
    throw new InvalidArgumentError('options.enableCallHistory must to be a boolean')
  }

  if ('acceptNonStandardSearchParameters' in mockOptions && typeof mockOptions.acceptNonStandardSearchParameters !== 'boolean') {
    throw new InvalidArgumentError('options.acceptNonStandardSearchParameters must to be a boolean')
  }

  if ('ignoreTrailingSlash' in mockOptions && typeof mockOptions.ignoreTrailingSlash !== 'boolean') {
    throw new InvalidArgumentError('options.ignoreTrailingSlash must to be a boolean')
  }

  return mockOptions
}

module.exports = {
  getResponseData,
  getMockDispatch,
  addMockDispatch,
  deleteMockDispatch,
  buildKey,
  generateKeyValues,
  matchValue,
  getResponse,
  getStatusText,
  mockDispatch,
  buildMockDispatch,
  checkNetConnect,
  buildAndValidateMockOptions,
  getHeaderByName,
  buildHeadersFromArray,
  normalizeSearchParams
}
