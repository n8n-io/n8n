"use strict";

const hasInterpolation = require("./hasInterpolation");
const isStandardSyntaxSelector = require("./isStandardSyntaxSelector");

/**
 * Check whether a selector is standard
 *
 * @param {string} selector
 * @return {boolean} If `true`, the selector is standard
 */
module.exports = function (selector) {
  const standardSyntaxSelector = isStandardSyntaxSelector(selector);

  // SCSS placeholder selectors
  if (!standardSyntaxSelector) {
    if (selector.indexOf("%") === 0 && !hasInterpolation(selector)) {
      return true;
    }
  }

  return standardSyntaxSelector;
};
