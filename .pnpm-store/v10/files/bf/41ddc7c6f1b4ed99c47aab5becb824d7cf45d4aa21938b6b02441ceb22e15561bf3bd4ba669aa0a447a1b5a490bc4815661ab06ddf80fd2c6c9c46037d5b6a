"use strict";

const { utils } = require("stylelint");
const { isRegExp, isString } = require("../../utils/validateTypes");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");
const valueParser = require("postcss-value-parser");
const isNativeCssFunction = require("../../utils/isNativeCssFunction");

const ruleName = namespace("function-disallowed-list");

const messages = utils.ruleMessages(ruleName, {
  rejected: func => `Unexpected function "${func}"`
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(disallowedOption) {
  const disallowedFunctions = [].concat(disallowedOption);

  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: disallowedOption,
      possible: [isString, isRegExp]
    });

    if (!validOptions) {
      return;
    }

    // Shared check logic: find disallowed functions in a value string
    function checkValue(value, reportNode) {
      if (!value) return;

      valueParser(value).walk(valueNode => {
        if (
          valueNode.type !== "function" ||
          isNativeCssFunction(valueNode.value) ||
          valueNode.value === ""
        ) {
          return;
        }

        const hasNamespace = valueNode.value.indexOf(".");
        const nameWithoutNamespace =
          hasNamespace > -1
            ? valueNode.value.slice(hasNamespace + 1)
            : valueNode.value;
        disallowedFunctions.forEach(functionName => {
          if (
            (isString(functionName) && nameWithoutNamespace === functionName) ||
            (isRegExp(functionName) && nameWithoutNamespace.match(functionName))
          ) {
            utils.report({
              message: messages.rejected(nameWithoutNamespace),
              node: reportNode,
              word: nameWithoutNamespace,
              result,
              ruleName
            });
          }
        });
      });
    }

    // Original logic: check in declaration values
    root.walkDecls(decl => {
      checkValue(decl.value, decl);
    });

    // New: check in @return expressions
    root.walkAtRules("return", atRule => {
      checkValue(atRule.params, atRule);
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
