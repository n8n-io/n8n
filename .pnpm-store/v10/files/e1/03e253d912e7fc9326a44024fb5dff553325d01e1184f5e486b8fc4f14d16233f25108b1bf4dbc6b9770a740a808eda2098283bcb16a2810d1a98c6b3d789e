'use strict'

const defaultOptions = require('./defaultOptions')
const timestring = require('timestring')
const { checkURL } = require('./url')
const multipart = require('./multipart')
const { parseHAR } = require('./parseHAR')
const { hasWorkerSupport } = require('./util')

const isValidFn = (opt) => (!opt || typeof opt === 'function' || typeof opt === 'string')

const lessThanOneError = (label) => new Error(`${label} can not be less than 1`)
const greaterThanZeroError = (label) => new Error(`${label} must be greater than 0`)
const minIfPresent = (val, min) => val !== null && val < min

function safeRequire (path) {
  if (typeof path === 'string') {
    try {
      return require(path)
    } catch (err) {}
  }

  return path
}

function defaultOpts (opts) {
  const setupClient = opts.workers ? opts.setupClient : safeRequire(opts.setupClient)
  const verifyBody = opts.workers ? opts.verifyBody : safeRequire(opts.verifyBody)

  const requests = opts.requests
    ? opts.requests.map((r) => {
      const setupRequest = opts.workers ? r.setupRequest : safeRequire(r.setupRequest)
      const onResponse = opts.workers ? r.onResponse : safeRequire(r.onResponse)

      return {
        ...r,
        ...(setupRequest ? { setupRequest } : undefined),
        ...(onResponse ? { onResponse } : undefined)
      }
    })
    : undefined

  return {
    ...defaultOptions,
    ...opts,
    ...(setupClient ? { setupClient } : undefined),
    ...(verifyBody ? { verifyBody } : undefined),
    ...(requests ? { requests } : undefined)
  }
}

module.exports = function validateOpts (opts, cbPassedIn) {
  if (opts.workers && !hasWorkerSupport) return new Error('Please use node >= 11.7.0 for workers support')
  // these need to be validated before defaulting
  if (minIfPresent(opts.bailout, 1)) return lessThanOneError('bailout threshold')
  if (minIfPresent(opts.connectionRate, 1)) return lessThanOneError('connectionRate')
  if (minIfPresent(opts.overallRate, 1)) return lessThanOneError('bailout overallRate')
  if (minIfPresent(opts.amount, 1)) return lessThanOneError('amount')
  if (minIfPresent(opts.maxConnectionRequests, 1)) return lessThanOneError('maxConnectionRequests')
  if (minIfPresent(opts.maxOverallRequests, 1)) return lessThanOneError('maxOverallRequests')

  if (opts.form) {
    opts.method = opts.method || 'POST'
  }

  // fill in defaults after
  opts = defaultOpts(opts)

  if (opts.json === true) {
    opts.renderProgressBar = opts.renderResultsTable = opts.renderLatencyTable = false
  }

  if (opts.requests) {
    if (opts.requests.some(r => !isValidFn(r.setupRequest))) {
      return new Error('Invalid option setupRequest, please provide a function (or file path when in workers mode)')
    }

    if (opts.requests.some(r => !isValidFn(r.onResponse))) {
      return new Error('Invalid option onResponse, please provide a function (or file path when in workers mode)')
    }
  }

  if (!isValidFn(opts.setupClient)) {
    return new Error('Invalid option setupClient, please provide a function (or file path when in workers mode)')
  }

  if (!isValidFn(opts.verifyBody)) {
    return new Error('Invalid option verifyBody, please provide a function (or file path when in workers mode)')
  }

  if (!checkURL(opts.url) && !opts.socketPath) {
    return new Error('url or socketPath option required')
  }

  if (typeof opts.duration === 'string') {
    if (/[a-zA-Z]/.exec(opts.duration)) {
      try {
        opts.duration = timestring(opts.duration)
      } catch (error) {
        return error
      }
    } else {
      opts.duration = Number(opts.duration.trim())
    }
  }

  if (typeof opts.duration !== 'number') {
    return new Error('duration entered was in an invalid format')
  }

  if (opts.duration < 0) {
    return new Error('duration can not be less than 0')
  }

  opts.sampleInt = parseFloat(opts.sampleInt)

  if (isNaN(opts.sampleInt)) {
    return new Error('sample interval entered was in an invalid format')
  }

  if (opts.sampleInt < 0) {
    return new Error('sample interval can not be less than 0')
  }

  if (opts.expectBody && opts.requests !== defaultOptions.requests) {
    return new Error('expectBody cannot be used in conjunction with requests')
  }

  if (opts.form) {
    try {
      // Parse multipart upfront to make sure there's no errors
      const data = multipart(opts.form)
      opts.form = opts.workers ? opts.form : data // but use parsed data only if not in workers mode
    } catch (error) {
      return error
    }
  }

  opts.harRequests = new Map()
  if (opts.har) {
    try {
      opts.harRequests = parseHAR(opts.har)
    } catch (error) {
      return error
    }
  }

  if (opts.connections < 1) return lessThanOneError('connections')
  if (opts.pipelining < 1) return lessThanOneError('pipelining factor')
  if (opts.timeout < 1) return greaterThanZeroError('timeout')

  if (opts.ignoreCoordinatedOmission && !opts.connectionRate && !opts.overallRate) {
    return new Error('ignoreCoordinatedOmission makes no sense without connectionRate or overallRate')
  }

  if (opts.forever && cbPassedIn) {
    return new Error('should not use the callback parameter when the `forever` option is set to true. Use the `done` event on this event emitter')
  }

  if (opts.forever && opts.workers) {
    return new Error('Using `forever` option isn\'t currently supported with workers')
  }

  return opts
}
