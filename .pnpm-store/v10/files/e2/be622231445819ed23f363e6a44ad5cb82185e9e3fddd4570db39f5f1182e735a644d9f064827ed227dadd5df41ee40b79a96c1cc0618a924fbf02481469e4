"use strict";

const { utils } = require("stylelint");
const {
  variableColonSpaceChecker
} = require("../dollar-variable-colon-space-after");
const whitespaceChecker = require("../../utils/whitespaceChecker");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("dollar-variable-colon-space-before");

const messages = utils.ruleMessages(ruleName, {
  expectedBefore: () => 'Expected single space before ":"',
  rejectedBefore: () => 'Unexpected whitespace before ":"'
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(expectation, _, context) {
  const checker = whitespaceChecker("space", expectation, messages);

  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: expectation,
      possible: ["always", "never"]
    });

    if (!validOptions) {
      return;
    }

    variableColonSpaceChecker({
      root,
      result,
      locationChecker: checker.before,
      checkedRuleName: ruleName,
      position: "before",
      expectation,
      context
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
