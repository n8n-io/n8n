'use strict'

const EE = require('events').EventEmitter
const { isMainThread } = require('./worker_threads')

const initWorkers = require('./manager')
const validateOpts = require('./validate')
const noop = require('./noop')
const runTracker = require('./runTracker')
const track = require('./progressTracker')

function init (opts, cb) {
  const cbPassedIn = (typeof cb === 'function')
  if (!cbPassedIn && !opts.forever) {
    if (opts.warmup) {
      return runWithWarmup(opts)
    } else {
      return run(opts)
    }
  } else {
    return _init(opts, null, cb)
  }
}

function run (opts) {
  const tracker = new EE()
  const promise = new Promise((resolve, reject) => {
    _init(opts, tracker, (err, results) => {
      if (err) return reject(err)
      resolve(results)
    })
  })
  tracker.then = promise.then.bind(promise)
  tracker.catch = promise.catch.bind(promise)

  return tracker
}

function runWithWarmup (opts) {
  const warmupOpts = {
    ...opts,
    ...opts.warmup,
    warmupRunning: true,
    renderResultsTable: false
  }
  const mainTracker = new EE()
  const warmUpTracker = new EE()
  const promise = new Promise((resolve, reject) => {
    _init(warmupOpts, warmUpTracker, (err, warmupResults) => {
      if (err) return reject(err)
      _init(opts, mainTracker, (err, results) => {
        if (err) return reject(err)
        results.warmup = warmupResults
        resolve(results)
      })
    })
  })
  mainTracker.then = promise.then.bind(promise)
  mainTracker.catch = promise.catch.bind(promise)
  return mainTracker
}

function _init (opts, tracker, cb) {
  const cbPassedIn = (typeof cb === 'function')
  cb = cb || noop

  tracker = tracker || new EE()

  opts = validateOpts(opts, cbPassedIn)

  function _cb (err, result) {
    if (err) {
      return cbPassedIn ? cb(err) : setImmediate(() => tracker.emit('error', err))
    }

    tracker.emit('done', result)
    cb(null, result)

    if (!err && opts.json) {
      console.log(JSON.stringify(result))
    }
  }

  if (opts instanceof Error) {
    _cb(opts)
    return tracker
  }

  tracker.opts = opts

  if (opts.workers && isMainThread) {
    initWorkers(opts, tracker, _cb)
  } else {
    runTracker(opts, tracker, _cb)
  }

  // if not running via command-line and
  // not rendering json, or if std isn't a tty, track progress
  if (opts[Symbol.for('internal')] && (!opts.json || !process.stdout.isTTY)) track(tracker, opts)

  return tracker
}

module.exports = init
