'use strict';

/**
 * Module dependencies.
 */
const methods = require('methods');
let http2;
try {
  http2 = require('http2'); // eslint-disable-line global-require
} catch (_) {
  // eslint-disable-line no-empty
}
const Test = require('./lib/test.js');
const agent = require('./lib/agent.js');

/**
 * Test against the given `app`,
 * returning a new `Test`.
 *
 * @param {Function|Server|String} app
 * @return {Test}
 * @api public
 */
module.exports = function(app, options = {}) {
  const obj = {};

  if (typeof app === 'function') {
    if (options.http2) {
      if (!http2) {
        throw new Error(
          'supertest: this version of Node.js does not support http2'
        );
      }
    }
  }

  methods.forEach(function(method) {
    obj[method] = function(url) {
      var test = new Test(app, method, url, options.http2);
      if (options.http2) {
        test.http2();
      }
      return test;
    };
  });

  // Support previous use of del
  obj.del = obj.delete;

  return obj;
};

/**
 * Expose `Test`
 */
module.exports.Test = Test;

/**
 * Expose the agent function
 */
module.exports.agent = agent;
