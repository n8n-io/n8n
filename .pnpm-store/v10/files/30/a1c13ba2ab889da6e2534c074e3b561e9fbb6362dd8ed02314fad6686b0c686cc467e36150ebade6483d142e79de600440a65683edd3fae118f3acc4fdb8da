'use strict'

class Async {
  run (executors) {
    const args = Array.from(arguments).slice(1)
    return new Promise(resolve => resolve(executors.async.apply(null, args)))
  }

  all (arr) {
    return Promise.all(arr)
  }

  returns (value) {
    return Promise.resolve(value)
  }

  throws (reason) {
    return Promise.reject(reason)
  }
}
module.exports = Async
