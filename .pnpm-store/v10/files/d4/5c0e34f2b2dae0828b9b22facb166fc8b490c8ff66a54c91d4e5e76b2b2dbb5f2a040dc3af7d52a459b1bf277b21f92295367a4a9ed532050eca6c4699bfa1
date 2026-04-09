"use strict";

const { utils } = require("stylelint");
const atRuleParamIndex = require("../../utils/atRuleParamIndex");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("at-use-no-redundant-alias");

const messages = utils.ruleMessages(ruleName, {
  rejected: "Unexpected redundant namespace."
});

const meta = {
  url: ruleUrl(ruleName),
  fixable: true
};

function getDefaultNamespace(module) {
  const namespace = module.match(/([^/:]+)$/)?.[1];
  return namespace ? namespace.replace(/\.[^.]|["]+$/, "") : "";
}

function separateEachParams(paramString) {
  const parts = paramString.replace(/"|'/g, "").split(/\s+as\s+|\s+with\s+/);
  if (parts.length < 2) return;
  return parts;
}

function rule(actual) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, { actual });

    if (!validOptions) {
      return;
    }

    root.walkAtRules("use", atRule => {
      const parts = separateEachParams(atRule.params);
      if (parts && getDefaultNamespace(parts[0]) === parts[1]) {
        const fix = () => {
          atRule.after(atRule.toString().replace(/\s*as\s* [^\s*]+\s*/, " "));
          atRule.next().raws = atRule.raws;
          atRule.remove();
        };

        const matchedAlias = atRule.params.match(/as\s+\S+/);
        if (!matchedAlias) return;

        const index = atRuleParamIndex(atRule) + matchedAlias.index;
        utils.report({
          message: messages.rejected,
          node: atRule,
          result,
          ruleName,
          index,
          endIndex: index + matchedAlias[0].length,
          fix
        });
      }
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
