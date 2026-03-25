'use strict';

var name = require('fn.name');

/**
 * Wrap callbacks to prevent double execution.
 *
 * @param {Function} fn Function that should only be called once.
 * @returns {Function} A async wrapped callback which prevents multiple executions.
 * @public
 */
module.exports = function one(fn) {
  var called = 0
    , value;

  /**
   * The function that prevents double execution.
   *
   * @async
   * @public
   */
  async function onetime() {
    if (called) return value;

    called = 1;
    value = await fn.apply(this, arguments);
    fn = null;

    return value;
  }

  //
  // To make debugging more easy we want to use the name of the supplied
  // function. So when you look at the functions that are assigned to event
  // listeners you don't see a load of `onetime` functions but actually the
  // names of the functions that this module will call.
  //
  // NOTE: We cannot override the `name` property, as that is `readOnly`
  // property, so displayName will have to do.
  //
  onetime.displayName = name(fn);
  return onetime;
};
