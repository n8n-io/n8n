"use strict";

const { utils } = require("stylelint");
const { isRegExp, isString } = require("../../utils/validateTypes");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("at-function-pattern");

const messages = utils.ruleMessages(ruleName, {
  expected: (functionName, pattern) =>
    `Expected "${functionName}" to match pattern "${pattern}"`
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(pattern) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: pattern,
      possible: [isRegExp, isString]
    });

    if (!validOptions) {
      return;
    }

    const regexpPattern = isString(pattern) ? new RegExp(pattern) : pattern;

    root.walkAtRules("function", atRule => {
      // Stripping the function of its arguments
      const functionName = atRule.params.replace(/(\s*)\([\s\S]*\)/g, "");

      if (regexpPattern.test(functionName)) {
        return;
      }

      utils.report({
        message: messages.expected,
        messageArgs: [functionName, pattern],
        node: atRule,
        result,
        ruleName,
        word: functionName
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
