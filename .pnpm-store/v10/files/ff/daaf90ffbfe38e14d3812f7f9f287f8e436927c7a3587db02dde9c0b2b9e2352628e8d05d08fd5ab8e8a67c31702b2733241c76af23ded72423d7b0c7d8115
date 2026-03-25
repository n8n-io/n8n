'use strict'

const shared = require('./shared')

let globalConnection = null
const globalConnectionHandlers = {}

/**
 * Open global connection pool.
 *
 * @param {Object|String} config Connection configuration object or connection string.
 * @param {basicCallback} [callback] A callback which is called after connection has established, or an error has occurred. If omited, method returns Promise.
 * @return {Promise.<ConnectionPool>}
 */

function connect (config, callback) {
  if (!globalConnection) {
    globalConnection = new shared.driver.ConnectionPool(config)

    for (const event in globalConnectionHandlers) {
      for (let i = 0, l = globalConnectionHandlers[event].length; i < l; i++) {
        globalConnection.on(event, globalConnectionHandlers[event][i])
      }
    }

    const ogClose = globalConnection.close

    const globalClose = function (callback) {
      // remove event handlers from the global connection
      for (const event in globalConnectionHandlers) {
        for (let i = 0, l = globalConnectionHandlers[event].length; i < l; i++) {
          this.removeListener(event, globalConnectionHandlers[event][i])
        }
      }

      // attach error handler to prevent process crash in case of error
      this.on('error', err => {
        if (globalConnectionHandlers.error) {
          for (let i = 0, l = globalConnectionHandlers.error.length; i < l; i++) {
            globalConnectionHandlers.error[i].call(this, err)
          }
        }
      })

      globalConnection = null
      return ogClose.call(this, callback)
    }

    globalConnection.close = globalClose.bind(globalConnection)
  }
  if (typeof callback === 'function') {
    return globalConnection.connect((err, connection) => {
      if (err) {
        globalConnection = null
      }
      callback(err, connection)
    })
  }
  return globalConnection.connect().catch((err) => {
    globalConnection = null
    return shared.Promise.reject(err)
  })
}

/**
 * Close all active connections in the global pool.
 *
 * @param {basicCallback} [callback] A callback which is called after connection has closed, or an error has occurred. If omited, method returns Promise.
 * @return {ConnectionPool|Promise}
 */

function close (callback) {
  if (globalConnection) {
    const gc = globalConnection
    globalConnection = null
    return gc.close(callback)
  }

  if (typeof callback === 'function') {
    setImmediate(callback)
    return null
  }

  return new shared.Promise((resolve) => {
    resolve(globalConnection)
  })
}

/**
 * Attach event handler to global connection pool.
 *
 * @param {String} event Event name.
 * @param {Function} handler Event handler.
 * @return {ConnectionPool}
 */

function on (event, handler) {
  if (!globalConnectionHandlers[event]) globalConnectionHandlers[event] = []
  globalConnectionHandlers[event].push(handler)

  if (globalConnection) globalConnection.on(event, handler)
  return globalConnection
}

/**
 * Detach event handler from global connection.
 *
 * @param {String} event Event name.
 * @param {Function} handler Event handler.
 * @return {ConnectionPool}
 */

function removeListener (event, handler) {
  if (!globalConnectionHandlers[event]) return globalConnection
  const index = globalConnectionHandlers[event].indexOf(handler)
  if (index === -1) return globalConnection
  globalConnectionHandlers[event].splice(index, 1)
  if (globalConnectionHandlers[event].length === 0) globalConnectionHandlers[event] = undefined

  if (globalConnection) globalConnection.removeListener(event, handler)
  return globalConnection
}

/**
 * Creates a new query using global connection from a tagged template string.
 *
 * @variation 1
 * @param {Array|String} strings Array of string literals or sql command.
 * @param {...*} keys Values.
 * @return {Request}
 */

/**
 * Execute the SQL command.
 *
 * @variation 2
 * @param {String} command T-SQL command to be executed.
 * @param {Request~requestCallback} [callback] A callback which is called after execution has completed, or an error has occurred. If omited, method returns Promise.
 * @return {Request|Promise}
 */

function query () {
  if (typeof arguments[0] === 'string') { return new shared.driver.Request().query(arguments[0], arguments[1]) }

  const values = Array.prototype.slice.call(arguments)
  const strings = values.shift()

  return new shared.driver.Request()._template(strings, values, 'query')
}

/**
 * Creates a new batch using global connection from a tagged template string.
 *
 * @variation 1
 * @param {Array} strings Array of string literals.
 * @param {...*} keys Values.
 * @return {Request}
 */

/**
 * Execute the SQL command.
 *
 * @variation 2
 * @param {String} command T-SQL command to be executed.
 * @param {Request~requestCallback} [callback] A callback which is called after execution has completed, or an error has occurred. If omited, method returns Promise.
 * @return {Request|Promise}
 */

function batch () {
  if (typeof arguments[0] === 'string') { return new shared.driver.Request().batch(arguments[0], arguments[1]) }

  const values = Array.prototype.slice.call(arguments)
  const strings = values.shift()

  return new shared.driver.Request()._template(strings, values, 'batch')
}

module.exports = {
  batch,
  close,
  connect,
  off: removeListener,
  on,
  query,
  removeListener
}

Object.defineProperty(module.exports, 'pool', {
  get: () => {
    return globalConnection
  },
  set: () => {}
})
