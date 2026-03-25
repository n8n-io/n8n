"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("at-if-no-null");

const messages = utils.ruleMessages(ruleName, {
  equals_null: "Expected @if not statement rather than @if statement == null",
  not_equals_null: "Expected @if statement rather than @if statement != null"
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(expectation) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: expectation
    });

    if (!validOptions) {
      return;
    }

    root.walkAtRules("if", atrule => {
      const { params } = atrule;

      // If rule != null and (expr), skip
      if (params.match(/.* != null and .*/)) {
        return;
      }

      if (params.match(/.* == null[ \t]*\)?/)) {
        utils.report({
          message: messages.equals_null,
          node: atrule,
          result,
          ruleName,
          word: params
        });
      } else if (params.match(/.* != null[ \t]*\)?/)) {
        utils.report({
          message: messages.not_equals_null,
          node: atrule,
          result,
          ruleName,
          word: params
        });
      }
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
