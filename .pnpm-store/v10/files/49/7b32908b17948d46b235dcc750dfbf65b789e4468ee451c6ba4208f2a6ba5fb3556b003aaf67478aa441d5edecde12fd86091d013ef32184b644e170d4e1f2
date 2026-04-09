"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("at-rule-conditional-no-parentheses");

const messages = utils.ruleMessages(ruleName, {
  rejected: "Unexpected () used to surround statements for @-rules"
});

const meta = {
  url: ruleUrl(ruleName),
  fixable: true
};

// postcss picks up else-if as else.
const conditional_rules = ["if", "while", "else"];

function report(atrule, result, fix) {
  utils.report({
    message: messages.rejected,
    node: atrule,
    result,
    ruleName,
    word: atrule.params.replace(/\bif\b/, ""), // Remove 'if' from '@else if'.
    fix
  });
}

function rule(primary) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: primary
    });

    if (!validOptions) {
      return;
    }

    root.walkAtRules(atrule => {
      // Check if this is a conditional rule.
      if (!conditional_rules.includes(atrule.name)) {
        return;
      }

      const fix = () => {
        const regex = /(if)? ?\((.*)\)/;

        // 2 regex groups: 'if ' and cond.
        const groups = atrule.params.match(regex).slice(1);

        if (atrule.name !== "else") {
          atrule.raws.afterName = "";
        }

        atrule.params = [...new Set(groups)].join(" ");
      };

      // Else uses a different regex
      // params are of format "`if (cond)` or `if cond`
      // instead of `(cond)` or `cond`"
      if (atrule.name === "else") {
        if (atrule.params.match(/ ?if ?\(.*\) ?$/)) {
          report(atrule, result, fix);
        }
      } else {
        if (atrule.params.trim().match(/^\(.*\)$/)) {
          report(atrule, result, fix);
        }
      }
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
