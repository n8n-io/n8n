
var thenify = require('thenify')

module.exports = thenifyAll
thenifyAll.withCallback = withCallback
thenifyAll.thenify = thenify

/**
 * Promisifies all the selected functions in an object.
 *
 * @param {Object} source the source object for the async functions
 * @param {Object} [destination] the destination to set all the promisified methods
 * @param {Array} [methods] an array of method names of `source`
 * @return {Object}
 * @api public
 */

function thenifyAll(source, destination, methods) {
  return promisifyAll(source, destination, methods, thenify)
}

/**
 * Promisifies all the selected functions in an object and backward compatible with callback.
 *
 * @param {Object} source the source object for the async functions
 * @param {Object} [destination] the destination to set all the promisified methods
 * @param {Array} [methods] an array of method names of `source`
 * @return {Object}
 * @api public
 */

function withCallback(source, destination, methods) {
  return promisifyAll(source, destination, methods, thenify.withCallback)
}

function promisifyAll(source, destination, methods, promisify) {
  if (!destination) {
    destination = {};
    methods = Object.keys(source)
  }

  if (Array.isArray(destination)) {
    methods = destination
    destination = {}
  }

  if (!methods) {
    methods = Object.keys(source)
  }

  if (typeof source === 'function') destination = promisify(source)

  methods.forEach(function (name) {
    // promisify only if it's a function
    if (typeof source[name] === 'function') destination[name] = promisify(source[name])
  })

  // proxy the rest
  Object.keys(source).forEach(function (name) {
    if (deprecated(source, name)) return
    if (destination[name]) return
    destination[name] = source[name]
  })

  return destination
}

function deprecated(source, name) {
  var desc = Object.getOwnPropertyDescriptor(source, name)
  if (!desc || !desc.get) return false
  if (desc.get.name === 'deprecated') return true
  return false
}
