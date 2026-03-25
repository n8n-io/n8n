'use strict'

module.exports = {
  // database host. defaults to localhost
  host: 'localhost',

  // database user's name
  user: process.platform === 'win32' ? process.env.USERNAME : process.env.USER,

  // name of database to connect
  database: undefined,

  // database user's password
  password: null,

  // a Postgres connection string to be used instead of setting individual connection items
  // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
  // in the defaults object.
  connectionString: undefined,

  // database port
  port: 5432,

  // number of rows to return at a time from a prepared statement's
  // portal. 0 will return all rows at once
  rows: 0,

  // binary result mode
  binary: false,

  // Connection pool options - see https://github.com/brianc/node-pg-pool

  // number of connections to use in connection pool
  // 0 will disable connection pooling
  max: 10,

  // max milliseconds a client can go unused before it is removed
  // from the pool and destroyed
  idleTimeoutMillis: 30000,

  client_encoding: '',

  ssl: false,

  application_name: undefined,

  fallback_application_name: undefined,

  options: undefined,

  parseInputDatesAsUTC: false,

  // max milliseconds any query using this connection will execute for before timing out in error.
  // false=unlimited
  statement_timeout: false,

  // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
  // false=unlimited
  lock_timeout: false,

  // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
  // false=unlimited
  idle_in_transaction_session_timeout: false,

  // max milliseconds to wait for query to complete (client side)
  query_timeout: false,

  connect_timeout: 0,

  keepalives: 1,

  keepalives_idle: 0,
}

var pgTypes = require('pg-types')
// save default parsers
var parseBigInteger = pgTypes.getTypeParser(20, 'text')
var parseBigIntegerArray = pgTypes.getTypeParser(1016, 'text')

// parse int8 so you can get your count values as actual numbers
module.exports.__defineSetter__('parseInt8', function (val) {
  pgTypes.setTypeParser(20, 'text', val ? pgTypes.getTypeParser(23, 'text') : parseBigInteger)
  pgTypes.setTypeParser(1016, 'text', val ? pgTypes.getTypeParser(1007, 'text') : parseBigIntegerArray)
})
