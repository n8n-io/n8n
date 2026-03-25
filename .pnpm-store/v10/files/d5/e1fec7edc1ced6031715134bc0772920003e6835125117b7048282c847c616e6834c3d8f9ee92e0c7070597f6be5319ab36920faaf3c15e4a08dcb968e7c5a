'use strict'
class AbortError extends Error {
  constructor (message) {
    super(message)
    this.code = 'FETCH_ABORTED'
    this.type = 'aborted'
    Error.captureStackTrace(this, this.constructor)
  }

  get name () {
    return 'AbortError'
  }

  // don't allow name to be overridden, but don't throw either
  set name (s) {}
}
module.exports = AbortError
