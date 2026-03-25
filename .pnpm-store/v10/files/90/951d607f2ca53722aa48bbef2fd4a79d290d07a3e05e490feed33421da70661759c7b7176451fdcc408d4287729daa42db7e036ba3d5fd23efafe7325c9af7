"use strict";

const { utils } = require("stylelint");
const { isRegExp, isString } = require("../../utils/validateTypes");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("at-mixin-pattern");

const messages = utils.ruleMessages(ruleName, {
  expected: "Expected @mixin name to match specified pattern"
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

    root.walkAtRules("mixin", atRule => {
      // Stripping the mixin of its arguments
      const mixinName = atRule.params.replace(/(\s*)\([\s\S]*\)/g, "");

      if (regexpPattern.test(mixinName)) {
        return;
      }

      utils.report({
        message: messages.expected,
        node: atRule,
        result,
        ruleName,
        word: mixinName
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
