"use strict";

const { utils } = require("stylelint");
const hasEmptyLine = require("../../utils/hasEmptyLine");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("at-else-empty-line-before");

const messages = utils.ruleMessages(ruleName, {
  rejected: "Unexpected empty line before @else"
});

const meta = {
  url: ruleUrl(ruleName),
  fixable: true
};

function rule(expectation) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: expectation,
      possible: ["never"]
    });

    if (!validOptions) {
      return;
    }

    root.walkAtRules("else", atrule => {
      // Don't need to ignore "the first rule in a stylesheet", etc, cases
      // because @else should always go after @if

      if (!hasEmptyLine(atrule.raws.before)) {
        return;
      }

      const fix = () => {
        atrule.raws.before = " ";
      };

      utils.report({
        message: messages.rejected,
        node: atrule,
        result,
        ruleName,
        word: `@${atrule.name}`,
        fix
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
