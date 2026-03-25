"use strict";

const { utils } = require("stylelint");
const { isBoolean } = require("../../utils/validateTypes");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const {
  sassConditionalBraceNLAfterChecker
} = require("../at-if-closing-brace-newline-after");

const ruleName = namespace("at-else-closing-brace-newline-after");

const messages = utils.ruleMessages(ruleName, {
  expected: 'Expected newline after "}" of @else statement',
  rejected: 'Unexpected newline after "}" of @else statement'
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(expectation, options, context) {
  return (root, result) => {
    const validOptions = utils.validateOptions(
      result,
      ruleName,
      {
        actual: expectation,
        possible: ["always-last-in-chain"]
      },
      {
        actual: options,
        possible: {
          disableFix: isBoolean
        },
        optional: true
      }
    );

    if (!validOptions) {
      return;
    }

    sassConditionalBraceNLAfterChecker({
      root,
      result,
      ruleName,
      atRuleName: "else",
      expectation,
      messages,
      context,
      options
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
