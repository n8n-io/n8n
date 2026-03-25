"use strict";

const { utils } = require("stylelint");
const atRuleParamIndex = require("../../utils/atRuleParamIndex");
const optionsHaveIgnored = require("../../utils/optionsHaveIgnored");
const {
  parseFunctionArguments
} = require("../../utils/parseFunctionArguments");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("at-mixin-named-arguments");

const messages = utils.ruleMessages(ruleName, {
  expected: "Expected a named parameter to be used in at-include call",
  rejected: "Unexpected a named parameter in at-include call"
});

const meta = {
  url: ruleUrl(ruleName)
};

const hasArgumentsRegExp = /\((.*)\)$/;
const isScssVarRegExp = /^\$\S*/;

function rule(expectation, options) {
  return (root, result) => {
    const validOptions = utils.validateOptions(
      result,
      ruleName,
      {
        actual: expectation,
        possible: ["always", "never"]
      },
      {
        actual: options,
        possible: {
          ignore: ["single-argument"]
        },
        optional: true
      }
    );

    if (!validOptions) {
      return;
    }

    const shouldIgnoreSingleArgument = optionsHaveIgnored(
      options,
      "single-argument"
    );

    root.walkAtRules("include", atRule => {
      const argsString = atRule.params
        .replace(/\n/g, " ")
        .match(hasArgumentsRegExp);

      // Ignore @include that does not contain arguments.
      if (
        !argsString ||
        argsString.index === -1 ||
        argsString[0].length === 2
      ) {
        return;
      }

      const mixinArgs = parseFunctionArguments(atRule.params);

      if (mixinArgs.length === 0) return;
      if (mixinArgs.length === 1 && shouldIgnoreSingleArgument) return;

      const baseIndex = atRuleParamIndex(atRule);

      mixinArgs.forEach(({ key, index, endIndex }) => {
        switch (expectation) {
          case "never": {
            if (!key) {
              return;
            }

            utils.report({
              message: messages.rejected,
              node: atRule,
              result,
              ruleName,
              index: baseIndex + index,
              endIndex: baseIndex + endIndex
            });
            break;
          }

          case "always": {
            if (key && isScssVarRegExp.test(key)) {
              return;
            }

            utils.report({
              message: messages.expected,
              node: atRule,
              result,
              ruleName,
              index: baseIndex + index,
              endIndex: baseIndex + endIndex
            });
            break;
          }
        }
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
