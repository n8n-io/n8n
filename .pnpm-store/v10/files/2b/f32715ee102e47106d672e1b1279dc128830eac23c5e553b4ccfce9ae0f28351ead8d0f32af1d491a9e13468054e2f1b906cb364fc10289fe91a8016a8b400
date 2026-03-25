'use strict'

const URL = require('url')
const reInterval = require('reinterval')
const EE = require('events').EventEmitter
const Client = require('./httpClient')
const { isMainThread } = require('./worker_threads')
const { ofURL } = require('./url')
const aggregateResult = require('./aggregateResult')
const { getHistograms, encodeHist } = require('./histUtil')

const defaults = {
  harRequests: new Map()
}

function run (opts, tracker, cb) {
  opts = Object.assign({}, defaults, opts)
  tracker = tracker || new EE()

  const histograms = getHistograms(opts.histograms)
  const { latencies, requests, throughput } = histograms

  const statusCodes = [
    0, // 1xx
    0, // 2xx
    0, // 3xx
    0, // 4xx
    0 // 5xx
  ]

  const statusCodeStats = {}

  if (opts.overallRate && (opts.overallRate < opts.connections)) opts.connections = opts.overallRate

  let counter = 0
  let bytes = 0
  let errors = 0
  let timeouts = 0
  let mismatches = 0
  let totalBytes = 0
  let totalRequests = 0
  let totalCompletedRequests = 0
  let samples = 0
  let resets = 0
  const amount = opts.amount
  let stop = false
  let restart = true
  let numRunning = opts.connections
  let startTime = Date.now()
  const includeErrorStats = !opts.excludeErrorStats

  opts.url = ofURL(opts.url).map((url) => {
    if (url.indexOf('http') !== 0) return 'http://' + url
    return url
  })

  const urls = ofURL(opts.url, true).map(url => {
    if (url.indexOf('http') !== 0) url = 'http://' + url
    url = URL.parse(url) // eslint-disable-line n/no-deprecated-api

    // copy over fields so that the client
    // performs the right HTTP requests
    url.pipelining = opts.pipelining
    url.method = opts.method
    url.body = opts.form ? opts.form.getBuffer() : opts.body
    url.headers = opts.form ? Object.assign({}, opts.headers, opts.form.getHeaders()) : opts.headers
    url.setupClient = opts.setupClient
    url.verifyBody = opts.verifyBody
    url.timeout = opts.timeout
    url.origin = `${url.protocol}//${url.host}`
    // only keep requests for that origin, or default to requests from options
    url.requests = opts.harRequests.get(url.origin) || opts.requests
    url.reconnectRate = opts.reconnectRate
    url.responseMax = amount || opts.maxConnectionRequests || opts.maxOverallRequests
    url.rate = opts.connectionRate || opts.overallRate
    url.idReplacement = opts.idReplacement
    url.socketPath = opts.socketPath
    url.servername = opts.servername
    url.expectBody = opts.expectBody

    return url
  })

  let stopTimer
  let clients = []
  initialiseClients(clients)

  if (!amount) {
    stopTimer = setTimeout(() => {
      stop = true
    }, opts.duration * 1000)
  }

  const second = reInterval(tickProgressBar, 1000)
  const interval = reInterval(tickInterval, opts.sampleInt)

  // put the start emit in a setImmediate so trackers can be added, etc.
  setImmediate(() => { tracker.emit('start') })

  function tickProgressBar () {
    tracker.emit('tick', { counter, bytes })
  }

  function tickInterval () {
    totalBytes += bytes
    totalCompletedRequests += counter
    samples += 1
    requests.recordValue(counter)
    throughput.recordValue(bytes)
    counter = 0
    bytes = 0

    if (stop) {
      if (stopTimer) clearTimeout(stopTimer)
      tracker.emit('tick', { counter, bytes })
      second.clear()
      interval.clear()
      clients.forEach((client) => client.destroy())
      const result = {
        latencies: encodeHist(latencies),
        requests: encodeHist(requests),
        throughput: encodeHist(throughput),
        totalCompletedRequests,
        totalRequests,
        totalBytes,
        samples,
        errors,
        timeouts,
        mismatches,
        non2xx: statusCodes[0] + statusCodes[2] + statusCodes[3] + statusCodes[4],
        statusCodeStats,
        resets,
        duration: Math.round((Date.now() - startTime) / 10) / 100,
        start: new Date(startTime),
        finish: new Date()
      }

      statusCodes.forEach((code, index) => { result[(index + 1) + 'xx'] = code })

      const resultObj = isMainThread && !opts.skipAggregateResult ? aggregateResult(result, opts, histograms) : result

      if (opts.forever) {
        // we don't call callback when in forever mode, so this is the
        // only place we could notify user when each round finishes
        tracker.emit('done', resultObj)
      } else {
        latencies.destroy()
        requests.destroy()
        throughput.destroy()
        cb(null, resultObj)
      }

      const restartFn = () => {
        stop = false
        stopTimer = setTimeout(() => {
          stop = true
        }, opts.duration * 1000)
        errors = 0
        timeouts = 0
        mismatches = 0
        totalBytes = 0
        totalRequests = 0
        totalCompletedRequests = 0
        resets = 0
        statusCodes.fill(0)
        requests.reset()
        latencies.reset()
        throughput.reset()
        startTime = Date.now()

        // reinitialise clients
        if (opts.overallRate && (opts.overallRate < opts.connections)) opts.connections = opts.overallRate
        clients = []
        initialiseClients(clients)

        interval.reschedule(1000)
        tracker.emit('start')
      }

      // the restart function
      setImmediate(() => {
        if (opts.forever && restart && isMainThread) restartFn()
      })
    }
  }

  function initialiseClients (clients) {
    for (let i = 0; i < opts.connections; i++) {
      const url = urls[i % urls.length]
      if (!amount && !opts.maxConnectionRequests && opts.maxOverallRequests) {
        url.responseMax = distributeNums(opts.maxOverallRequests, i)
      }
      if (amount) {
        url.responseMax = distributeNums(amount, i)
        if (url.responseMax === 0) {
          throw Error('connections cannot be greater than amount')
        }
      }
      if (!opts.connectionRate && opts.overallRate) {
        url.rate = distributeNums(opts.overallRate, i)
      }
      if (opts.initialContext) {
        url.initialContext = opts.initialContext
      }

      if (opts.tlsOptions) {
        url.tlsOptions = opts.tlsOptions
      }

      const client = new Client(url)
      client.on('response', onResponse)
      client.on('connError', onError)
      client.on('mismatch', onExpectMismatch)
      client.on('reset', () => { resets++ })
      client.on('timeout', onTimeout)
      client.on('request', () => { totalRequests++ })
      client.on('done', onDone)
      clients.push(client)

      // we will miss the initial request emits because the client emits request on construction
      totalRequests += url.pipelining < url.rate ? url.rate : url.pipelining
    }

    function distributeNums (x, i) {
      return (Math.floor(x / opts.connections) + (((i + 1) <= (x % opts.connections)) ? 1 : 0))
    }

    function onResponse (statusCode, resBytes, responseTime, rate) {
      tracker.emit('response', this, statusCode, resBytes, responseTime)
      const codeIndex = Math.floor(parseInt(statusCode) / 100) - 1
      statusCodes[codeIndex] += 1

      if (!statusCodeStats[statusCode]) {
        statusCodeStats[statusCode] = { count: 1 }
      } else {
        statusCodeStats[statusCode].count++
      }

      // only recordValue 2xx latencies
      if (codeIndex === 1 || includeErrorStats) {
        if (rate && !opts.ignoreCoordinatedOmission) {
          latencies.recordValueWithExpectedInterval(responseTime, Math.ceil(1 / rate))
        } else {
          latencies.recordValue(responseTime)
        }
      }
      if (codeIndex === 1 || includeErrorStats) bytes += resBytes
      counter++
    }

    function onError (error) {
      for (let i = 0; i < opts.pipelining; i++) tracker.emit('reqError', error)
      errors++
      if (opts.debug) console.error(error)
      if (opts.bailout && errors >= opts.bailout) stop = true
    }

    function onExpectMismatch (bpdyStr) {
      for (let i = 0; i < opts.pipelining; i++) {
        tracker.emit('reqMismatch', bpdyStr)
      }

      mismatches++
      if (opts.bailout && mismatches >= opts.bailout) stop = true
    }

    // treat a timeout as a special type of error
    function onTimeout () {
      const error = new Error('request timed out')
      for (let i = 0; i < opts.pipelining; i++) tracker.emit('reqError', error)
      errors++
      timeouts++
      if (opts.bailout && errors >= opts.bailout) stop = true
    }

    function onDone () {
      if (!--numRunning) stop = true
    }
  }

  tracker.stop = () => {
    stop = true
    restart = false
  }

  return tracker
} // run

module.exports = run
