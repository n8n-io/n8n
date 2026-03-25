'use strict'

const Thenable = require('./Thenable')
const unwrapSync = require('./unwrapSync')

class Sync {
  run (executors) {
    const args = Array.from(arguments).slice(1)
    return new Thenable(() => executors.sync.apply(null, args))
  }

  all (arr) {
    return new Thenable(() => arr.map(value => unwrapSync(value)))
  }

  returns (value) {
    return new Thenable(() => value)
  }

  throws (reason) {
    return new Thenable(() => { throw reason })
  }
}
module.exports = Sync
