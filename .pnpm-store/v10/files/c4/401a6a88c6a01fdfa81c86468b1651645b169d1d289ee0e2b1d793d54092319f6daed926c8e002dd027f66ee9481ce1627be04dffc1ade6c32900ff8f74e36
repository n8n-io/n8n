'use strict'

const ConnectionPool = require('./connection-pool')
const PreparedStatement = require('./prepared-statement')
const Request = require('./request')
const Transaction = require('./transaction')
const { ConnectionError, TransactionError, RequestError, PreparedStatementError, MSSQLError } = require('../error')
const shared = require('../shared')
const Table = require('../table')
const ISOLATION_LEVEL = require('../isolationlevel')
const { TYPES } = require('../datatypes')
const { connect, close, on, off, removeListener, query, batch } = require('../global-connection')

module.exports = {
  ConnectionPool,
  Transaction,
  Request,
  PreparedStatement,
  ConnectionError,
  TransactionError,
  RequestError,
  PreparedStatementError,
  MSSQLError,
  driver: shared.driver,
  exports: {
    ConnectionError,
    TransactionError,
    RequestError,
    PreparedStatementError,
    MSSQLError,
    Table,
    ISOLATION_LEVEL,
    TYPES,
    MAX: 65535, // (1 << 16) - 1
    map: shared.map,
    getTypeByValue: shared.getTypeByValue,
    connect,
    close,
    on,
    removeListener,
    off,
    query,
    batch
  }
}

Object.defineProperty(module.exports, 'Promise', {
  enumerable: true,
  get: () => {
    return shared.Promise
  },
  set: (value) => {
    shared.Promise = value
  }
})

Object.defineProperty(module.exports, 'valueHandler', {
  enumerable: true,
  value: shared.valueHandler,
  writable: false,
  configurable: false
})

for (const key in TYPES) {
  const value = TYPES[key]
  module.exports.exports[key] = value
  module.exports.exports[key.toUpperCase()] = value
}

/**
 * @callback Request~requestCallback
 * @param {Error} err Error on error, otherwise null.
 * @param {Object} [result] Request result.
 */

/**
 * @callback Request~bulkCallback
 * @param {Error} err Error on error, otherwise null.
 * @param {Number} [rowsAffected] Number of affected rows.
 */

/**
 * @callback basicCallback
 * @param {Error} err Error on error, otherwise null.
 * @param {Connection} [connection] Acquired connection.
 */

/**
 * @callback acquireCallback
 * @param {Error} err Error on error, otherwise null.
 * @param {Connection} [connection] Acquired connection.
 * @param {Object} [config] Connection config
 */

/**
 * Dispatched after connection has established.
 * @event ConnectionPool#connect
 */

/**
 * Dispatched after connection has closed a pool (by calling close).
 * @event ConnectionPool#close
 */

/**
 * Dispatched when transaction begin.
 * @event Transaction#begin
 */

/**
 * Dispatched on successful commit.
 * @event Transaction#commit
 */

/**
 * Dispatched on successful rollback.
 * @event Transaction#rollback
 */

/**
 * Dispatched when metadata for new recordset are parsed.
 * @event Request#recordset
 */

/**
 * Dispatched when new row is parsed.
 * @event Request#row
 */

/**
 * Dispatched when request is complete.
 * @event Request#done
 */

/**
 * Dispatched on error.
 * @event Request#error
 */
