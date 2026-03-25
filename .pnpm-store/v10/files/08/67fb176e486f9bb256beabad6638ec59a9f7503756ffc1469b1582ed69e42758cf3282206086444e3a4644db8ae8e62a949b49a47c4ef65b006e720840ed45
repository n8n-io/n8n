'use strict'

const debug = require('debug')('mssql:base')
const { EventEmitter } = require('node:events')
const { IDS, objectHasProperty } = require('../utils')
const globalConnection = require('../global-connection')
const { TransactionError, PreparedStatementError } = require('../error')
const shared = require('../shared')
const { TYPES, declare } = require('../datatypes')

/**
 * Class PreparedStatement.
 *
 * IMPORTANT: Rememeber that each prepared statement means one reserved connection from the pool. Don't forget to unprepare a prepared statement!
 *
 * @property {String} statement Prepared SQL statement.
 */

class PreparedStatement extends EventEmitter {
  /**
   * Creates a new Prepared Statement.
   *
   * @param {ConnectionPool|Transaction} [holder]
   */

  constructor (parent) {
    super()

    IDS.add(this, 'PreparedStatement')
    debug('ps(%d): created', IDS.get(this))

    this.parent = parent || globalConnection.pool
    this._handle = 0
    this.prepared = false
    this.parameters = {}
  }

  get config () {
    return this.parent.config
  }

  get connected () {
    return this.parent.connected
  }

  /**
   * Acquire connection from connection pool.
   *
   * @param {Request} request Request.
   * @param {ConnectionPool~acquireCallback} [callback] A callback which is called after connection has established, or an error has occurred. If omited, method returns Promise.
   * @return {PreparedStatement|Promise}
   */

  acquire (request, callback) {
    if (!this._acquiredConnection) {
      setImmediate(callback, new PreparedStatementError('Statement is not prepared. Call prepare() first.', 'ENOTPREPARED'))
      return this
    }

    if (this._activeRequest) {
      setImmediate(callback, new TransactionError("Can't acquire connection for the request. There is another request in progress.", 'EREQINPROG'))
      return this
    }

    this._activeRequest = request
    setImmediate(callback, null, this._acquiredConnection, this._acquiredConfig)
    return this
  }

  /**
   * Release connection back to the pool.
   *
   * @param {Connection} connection Previously acquired connection.
   * @return {PreparedStatement}
   */

  release (connection) {
    if (connection === this._acquiredConnection) {
      this._activeRequest = null
    }

    return this
  }

  /**
   * Add an input parameter to the prepared statement.
   *
   * @param {String} name Name of the input parameter without @ char.
   * @param {*} type SQL data type of input parameter.
   * @return {PreparedStatement}
   */

  input (name, type) {
    if (/--| |\/\*|\*\/|'/.test(name)) {
      throw new PreparedStatementError(`SQL injection warning for param '${name}'`, 'EINJECT')
    }

    if (arguments.length < 2) {
      throw new PreparedStatementError('Invalid number of arguments. 2 arguments expected.', 'EARGS')
    }

    if (type instanceof Function) {
      type = type()
    }

    if (objectHasProperty(this.parameters, name)) {
      throw new PreparedStatementError(`The parameter name ${name} has already been declared. Parameter names must be unique`, 'EDUPEPARAM')
    }

    this.parameters[name] = {
      name,
      type: type.type,
      io: 1,
      length: type.length,
      scale: type.scale,
      precision: type.precision,
      tvpType: type.tvpType
    }

    return this
  }

  /**
   * Replace an input parameter on the request.
   *
   * @param {String} name Name of the input parameter without @ char.
   * @param {*} [type] SQL data type of input parameter. If you omit type, module automaticaly decide which SQL data type should be used based on JS data type.
   * @param {*} value Input parameter value. `undefined` and `NaN` values are automatically converted to `null` values.
   * @return {Request}
   */

  replaceInput (name, type, value) {
    delete this.parameters[name]

    return this.input(name, type, value)
  }

  /**
   * Add an output parameter to the prepared statement.
   *
   * @param {String} name Name of the output parameter without @ char.
   * @param {*} type SQL data type of output parameter.
   * @return {PreparedStatement}
   */

  output (name, type) {
    if (/--| |\/\*|\*\/|'/.test(name)) {
      throw new PreparedStatementError(`SQL injection warning for param '${name}'`, 'EINJECT')
    }

    if (arguments.length < 2) {
      throw new PreparedStatementError('Invalid number of arguments. 2 arguments expected.', 'EARGS')
    }

    if (type instanceof Function) type = type()

    if (objectHasProperty(this.parameters, name)) {
      throw new PreparedStatementError(`The parameter name ${name} has already been declared. Parameter names must be unique`, 'EDUPEPARAM')
    }

    this.parameters[name] = {
      name,
      type: type.type,
      io: 2,
      length: type.length,
      scale: type.scale,
      precision: type.precision
    }

    return this
  }

  /**
   * Replace an output parameter on the request.
   *
   * @param {String} name Name of the output parameter without @ char.
   * @param {*} type SQL data type of output parameter.
   * @return {PreparedStatement}
   */

