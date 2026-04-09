/** Copyright 2015 Gregory Langlais. See LICENSE.txt. */

'use strict';

const Assertion = require('./assertion');

/**
 * Construct cookies assertion (function)
 *
 * @param {null|string|string[]} [secret]
 * @param {function(req, res)[]} [asserts] ran within returned assertion function
 * @returns {function} assertion
 * @constructor
 */
function ExpectCookies(secret, asserts) {
  return Assertion(secret, asserts);
}

// build ExpectCookies proxy methods
const assertion = Assertion();
const methods = Object.getOwnPropertyNames(assertion);

methods.forEach(function(method) {
  if (typeof assertion[method] === 'function' && typeof Function[method] === 'undefined') {
    ExpectCookies[method] = function() {
      const newAssertion = Assertion();
      return newAssertion[method].apply(newAssertion, arguments);
    };
  }
});

module.exports = ExpectCookies;
