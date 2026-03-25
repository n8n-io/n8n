"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");
const {
  sassConditionalBraceSpaceAfterChecker
} = require("../at-if-closing-brace-space-after");

const ruleName = namespace("at-else-closing-brace-space-after");

const messages = utils.ruleMessages(ruleName, {
  expected: 'Expected single space after "}" of @else statement',
  rejected: 'Unexpected space after "}" of @else statement'
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(expectation, _, context) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: expectation,
      possible: ["always-intermediate", "never-intermediate"]
    });

    if (!validOptions) {
      return;
    }

    sassConditionalBraceSpaceAfterChecker({
      root,
      result,
      ruleName,
      atRuleName: "else",
      expectation,
      messages,
      context
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
