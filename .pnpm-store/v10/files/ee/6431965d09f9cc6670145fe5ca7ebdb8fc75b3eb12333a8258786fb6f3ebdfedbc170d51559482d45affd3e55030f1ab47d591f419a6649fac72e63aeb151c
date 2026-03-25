'use strict'

const debug = require('debug')('mssql:tedi')
const BaseTransaction = require('../base/transaction')
const { IDS } = require('../utils')
const TransactionError = require('../error/transaction-error')

class Transaction extends BaseTransaction {
  constructor (parent) {
    super(parent)

    this._abort = () => {
      if (!this._rollbackRequested) {
        // transaction interrupted because of XACT_ABORT

        const pc = this._acquiredConnection

        // defer releasing so connection can switch from SentClientRequest to LoggedIn state
        setImmediate(this.parent.release.bind(this.parent), pc)

        this._acquiredConnection.removeListener('rollbackTransaction', this._abort)
        this._acquiredConnection = null
        this._acquiredConfig = null
        this._aborted = true

        this.emit('rollback', true)
      }
    }
  }

  _begin (isolationLevel, callback) {
    super._begin(isolationLevel, err => {
      if (err) return callback(err)

      debug('transaction(%d): begin', IDS.get(this))

      this.parent.acquire(this, (err, connection, config) => {
        if (err) return callback(err)

        this._acquiredConnection = connection
        this._acquiredConnection.on('rollbackTransaction', this._abort)
        this._acquiredConfig = config

        connection.beginTransaction(err => {
          if (err) err = new TransactionError(err)

          debug('transaction(%d): begun', IDS.get(this))

          callback(err)
        }, this.name, this.isolationLevel)
      })
    })
  }

  _commit (callback) {
    super._commit(err => {
      if (err) return callback(err)

      debug('transaction(%d): commit', IDS.get(this))

      this._acquiredConnection.commitTransaction(err => {
        if (err) err = new TransactionError(err)

        this._acquiredConnection.removeListener('rollbackTransaction', this._abort)
        this.parent.release(this._acquiredConnection)
        this._acquiredConnection = null
        this._acquiredConfig = null

        if (!err) debug('transaction(%d): commited', IDS.get(this))

        callback(err)
      })
    })
  }

  _rollback (callback) {
    super._rollback(err => {
      if (err) return callback(err)

      debug('transaction(%d): rollback', IDS.get(this))

      this._acquiredConnection.rollbackTransaction(err => {
        if (err) err = new TransactionError(err)

        this._acquiredConnection.removeListener('rollbackTransaction', this._abort)
        this.parent.release(this._acquiredConnection)
        this._acquiredConnection = null
        this._acquiredConfig = null

        if (!err) debug('transaction(%d): rolled back', IDS.get(this))

        callback(err)
      })
    })
  }
}

module.exports = Transaction
