'use strict'

const { isMainThread, parentPort, workerData } = require('worker_threads')
const multipart = require('./multipart')
const run = require('./run')

const createHist = (name) => ({
  __custom: true,
  recordValue: v => updateHist(name, v),
  destroy: () => {},
  reset: () => resetHist(name)
})

const updateHist = (name, value) => {
  parentPort.postMessage({
    cmd: 'UPDATE_HIST',
    data: { name, value }
  })
}

const resetHist = (name) => {
  parentPort.postMessage({
    cmd: 'RESET_HIST',
    data: { name }
  })
}

function runTracker (opts, cb) {
  const tracker = run({
    ...opts,
    ...(opts.form ? { form: multipart(opts.form) } : undefined),
    ...(opts.setupClient ? { setupClient: require(opts.setupClient) } : undefined),
    ...(opts.verifyBody ? { verifyBody: require(opts.verifyBody) } : undefined),
    requests: opts.requests
      ? opts.requests.map(r => ({
        ...r,
        ...(r.setupRequest ? { setupRequest: require(r.setupRequest) } : undefined),
        ...(r.onResponse ? { onResponse: require(r.onResponse) } : undefined)
      }))
      : undefined,
    histograms: {
      requests: createHist('requests'),
      throughput: createHist('throughput')
    }
  }, null, cb)

  tracker.on('tick', (data) => {
    parentPort.postMessage({ cmd: 'TICK', data })
  })

  return {
    stop: tracker.stop
  }
}

if (!isMainThread) {
  const { opts } = workerData
  let tracker

  parentPort.on('message', (msg) => {
    const { cmd } = msg

    if (cmd === 'START') {
      tracker = runTracker(opts, (error, data) => {
        parentPort.postMessage({ cmd: error ? 'ERROR' : 'RESULT', error, data })
        parentPort.close()
      })
    } else if (cmd === 'STOP') {
      tracker.stop()
      parentPort.close()
    }
  })
}
