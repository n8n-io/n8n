"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("dollar-variable-no-namespaced-assignment");

const messages = utils.ruleMessages(ruleName, {
  rejected: "Unexpected assignment to a namespaced $ variable"
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

    root.walkDecls(decl => {
      if (!/^[^$.]+\.\$./.test(decl.prop)) {
        return;
      }

      utils.report({
        message: messages.rejected,
        node: decl,
        result,
        ruleName
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
