"use strict";

const { utils } = require("stylelint");
const { isRegExp, isString } = require("../../utils/validateTypes");
const namespace = require("../../utils/namespace");
const optionsHaveIgnored = require("../../utils/optionsHaveIgnored");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("dollar-variable-pattern");

const messages = utils.ruleMessages(ruleName, {
  expected: (variableName, pattern) =>
    `Expected "${variableName}" to match pattern "${pattern}"`
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(pattern, options) {
  return (root, result) => {
    const validOptions = utils.validateOptions(
      result,
      ruleName,
      {
        actual: pattern,
        possible: [isRegExp, isString]
      },
      {
        actual: options,
        possible: {
          ignore: ["local", "global"]
        },
        optional: true
      }
    );

    if (!validOptions) {
      return;
    }

    const regexpPattern = isString(pattern) ? new RegExp(pattern) : pattern;

    root.walkDecls(decl => {
      const { prop } = decl;

      if (prop[0] !== "$") {
        return;
      }

      // If local or global variables need to be ignored
      if (
        (optionsHaveIgnored(options, "global") &&
          decl.parent.type === "root") ||
        (optionsHaveIgnored(options, "local") && decl.parent.type !== "root")
      ) {
        return;
      }

      const variableName = prop.slice(1);

      if (regexpPattern.test(variableName)) {
        return;
      }

      utils.report({
        message: messages.expected,
        messageArgs: [variableName, pattern],
        node: decl,
        result,
        ruleName,
        word: prop
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
