"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("no-dollar-variables");

const messages = utils.ruleMessages(ruleName, {
  rejected: variable => `Unexpected dollar variable ${variable}`
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(value) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: value
    });

    if (!validOptions) {
      return;
    }

    root.walkDecls(decl => {
      if (decl.prop[0] !== "$") {
        return;
      }

      utils.report({
        message: messages.rejected(decl.prop),
        node: decl,
        result,
        ruleName,
        word: decl.prop
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
