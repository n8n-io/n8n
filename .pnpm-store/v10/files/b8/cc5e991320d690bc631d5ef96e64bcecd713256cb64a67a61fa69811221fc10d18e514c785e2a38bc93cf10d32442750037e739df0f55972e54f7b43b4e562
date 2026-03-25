'use strict'

let workerThreads = {}

try {
  workerThreads = require('worker_threads')
} catch (err) {
  if (err) {
    // we don't need the error but can't have catch block
    // without err as node 8 doesn't support that
  }

  workerThreads = {
    isMainThread: true
  }
}

module.exports = workerThreads
