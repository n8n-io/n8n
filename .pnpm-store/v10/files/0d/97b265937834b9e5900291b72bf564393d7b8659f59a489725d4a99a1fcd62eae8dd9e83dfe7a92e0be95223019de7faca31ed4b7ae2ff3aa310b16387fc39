"use strict";

const { utils } = require("stylelint");
const atRuleParamIndex = require("../../utils/atRuleParamIndex");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");
const whitespaceChecker = require("../../utils/whitespaceChecker");

const ruleName = namespace("at-function-parentheses-space-before");

const messages = utils.ruleMessages(ruleName, {
  rejectedBefore: () =>
    "Unexpected whitespace before parentheses in function declaration",
  expectedBefore: () =>
    "Expected a single space before parentheses in function declaration"
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(value, _, context) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: value,
      possible: ["always", "never"]
    });

    if (!validOptions) {
      return;
    }

    const match = /^([\w-]+)\s*\(/;
    const replacement = value === "always" ? "$1 (" : "$1(";

    const checker = whitespaceChecker("space", value, messages).before;

    root.walkAtRules("function", atRule => {
      if (context.fix) {
        atRule.params = atRule.params.replace(match, replacement);

        return;
      }

      const paranIndex = atRule.params.indexOf("(");
      const baseIndex = atRuleParamIndex(atRule);

      checker({
        source: atRule.params,
        index: paranIndex,
        err: message =>
          utils.report({
            message,
            node: atRule,
            result,
            ruleName,
            index: baseIndex + paranIndex,
            endIndex: baseIndex + paranIndex
          })
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
