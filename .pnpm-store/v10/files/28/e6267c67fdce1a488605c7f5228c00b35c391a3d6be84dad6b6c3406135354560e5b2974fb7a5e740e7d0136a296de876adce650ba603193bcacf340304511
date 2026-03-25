'use strict'

const debug = require('debug')('mssql:base')
const { EventEmitter } = require('node:events')
const { IDS } = require('../utils')
const globalConnection = require('../global-connection')
const { TransactionError } = require('../error')
const shared = require('../shared')
const ISOLATION_LEVEL = require('../isolationlevel')

/**
 * Class Transaction.
 *
 * @property {Number} isolationLevel Controls the locking and row versioning behavior of TSQL statements issued by a connection. READ_COMMITTED by default.
 * @property {String} name Transaction name. Empty string by default.
 *
 * @fires Transaction#begin
 * @fires Transaction#commit
 * @fires Transaction#rollback
 */

class Transaction extends EventEmitter {
  /**
   * Create new Transaction.
   *
   * @param {Connection} [parent] If ommited, global connection is used instead.
   */

  constructor (parent) {
    super()

    IDS.add(this, 'Transaction')
    debug('transaction(%d): created', IDS.get(this))

    this.parent = parent || globalConnection.pool
    this.isolationLevel = Transaction.defaultIsolationLevel
    this.name = ''
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
   * @return {Transaction|Promise}
   */

  acquire (request, callback) {
    if (!this._acquiredConnection) {
      setImmediate(callback, new TransactionError('Transaction has not begun. Call begin() first.', 'ENOTBEGUN'))
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
   * @return {Transaction}
   */

  release (connection) {
    if (connection === this._acquiredConnection) {
      this._activeRequest = null
    }

    return this
  }

  /**
   * Begin a transaction.
   *
   * @param {Number} [isolationLevel] Controls the locking and row versioning behavior of TSQL statements issued by a connection.
   * @param {basicCallback} [callback] A callback which is called after transaction has began, or an error has occurred. If omited, method returns Promise.
   * @return {Transaction|Promise}
   */

  begin (isolationLevel, callback) {
    if (isolationLevel instanceof Function) {
      callback = isolationLevel
      isolationLevel = undefined
    }

    if (typeof callback === 'function') {
      this._begin(isolationLevel, err => {
        if (!err) {
          this.emit('begin')
        }
        callback(err)
      })
      return this
    }

    return new shared.Promise((resolve, reject) => {
      this._begin(isolationLevel, err => {
        if (err) return reject(err)
        this.emit('begin')
        resolve(this)
      })
    })
  }

  /**
   * @private
   * @param {Number} [isolationLevel]
   * @param {basicCallback} [callback]
   * @return {Transaction}
   */

  _begin (isolationLevel, callback) {
    if (this._acquiredConnection) {
      return setImmediate(callback, new TransactionError('Transaction has already begun.', 'EALREADYBEGUN'))
    }

    this._aborted = false
    this._rollbackRequested = false
    if (isolationLevel) {
      if (Object.keys(ISOLATION_LEVEL).some(key => {
        return ISOLATION_LEVEL[key] === isolationLevel
      })) {
        this.isolationLevel = isolationLevel
      } else {
        throw new TransactionError('Invalid isolation level.')
      }
    }

    setImmediate(callback)
  }

  /**
   * Commit a transaction.
   *
   * @param {basicCallback} [callback] A callback which is called after transaction has commited, or an error has occurred. If omited, method returns Promise.
   * @return {Transaction|Promise}
   */

  commit (callback) {
    if (typeof callback === 'function') {
      this._commit(err => {
        if (!err) {
          this.emit('commit')
        }
        callback(err)
      })
      return this
    }

    return new shared.Promise((resolve, reject) => {
      this._commit(err => {
        if (err) return reject(err)
        this.emit('commit')
        resolve()
      })
    })
  }

  /**
   * @private
   * @param {basicCallback} [callback]
   * @return {Transaction}
   */

  _commit (callback) {
    if (this._aborted) {
      return setImmediate(callback, new TransactionError('Transaction has been aborted.', 'EABORT'))
    }

    if (!this._acquiredConnection) {
      return setImmediate(callback, new TransactionError('Transaction has not begun. Call begin() first.', 'ENOTBEGUN'))
    }

    if (this._activeRequest) {
      return setImmediate(callback, new TransactionError("Can't commit transaction. There is a request in progress.", 'EREQINPROG'))
    }

    setImmediate(callback)
  }

  /**
   * Returns new request using this transaction.
   *
   * @return {Request}
   */

  request () {
    return new shared.driver.Request(this)
  }

  /**
   * Rollback a transaction.
   *
   * @param {basicCallback} [callback] A callback which is called after transaction has rolled back, or an error has occurred. If omited, method returns Promise.
   * @return {Transaction|Promise}
   */

  rollback (callback) {
    if (typeof callback === 'function') {
      this._rollback(err => {
        if (!err) {
          this.emit('rollback', this._aborted)
        }
        callback(err)
      })
      return this
    }

    return new shared.Promise((resolve, reject) => {
      return this._rollback(err => {
        if (err) return reject(err)
        this.emit('rollback', this._aborted)
        resolve()
      })
    })
  }

  /**
   * @private
   * @param {basicCallback} [callback]
   * @return {Transaction}
   */

  _rollback (callback) {
    if (this._aborted) {
      return setImmediate(callback, new TransactionError('Transaction has been aborted.', 'EABORT'))
    }

    if (!this._acquiredConnection) {
      return setImmediate(callback, new TransactionError('Transaction has not begun. Call begin() first.', 'ENOTBEGUN'))
    }

    if (this._activeRequest) {
      return setImmediate(callback, new TransactionError("Can't rollback transaction. There is a request in progress.", 'EREQINPROG'))
    }

    this._rollbackRequested = true

    setImmediate(callback)
  }
}

/**
 * Default isolation level used for any transactions that don't explicitly specify an isolation level.
 *
 * @type {number}
 */
Transaction.defaultIsolationLevel = ISOLATION_LEVEL.READ_COMMITTED

module.exports = Transaction
