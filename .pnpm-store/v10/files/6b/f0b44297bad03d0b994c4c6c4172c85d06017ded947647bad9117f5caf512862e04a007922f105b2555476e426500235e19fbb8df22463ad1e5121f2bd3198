/*!
 * body-parser
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * @typedef Parsers
 * @type {function}
 * @property {function} json
 * @property {function} raw
 * @property {function} text
 * @property {function} urlencoded
 */

/**
 * Module exports.
 * @type {Parsers}
 */

exports = module.exports = bodyParser

/**
 * JSON parser.
 * @public
 */

Object.defineProperty(exports, 'json', {
  configurable: true,
  enumerable: true,
  get: () => require('./lib/types/json')
})

/**
 * Raw parser.
 * @public
 */

Object.defineProperty(exports, 'raw', {
  configurable: true,
  enumerable: true,
  get: () => require('./lib/types/raw')
})

/**
 * Text parser.
 * @public
 */

Object.defineProperty(exports, 'text', {
  configurable: true,
  enumerable: true,
  get: () => require('./lib/types/text')
})

/**
 * URL-encoded parser.
 * @public
 */

Object.defineProperty(exports, 'urlencoded', {
  configurable: true,
  enumerable: true,
  get: () => require('./lib/types/urlencoded')
})

/**
 * Create a middleware to parse json and urlencoded bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @deprecated
 * @public
 */

function bodyParser () {
  throw new Error('The bodyParser() generic has been split into individual middleware to use instead.')
}