  replaceOutput (name, type) {
    delete this.parameters[name]

    return this.output(name, type)
  }

  /**
   * Prepare a statement.
   *
   * @param {String} statement SQL statement to prepare.
   * @param {basicCallback} [callback] A callback which is called after preparation has completed, or an error has occurred. If omited, method returns Promise.
   * @return {PreparedStatement|Promise}
   */

  prepare (statement, callback) {
    if (typeof callback === 'function') {
      this._prepare(statement, callback)
      return this
    }

    return new shared.Promise((resolve, reject) => {
      this._prepare(statement, err => {
        if (err) return reject(err)
        resolve(this)
      })
    })
  }

  /**
   * @private
   * @param {String} statement
   * @param {basicCallback} callback
   */

  _prepare (statement, callback) {
    debug('ps(%d): prepare', IDS.get(this))

    if (typeof statement === 'function') {
      callback = statement
      statement = undefined
    }

    if (this.prepared) {
      return setImmediate(callback, new PreparedStatementError('Statement is already prepared.', 'EALREADYPREPARED'))
    }

    this.statement = statement || this.statement

    this.parent.acquire(this, (err, connection, config) => {
      if (err) return callback(err)

      this._acquiredConnection = connection
      this._acquiredConfig = config

      const req = new shared.driver.Request(this)
      req.stream = false
      req.output('handle', TYPES.Int)
      req.input('params', TYPES.NVarChar, ((() => {
        const result = []
        for (const name in this.parameters) {
          if (!objectHasProperty(this.parameters, name)) {
            continue
          }
          const param = this.parameters[name]
          result.push(`@${name} ${declare(param.type, param)}${param.io === 2 ? ' output' : ''}`)
        }
        return result
      })()).join(','))
      req.input('stmt', TYPES.NVarChar, this.statement)
      req.execute('sp_prepare', (err, result) => {
        if (err) {
          this.parent.release(this._acquiredConnection)
          this._acquiredConnection = null
          this._acquiredConfig = null

          return callback(err)
        }

        debug('ps(%d): prepared', IDS.get(this))

        this._handle = result.output.handle
        this.prepared = true

        callback(null)
      })
    })
  }

  /**
   * Execute a prepared statement.
   *
   * @param {Object} values An object whose names correspond to the names of parameters that were added to the prepared statement before it was prepared.
   * @param {basicCallback} [callback] A callback which is called after execution has completed, or an error has occurred. If omited, method returns Promise.
   * @return {Request|Promise}
   */

  execute (values, callback) {
    if (this.stream || (typeof callback === 'function')) {
      return this._execute(values, callback)
    }

    return new shared.Promise((resolve, reject) => {
      this._execute(values, (err, recordset) => {
        if (err) return reject(err)
        resolve(recordset)
      })
    })
  }

  /**
   * @private
   * @param {Object} values
   * @param {basicCallback} callback
   */

  _execute (values, callback) {
    const req = new shared.driver.Request(this)
    req.stream = this.stream
    req.arrayRowMode = this.arrayRowMode
    req.input('handle', TYPES.Int, this._handle)

    // copy parameters with new values
    for (const name in this.parameters) {
      if (!objectHasProperty(this.parameters, name)) {
        continue
      }
      const param = this.parameters[name]
      req.parameters[name] = {
        name,
        type: param.type,
        io: param.io,
        value: values[name],
        length: param.length,
        scale: param.scale,
        precision: param.precision
      }
    }

    req.execute('sp_execute', (err, result) => {
      if (err) return callback(err)

      callback(null, result)
    })

    return req
  }

  /**
   * Unprepare a prepared statement.
   *
   * @param {basicCallback} [callback] A callback which is called after unpreparation has completed, or an error has occurred. If omited, method returns Promise.
   * @return {PreparedStatement|Promise}
   */

  unprepare (callback) {
    if (typeof callback === 'function') {
      this._unprepare(callback)
      return this
    }

    return new shared.Promise((resolve, reject) => {
      this._unprepare(err => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  /**
   * @private
   * @param {basicCallback} callback
   */

  _unprepare (callback) {
    debug('ps(%d): unprepare', IDS.get(this))

    if (!this.prepared) {
      return setImmediate(callback, new PreparedStatementError('Statement is not prepared. Call prepare() first.', 'ENOTPREPARED'))
    }

    if (this._activeRequest) {
      return setImmediate(callback, new TransactionError("Can't unprepare the statement. There is a request in progress.", 'EREQINPROG'))
    }

    const req = new shared.driver.Request(this)
    req.stream = false
    req.input('handle', TYPES.Int, this._handle)
    req.execute('sp_unprepare', err => {
      if (err) return callback(err)

      this.parent.release(this._acquiredConnection)
      this._acquiredConnection = null
      this._acquiredConfig = null
      this._handle = 0
      this.prepared = false

      debug('ps(%d): unprepared', IDS.get(this))

      return callback(null)
    })
  }
}

module.exports = PreparedStatement
