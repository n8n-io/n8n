'use strict';

var util = require('util');

/**
 * An error thrown by the parser on unexpected input.
 *
 * @constructor
 * @param {string} message The error message.
 * @param {string} input The unexpected input.
 * @public
 */
function ParseError(message, input) {
  Error.captureStackTrace(this, ParseError);

  this.name = this.constructor.name;
  this.message = message;
  this.input = input;
}

util.inherits(ParseError, Error);

module.exports = ParseError;
