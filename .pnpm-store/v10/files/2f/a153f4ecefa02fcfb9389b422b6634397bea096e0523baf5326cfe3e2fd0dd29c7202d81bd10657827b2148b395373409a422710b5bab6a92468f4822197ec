/*!
 * csrf
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var rndm = require('rndm')
var uid = require('uid-safe')
var compare = require('tsscmp')
var crypto = require('crypto')

/**
 * Module variables.
 * @private
 */

var EQUAL_GLOBAL_REGEXP = /=/g
var PLUS_GLOBAL_REGEXP = /\+/g
var SLASH_GLOBAL_REGEXP = /\//g

/**
 * Module exports.
 * @public
 */

module.exports = Tokens

/**
 * Token generation/verification class.
 *
 * @param {object} [options]
 * @param {number} [options.saltLength=8] The string length of the salt
 * @param {number} [options.secretLength=18] The byte length of the secret key
 * @public
 */

function Tokens (options) {
  if (!(this instanceof Tokens)) {
    return new Tokens(options)
  }

  var opts = options || {}

  var saltLength = opts.saltLength !== undefined
    ? opts.saltLength
    : 8

  if (typeof saltLength !== 'number' || !isFinite(saltLength) || saltLength < 1) {
    throw new TypeError('option saltLength must be finite number > 1')
  }

  var secretLength = opts.secretLength !== undefined
    ? opts.secretLength
    : 18

  if (typeof secretLength !== 'number' || !isFinite(secretLength) || secretLength < 1) {
    throw new TypeError('option secretLength must be finite number > 1')
  }

  this.saltLength = saltLength
  this.secretLength = secretLength
}

/**
 * Create a new CSRF token.
 *
 * @param {string} secret The secret for the token.
 * @public
 */

Tokens.prototype.create = function create (secret) {
  if (!secret || typeof secret !== 'string') {
    throw new TypeError('argument secret is required')
  }

  return this._tokenize(secret, rndm(this.saltLength))
}

/**
 * Create a new secret key.
 *
 * @param {function} [callback]
 * @public
 */

Tokens.prototype.secret = function secret (callback) {
  return uid(this.secretLength, callback)
}

/**
 * Create a new secret key synchronously.
 * @public
 */

Tokens.prototype.secretSync = function secretSync () {
  return uid.sync(this.secretLength)
}

/**
 * Tokenize a secret and salt.
 * @private
 */

Tokens.prototype._tokenize = function tokenize (secret, salt) {
  return salt + '-' + hash(salt + '-' + secret)
}

/**
 * Verify if a given token is valid for a given secret.
 *
 * @param {string} secret
 * @param {string} token
 * @public
 */

Tokens.prototype.verify = function verify (secret, token) {
  if (!secret || typeof secret !== 'string') {
    return false
  }

  if (!token || typeof token !== 'string') {
    return false
  }

  var index = token.indexOf('-')

  if (index === -1) {
    return false
  }

  var salt = token.substr(0, index)
  var expected = this._tokenize(secret, salt)

  return compare(token, expected)
}

/**
 * Hash a string with SHA1, returning url-safe base64
 * @param {string} str
 * @private
 */

function hash (str) {
  return crypto
    .createHash('sha1')
    .update(str, 'ascii')
    .digest('base64')
    .replace(PLUS_GLOBAL_REGEXP, '-')
    .replace(SLASH_GLOBAL_REGEXP, '_')
    .replace(EQUAL_GLOBAL_REGEXP, '')
}
