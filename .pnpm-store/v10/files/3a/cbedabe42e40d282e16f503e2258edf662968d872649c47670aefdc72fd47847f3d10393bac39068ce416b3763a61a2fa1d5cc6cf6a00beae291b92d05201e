'use strict'

const test = require('tap').test
const initJob = require('../../lib/init')
const helper = require('../helper')

test('should clean up HdrHistogram WASM memory at each run', async (t) => {
  const server = helper.startServer()
  const runTwentyTimes = (resolve, reject, numberOfRuns = 0) => {
    initJob({
      url: 'http://localhost:' + server.address().port,
      connections: 1,
      amount: 1
    }, (result) => {
      // should get error " url or socketPath option required"
      // we can ignore this error, we just want run() to execute
      // and to instantiate new WASM histograms
      if (numberOfRuns < 20) {
        runTwentyTimes(resolve, reject, ++numberOfRuns)
      } else {
        resolve()
      }
    })
  }
  const lotsOfRuns = []
  for (let index = 0; index < 50; index++) {
    lotsOfRuns.push(new Promise(runTwentyTimes))
  }

  await Promise.all(lotsOfRuns)

  // if the process has not crashed, we are good \o/
  t.end()
})
