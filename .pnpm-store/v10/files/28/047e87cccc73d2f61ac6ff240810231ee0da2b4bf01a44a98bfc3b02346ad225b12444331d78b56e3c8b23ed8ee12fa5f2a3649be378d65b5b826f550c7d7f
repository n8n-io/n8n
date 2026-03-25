"use strict";

const revision = "master";

/**
 * Get the specified rule's URL.
 *
 * @param {string} ruleName
 * @return {string}
 */
module.exports = function ruleUrl(ruleName) {
  let name = ruleName;
  if (name.includes("/")) {
    [, name] = name.split("/", 2);
  }
  return `https://github.com/stylelint-scss/stylelint-scss/blob/${revision}/src/rules/${name}`;
};
