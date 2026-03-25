'use strict'

const MSSQLError = require('./mssql-error')

/**
 * Class RequestError.
 *
 * @property {String} number Error number.
 * @property {Number} lineNumber Line number.
 * @property {String} state Error state.
 * @property {String} class Error class.
 * @property {String} serverName Server name.
 * @property {String} procName Procedure name.
 */

class RequestError extends MSSQLError {
  /**
   * Creates a new RequestError.
   *
   * @param {String} message Error message.
   * @param {String} [code] Error code.
   */

  constructor (message, code) {
    super(message, code)
    if (message instanceof Error) {
      if (message.info) {
        this.number = message.info.number || message.code // err.code is returned by msnodesql driver
        this.lineNumber = message.info.lineNumber
        this.state = message.info.state || message.sqlstate // err.sqlstate is returned by msnodesql driver
        this.class = message.info.class
        this.serverName = message.info.serverName
        this.procName = message.info.procName
      } else {
        // Use err attributes returned by msnodesql driver
        this.number = message.code
        this.lineNumber = message.lineNumber
        this.state = message.sqlstate
        this.class = message.severity
        this.serverName = message.serverName
        this.procName = message.procName
      }
    }

    this.name = 'RequestError'
    const parsedMessage = (/^\[Microsoft\]\[SQL Server Native Client 11\.0\](?:\[SQL Server\])?([\s\S]*)$/).exec(this.message)
    if (parsedMessage) {
      this.message = parsedMessage[1]
    }
  }
}

module.exports = RequestError
