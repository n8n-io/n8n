"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("at-extend-no-missing-placeholder");

const messages = utils.ruleMessages(ruleName, {
  rejected:
    "Expected a placeholder selector (e.g. %placeholder) to be used in @extend"
});

const meta = {
  url: ruleUrl(ruleName)
};

const INTERPOLATION_PATTERN = /^#{.+}/;

function rule(actual) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, { actual });

    if (!validOptions) {
      return;
    }

    root.walkAtRules("extend", atrule => {
      const param = atrule.params.trim();

      // Placeholder
      if (param.startsWith("%")) return;

      if (INTERPOLATION_PATTERN.test(param)) return;

      utils.report({
        ruleName,
        result,
        node: atrule,
        message: messages.rejected,
        word: param
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
