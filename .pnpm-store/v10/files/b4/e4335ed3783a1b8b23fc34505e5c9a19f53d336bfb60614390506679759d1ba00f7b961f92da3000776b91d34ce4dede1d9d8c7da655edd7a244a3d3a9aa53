"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("at-use-no-unnamespaced");

const messages = utils.ruleMessages(ruleName, {
  rejected: "Unexpected @use without namespace"
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(actual) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, { actual });

    if (!validOptions) {
      return;
    }

    root.walkAtRules("use", atRule => {
      const matched = atRule.params.match(/(as\s*\*)\s*(?:$|with\s*\()/);
      if (!matched) return;

      utils.report({
        message: messages.rejected,
        node: atRule,
        result,
        ruleName,
        word: matched[1]
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
