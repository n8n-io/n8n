"use strict";

const { utils } = require("stylelint");
const { isRegExp, isString } = require("../../utils/validateTypes");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const sassAtRules = [
  "at-root",
  "content",
  "debug",
  "each",
  "else",
  "else if",
  "error",
  "extend",
  "for",
  "forward",
  "function",
  "if",
  "import",
  "include",
  "media",
  "mixin",
  "return",
  "use",
  "warn",
  "while"
];

const ruleToCheckAgainst = "at-rule-no-unknown";

const ruleName = namespace(ruleToCheckAgainst);

const messages = utils.ruleMessages(ruleName, {
  rejected: atRule => `Unexpected unknown at-rule "${atRule}"`
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(primaryOption, secondaryOptions) {
  return async (root, result) => {
    const validOptions = utils.validateOptions(
      result,
      ruleName,
      {
        actual: primaryOption
      },
      {
        actual: secondaryOptions,
        possible: {
          ignoreAtRules: [isRegExp, isString]
        },
        optional: true
      }
    );

    if (!validOptions) {
      return;
    }

    const optionsAtRules = secondaryOptions && secondaryOptions.ignoreAtRules;
    const ignoreAtRules = sassAtRules.concat(optionsAtRules || []);
    const defaultedOptions = Object.assign({}, secondaryOptions, {
      ignoreAtRules
    });

    await utils.checkAgainstRule(
      {
        ruleName: ruleToCheckAgainst,
        ruleSettings: [primaryOption, defaultedOptions],
        root
      },
      warning => {
        const name = warning.node.name;

        if (!ignoreAtRules.includes(name)) {
          utils.report({
            message: messages.rejected(`@${name}`),
            ruleName,
            result,
            node: warning.node,
            start: { line: warning.line, column: warning.column },
            end: { line: warning.endLine, column: warning.endColumn }
          });
        }
      }
    );
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
