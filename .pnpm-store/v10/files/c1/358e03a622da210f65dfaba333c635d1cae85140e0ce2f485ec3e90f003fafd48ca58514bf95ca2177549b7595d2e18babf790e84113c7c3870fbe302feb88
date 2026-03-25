'use strict'

/**
 * Module dependencies.
 */

var bytes = require('bytes')
var contentType = require('content-type')
var typeis = require('type-is')

/**
 * Module exports.
 */
module.exports = {
  getCharset,
  normalizeOptions,
  passthrough
}

/**
 * Get the charset of a request.
 *
 * @param {object} req
 * @api private
 */

function getCharset (req) {
  try {
    return (contentType.parse(req).parameters.charset || '').toLowerCase()
  } catch {
    return undefined
  }
}

/**
 * Get the simple type checker.
 *
 * @param {string | string[]} type
 * @return {function}
 */

function typeChecker (type) {
  return function checkType (req) {
    return Boolean(typeis(req, type))
  }
}

/**
 * Normalizes the common options for all parsers.
 *
 * @param {object} options options to normalize
 * @param {string | string[] | function} defaultType default content type(s) or a function to determine it
 * @returns {object}
 */
function normalizeOptions (options, defaultType) {
  if (!defaultType) {
    // Parsers must define a default content type
    throw new TypeError('defaultType must be provided')
  }

  var inflate = options?.inflate !== false
  var limit = typeof options?.limit !== 'number'
    ? bytes.parse(options?.limit || '100kb')
    : options?.limit
  var type = options?.type || defaultType
  var verify = options?.verify || false
  var defaultCharset = options?.defaultCharset || 'utf-8'

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function')
  }

  // create the appropriate type checking function
  var shouldParse = typeof type !== 'function'
    ? typeChecker(type)
    : type

  return {
    inflate,
    limit,
    verify,
    defaultCharset,
    shouldParse
  }
}

/**
 * Passthrough function that returns input unchanged.
 * Used by parsers that don't need to transform the data.
 *
 * @param {*} value
 * @return {*}
 */
function passthrough (value) {
  return value
}
