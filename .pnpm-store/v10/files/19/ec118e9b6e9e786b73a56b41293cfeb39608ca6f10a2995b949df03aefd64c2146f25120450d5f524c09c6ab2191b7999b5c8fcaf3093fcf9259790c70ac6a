'use strict'

const ExtendableError = require('es6-error')

const constants = require('./constants')

class UnwrapError extends ExtendableError {
  constructor (thenable) {
    super('Could not unwrap asynchronous thenable')
    this.thenable = thenable
  }
}

// Logic is derived from the Promise Resolution Procedure, as described in the
// Promises/A+ specification: https://promisesaplus.com/#point-45
//
// Note that there is no cycle detection.
function unwrapSync (x) {
  if (!x || typeof x !== 'object' && typeof x !== 'function') {
    return x
  }

  const then = x.then
  if (typeof then !== 'function') return x

  let state = constants.PENDING
  let value
  const unwrapValue = y => {
    if (state === constants.PENDING) {
      state = constants.RESOLVED
      value = y
    }
  }
  const unwrapReason = r => {
    if (state === constants.PENDING) {
      state = constants.REJECTED
      value = r
    }
  }
  then.call(x, unwrapValue, unwrapReason)

  if (state === constants.PENDING) {
    state = constants.ASYNC
    throw new UnwrapError(x)
  }

  if (state === constants.RESOLVED) {
    return unwrapSync(value)
  }

  // state === REJECTED
  throw value
}
module.exports = unwrapSync
