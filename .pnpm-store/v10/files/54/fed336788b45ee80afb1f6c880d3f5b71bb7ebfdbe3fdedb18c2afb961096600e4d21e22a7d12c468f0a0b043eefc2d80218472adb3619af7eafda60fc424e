"use strict";

/**
 * Get the index of a media query's params
 *
 * @param {AtRule} atRule
 * @return {int} The index
 */
module.exports = function (atRule) {
  // Initial 1 is for the `@`
  let index = 1 + atRule.name.length;

  if (atRule.raw("afterName")) {
    index += atRule.raw("afterName").length;
  }

  return index;
};
