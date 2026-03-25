'use strict'
class FetchError extends Error {
  constructor (message, type, systemError) {
    super(message)
    this.code = 'FETCH_ERROR'

    // pick up code, expected, path, ...
    if (systemError)
      Object.assign(this, systemError)

    this.errno = this.code

    // override anything the system error might've clobbered
    this.type = this.code === 'EBADSIZE' && this.found > this.expect
      ? 'max-size' : type
    this.message = message
    Error.captureStackTrace(this, this.constructor)
  }

  get name () {
    return 'FetchError'
  }

  // don't allow name to be overwritten
  set name (n) {}

  get [Symbol.toStringTag] () {
    return 'FetchError'
  }
}
module.exports = FetchError
