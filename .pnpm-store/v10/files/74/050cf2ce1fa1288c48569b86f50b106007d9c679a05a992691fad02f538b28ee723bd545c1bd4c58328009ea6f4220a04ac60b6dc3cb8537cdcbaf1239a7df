"use strict";

/**
 * @param {import('postcss').AtRule} atRule
 * @returns {string}
 */
function getAtRuleParams(atRule) {
  return atRule.raws.params?.raw ?? atRule.params;
}

module.exports = getAtRuleParams;
