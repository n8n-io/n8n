'use strict'

const MSSQLError = require('./mssql-error')

/**
 * Class PreparedStatementError.
 */

class PreparedStatementError extends MSSQLError {
  /**
   * Creates a new PreparedStatementError.
   *
   * @param {String} message Error message.
   * @param {String} [code] Error code.
   */

  constructor (message, code) {
    super(message, code)

    this.name = 'PreparedStatementError'
  }
}

module.exports = PreparedStatementError
