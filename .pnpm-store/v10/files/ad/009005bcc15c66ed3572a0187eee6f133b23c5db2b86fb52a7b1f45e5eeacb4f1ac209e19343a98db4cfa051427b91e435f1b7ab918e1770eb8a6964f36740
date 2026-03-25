
var Promise = require('any-promise')
var assert = require('assert')

module.exports = thenify

/**
 * Turn async functions into promises
 *
 * @param {Function} fn
 * @return {Function}
 * @api public
 */

function thenify(fn, options) {
  assert(typeof fn === 'function')
  return createWrapper(fn, options)
}

/**
 * Turn async functions into promises and backward compatible with callback
 *
 * @param {Function} fn
 * @return {Function}
 * @api public
 */

thenify.withCallback = function (fn, options) {
  assert(typeof fn === 'function')
  options = options || {}
  options.withCallback = true
  return createWrapper(fn, options)
}

function createCallback(resolve, reject, multiArgs) {
  // default to true
  if (multiArgs === undefined) multiArgs = true
  return function(err, value) {
    if (err) return reject(err)
    var length = arguments.length

    if (length <= 2 || !multiArgs) return resolve(value)

    if (Array.isArray(multiArgs)) {
      var values = {}
      for (var i = 1; i < length; i++) values[multiArgs[i - 1]] = arguments[i]
      return resolve(values)
    }

    var values = new Array(length - 1)
    for (var i = 1; i < length; ++i) values[i - 1] = arguments[i]
    resolve(values)
  }
}

function createWrapper(fn, options) {
  options = options || {}
  var name = fn.name;
  name = (name || '').replace(/\s|bound(?!$)/g, '')
  var newFn = function () {
    var self = this
    var len = arguments.length
    if (options.withCallback) {
      var lastType = typeof arguments[len - 1]
      if (lastType === 'function') return fn.apply(self, arguments)
    }
    var args = new Array(len + 1)
    for (var i = 0; i < len; ++i) args[i] = arguments[i]
    var lastIndex = i
    return new Promise(function (resolve, reject) {
      args[lastIndex] = createCallback(resolve, reject, options.multiArgs)
      fn.apply(self, args)
    })
  }
  Object.defineProperty(newFn, 'name', { value: name })
  return newFn
}
