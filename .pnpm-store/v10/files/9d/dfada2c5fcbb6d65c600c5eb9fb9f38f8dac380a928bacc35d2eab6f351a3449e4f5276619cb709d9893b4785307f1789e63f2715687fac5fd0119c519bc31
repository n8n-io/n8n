'use strict'

class MSSQLError extends Error {
  /**
   * Creates a new ConnectionError.
   *
   * @param {String} message Error message.
   * @param {String} [code] Error code.
   */

  constructor (message, code) {
    if (message instanceof Error) {
      super(message.message)
      this.code = message.code || code

      Error.captureStackTrace(this, this.constructor)
      Object.defineProperty(this, 'originalError', { enumerable: true, value: message })
    } else {
      super(message)
      this.code = code
    }

    this.name = 'MSSQLError'
  }
}

module.exports = MSSQLError
