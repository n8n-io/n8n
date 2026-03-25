'use strict'

const base = require('../base')
const ConnectionPool = require('./connection-pool')
const Transaction = require('./transaction')
const Request = require('./request')

module.exports = Object.assign({
  ConnectionPool,
  Transaction,
  Request,
  PreparedStatement: base.PreparedStatement
}, base.exports)

Object.defineProperty(module.exports, 'Promise', {
  enumerable: true,
  get: () => {
    return base.Promise
  },
  set: (value) => {
    base.Promise = value
  }
})

Object.defineProperty(module.exports, 'valueHandler', {
  enumerable: true,
  value: base.valueHandler,
  writable: false,
  configurable: false
})

base.driver.name = 'msnodesqlv8'
base.driver.ConnectionPool = ConnectionPool
base.driver.Transaction = Transaction
base.driver.Request = Request
