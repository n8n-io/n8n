'use strict'

const path = require('path')
const EE = require('events').EventEmitter
const aggregateResult = require('./aggregateResult')
const { getHistograms } = require('./histUtil')
const { Worker } = require('./worker_threads')

function initWorkers (opts, tracker, cb) {
  tracker = tracker || new EE()

  const workers = []
  const results = []
  const numWorkers = +opts.workers
  const histograms = getHistograms()
  const histData = {
    requests: [],
    throughput: []
  }
  let restart = true

  function reset () {
    workers.length = 0
    results.length = 0
    histograms.requests.reset()
    histograms.throughput.reset()
    histData.requests.length = 0
    histData.throughput.length = 0
  }

  function startAll () {
    for (const w of workers) {
      w.postMessage({ cmd: 'START' })
    }

    setImmediate(() => { tracker.emit('start') })
  }

  function handleFinish () {
    const result = aggregateResult(results, opts, histograms)
    cb(null, result)
    reset()

    if (opts.forever && restart) {
      setImmediate(() => {
        init()
        startAll()
      })
    }
  }

  function stopAll () {
    for (const w of workers) {
      w.postMessage({ cmd: 'STOP' })
    }
    reset()
  }

  const workerOpts = {
    ...opts,
    ...(opts.amount ? { amount: Math.max(Math.floor(opts.amount / numWorkers), 1) } : undefined),
    ...(opts.connections ? { connections: Math.max(Math.floor(opts.connections / numWorkers), 1) } : undefined)
  }
  workerOpts.a = workerOpts.amount
  workerOpts.c = workerOpts.connections

  function init () {
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(path.resolve(__dirname, './worker.js'), { workerData: { opts: workerOpts } })

      worker.on('message', (msg) => {
        const { cmd, data, error } = msg

        if (cmd === 'RESULT') {
          results.push(data)

          if (results.length === workers.length) {
            handleFinish()
          }
        } else if (cmd === 'UPDATE_HIST') {
          const { name, value } = data
          histData[name].push(value)

          if (histData[name].length === workers.length) {
            const total = histData[name].reduce((acc, v) => acc + v, 0)
            histData[name].length = 0
            histograms[name].recordValue(total)
          }
        } else if (cmd === 'RESET_HIST') {
          const { name } = data
          histograms[name].reset()
        } else if (cmd === 'ERROR') {
          tracker.emit('error', error)
        }
      })

      worker.on('error', (err) => {
        console.log('Worker error:', err)
        stopAll()
        cb(err)
      })

      workers.push(worker)
    }
  }

  init()
  startAll()

  tracker.stop = () => {
    restart = false
    stopAll()
  }

  return tracker
}

module.exports = initWorkers
