"use strict";

/**
 * Stringify PostCSS node including its raw "before" string.
 *
 * @param {Node} node - Any PostCSS node
 * @return {string}
 */
module.exports = function (node) {
  let result = "";

  if (node.raws.before) {
    result += node.raws.before;
  }

  result += node.toString();

  return result;
};
