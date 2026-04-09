"use strict";

const { utils } = require("stylelint");
const atRuleParamIndex = require("../../utils/atRuleParamIndex");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");
const whitespaceChecker = require("../../utils/whitespaceChecker");

const ruleName = namespace("at-else-if-parentheses-space-before");

const messages = utils.ruleMessages(ruleName, {
  rejectedBefore: () =>
    "Unexpected whitespace before parentheses in else-if declaration",
  expectedBefore: () =>
    "Expected a single space before parentheses in else-if declaration"
});

const meta = {
  url: ruleUrl(ruleName),
  fixable: true
};

function rule(value) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: value,
      possible: ["always", "never"]
    });

    if (!validOptions) {
      return;
    }

    const match = /^if\s*\(/;
    const replacement = value === "always" ? "if (" : "if(";

    const checker = whitespaceChecker("space", value, messages).before;

    root.walkAtRules("else", atRule => {
      // return early if the else-if statement is not surrounded by parentheses
      if (!match.test(atRule.params)) {
        return;
      }

      const fix = () => {
        atRule.params = atRule.params.replace(match, replacement);
      };

      const index = atRule.params.indexOf("(");
      const paramIndex = atRuleParamIndex(atRule);

      checker({
        source: atRule.params,
        index,
        err: message =>
          utils.report({
            message,
            node: atRule,
            result,
            ruleName,
            index: paramIndex + index,
            endIndex: paramIndex + index,
            fix
          })
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
