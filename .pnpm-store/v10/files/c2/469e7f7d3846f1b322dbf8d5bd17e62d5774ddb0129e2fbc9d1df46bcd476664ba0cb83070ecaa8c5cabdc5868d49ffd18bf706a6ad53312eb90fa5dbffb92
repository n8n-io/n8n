"use strict";

function noop() {}

/**
 * Reflects a promise but does not expose any
 * underlying value or rejection from that promise.
 * @param  {Promise} promise [description]
 * @return {Promise}         [description]
 */
exports.reflector = function(promise) {
  return promise.then(noop, noop);
};
