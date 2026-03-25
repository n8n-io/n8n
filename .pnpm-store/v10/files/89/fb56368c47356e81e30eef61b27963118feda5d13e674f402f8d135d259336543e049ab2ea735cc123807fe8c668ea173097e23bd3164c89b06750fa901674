'use strict'

const constants = require('./constants')
const unwrapSync = require('./unwrapSync')

// Behaves like a Promise, though the then() and catch() methods are unbound and
// must be called with the instance as their thisArg.
//
// The executor must either return a value or throw a rejection reason. It is
// not provided resolver or rejecter methods. The executor may return another
// thenable.
class Thenable {
  constructor (executor) {
    try {
      this.result = unwrapSync(executor())
      this.state = constants.RESOLVED
    } catch (err) {
      this.result = err
      this.state = constants.REJECTED
    }
  }

  then (onFulfilled, onRejected) {
    if (this.state === constants.RESOLVED && typeof onFulfilled === 'function') {
      return new Thenable(() => onFulfilled(this.result))
    }

    if (this.state === constants.REJECTED && typeof onRejected === 'function') {
      return new Thenable(() => onRejected(this.result))
    }

    return this
  }

  catch (onRejected) {
    return this.then(null, onRejected)
  }
}
module.exports = Thenable
