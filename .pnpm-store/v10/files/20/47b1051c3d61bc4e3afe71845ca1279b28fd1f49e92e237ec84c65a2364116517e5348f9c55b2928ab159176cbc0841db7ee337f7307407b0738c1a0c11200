'use strict'

const MSSQLError = require('./mssql-error')

/**
 * Class TransactionError.
 */

class TransactionError extends MSSQLError {
  /**
   * Creates a new TransactionError.
   *
   * @param {String} message Error message.
   * @param {String} [code] Error code.
   */

  constructor (message, code) {
    super(message, code)

    this.name = 'TransactionError'
  }
}

module.exports = TransactionError
