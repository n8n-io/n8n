/**
 * Module dependencies.
 */

var crypto = require('crypto');

/**
 * Sign the given `val` with `secret`.
 *
 * @param {String} val
 * @param {String|NodeJS.ArrayBufferView|crypto.KeyObject} secret
 * @return {String}
 * @api private
 */

exports.sign = function(val, secret){
  if ('string' != typeof val) throw new TypeError("Cookie value must be provided as a string.");
  if (null == secret) throw new TypeError("Secret key must be provided.");
  return val + '.' + crypto
    .createHmac('sha256', secret)
    .update(val)
    .digest('base64')
    .replace(/\=+$/, '');
};

/**
 * Unsign and decode the given `input` with `secret`,
 * returning `false` if the signature is invalid.
 *
 * @param {String} input
 * @param {String|NodeJS.ArrayBufferView|crypto.KeyObject} secret
 * @return {String|Boolean}
 * @api private
 */

exports.unsign = function(input, secret){
  if ('string' != typeof input) throw new TypeError("Signed cookie string must be provided.");
  if (null == secret) throw new TypeError("Secret key must be provided.");
  var tentativeValue = input.slice(0, input.lastIndexOf('.')),
      expectedInput = exports.sign(tentativeValue, secret),
      expectedBuffer = Buffer.from(expectedInput),
      inputBuffer = Buffer.from(input);
  return (
    expectedBuffer.length === inputBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, inputBuffer)
   ) ? tentativeValue : false;
};
