"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("at-mixin-argumentless-call-parentheses");

const messages = utils.ruleMessages(ruleName, {
  expected: mixin => `Expected parentheses in mixin "${mixin}" call`,
  rejected: mixin =>
    `Unexpected parentheses in argumentless mixin "${mixin}" call`
});

const meta = {
  url: ruleUrl(ruleName),
  fixable: true
};

function rule(value) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: value,
      possible: ["always", "never"]
    });

    if (!validOptions) {
      return;
    }

    root.walkAtRules("include", mixinCall => {
      // Remove the "using (...)" part of the mixin call if present and save it for later.
      // We only care about whether there are parentheses after the mixin name and before any "using" clause.
      // Note that the mixin name itself can be "using" or contain "using".
      const usingClauseRegex = /([) ]+)(\busing\s*\([^)]+\)+\s*)$/;
      const usingClauseMatch = mixinCall.params.match(usingClauseRegex);
      const usingClause = usingClauseMatch?.[2] ?? "";

      const mixinCallParams = mixinCall.params
        .replace(usingClauseRegex, "$1")
        .trim();

      // If it is "No parens in argumentless calls"
      if (value === "never" && mixinCallParams.search(/\(\s*\)\s*$/) === -1) {
        return;
      }

      // If it is "Always use parens"
      if (value === "always" && mixinCallParams.search(/\(/) !== -1) {
        return;
      }

      const fix = () => {
        if (value === "always") {
          mixinCall.params = `${mixinCallParams}()`;
        } else {
          mixinCall.params = mixinCallParams.replace(/\s*\([\s\S]*?\)\s*$/, "");
        }

        // Restore the "using (...)" part if it was present.
        mixinCall.params += usingClause ? ` ${usingClause}` : "";
      };

      const mixinName = /\s*(\S*?)\s*(?:\(|$)/.exec(mixinCallParams)[1];

      utils.report({
        message:
          messages[value === "never" ? "rejected" : "expected"](mixinName),
        node: mixinCall,
        result,
        ruleName,
        word: mixinName,
        fix
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
