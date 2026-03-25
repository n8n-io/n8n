"use strict";

/**
 * Check whether a selector has an interpolating ampersand
 * An "interpolating ampersand" is an "&" used to interpolate within another
 * simple selector (e.g. `&-modifier`), rather than an "&" that stands
 * on its own as a simple selector (e.g. `& .child`)
 *
 * @param {string} selector
 * @return {boolean} If `true`, the selector has an interpolating ampersand
 */
module.exports = function (selector) {
  for (let i = 0; i < selector.length; i++) {
    if (selector[i] !== "&") {
      continue;
    }

    if (selector[i - 1] !== undefined && !isCombinator(selector[i - 1])) {
      return true;
    }

    if (selector[i + 1] !== undefined && !isCombinator(selector[i + 1])) {
      return true;
    }
  }

  return false;
};

function isCombinator(x) {
  return /[\s+>~]/.test(x);
}
