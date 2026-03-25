/*!
 * random-bytes
 * Copyright(c) 2016 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var crypto = require('crypto')

/**
 * Module variables.
 * @private
 */

var generateAttempts = crypto.randomBytes === crypto.pseudoRandomBytes ? 1 : 3

/**
 * Module exports.
 * @public
 */

module.exports = randomBytes
module.exports.sync = randomBytesSync

/**
 * Generates strong pseudo-random bytes.
 *
 * @param {number} size
 * @param {function} [callback]
 * @return {Promise}
 * @public
 */

function randomBytes(size, callback) {
  // validate callback is a function, if provided
  if (callback !== undefined && typeof callback !== 'function') {
    throw new TypeError('argument callback must be a function')
  }

  // require the callback without promises
  if (!callback && !global.Promise) {
    throw new TypeError('argument callback is required')
  }

  if (callback) {
    // classic callback style
    return generateRandomBytes(size, generateAttempts, callback)
  }

  return new Promise(function executor(resolve, reject) {
    generateRandomBytes(size, generateAttempts, function onRandomBytes(err, str) {
      if (err) return reject(err)
      resolve(str)
    })
  })
}

/**
 * Generates strong pseudo-random bytes sync.
 *
 * @param {number} size
 * @return {Buffer}
 * @public
 */

function randomBytesSync(size) {
  var err = null

  for (var i = 0; i < generateAttempts; i++) {
    try {
      return crypto.randomBytes(size)
    } catch (e) {
      err = e
    }
  }

  throw err
}

/**
 * Generates strong pseudo-random bytes.
 *
 * @param {number} size
 * @param {number} attempts
 * @param {function} callback
 * @private
 */

function generateRandomBytes(size, attempts, callback) {
  crypto.randomBytes(size, function onRandomBytes(err, buf) {
    if (!err) return callback(null, buf)
    if (!--attempts) return callback(err)
    setTimeout(generateRandomBytes.bind(null, size, attempts, callback), 10)
  })
}
