"use strict";

/**
 * Given a CSS statement, return the string before the block.
 * For rules, this is the selector list (and surrounding whitespace).
 * For at-rules, this is the name and params (and surrounding whitespace).
 *
 * If there is no block, return empty string.
 *
 * @param {Rule|AtRule} statement - postcss rule or at-rule node
 * @param {object} options
 * @param {boolean} [options.noRawBefore] - Leave out the `before` string
 * @return {string}
 */
module.exports = function (statement, { noRawBefore } = {}) {
  let result = "";

  if (statement.type !== "rule" && statement.type !== "atrule") {
    return result;
  }

  if (!noRawBefore) {
    result += statement.raws.before;
  }

  if (statement.type === "rule") {
    result += statement.selector;
  } else {
    result += `@${statement.name}${statement.raws.afterName}${statement.params}`;
  }

  const between = statement.raws.between;

  if (between !== undefined) {
    result += between;
  }

  return result;
};
