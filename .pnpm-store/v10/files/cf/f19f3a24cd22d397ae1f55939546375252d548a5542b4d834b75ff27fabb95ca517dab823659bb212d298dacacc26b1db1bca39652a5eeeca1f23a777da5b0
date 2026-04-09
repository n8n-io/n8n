"use strict";

const valueParser = require("postcss-value-parser");
const { utils } = require("stylelint");
const declarationValueIndex = require("../../utils/declarationValueIndex");
const isNativeCssFunction = require("../../utils/isNativeCssFunction");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("function-quote-no-quoted-strings-inside");

const messages = utils.ruleMessages(ruleName, {
  rejected: "Quote function used with an already-quoted string"
});

const meta = {
  url: ruleUrl(ruleName),
  fixable: true
};

function rule(primary) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: primary
    });

    if (!validOptions) {
      return;
    }

    // Setup variable naming.
    const vars = {};

    root.walkDecls(decl => {
      if (decl.prop[0] !== "$") {
        return;
      }

      valueParser(decl.value).walk(node => {
        vars[decl.prop] = node.type;
      });
    });

    root.walkDecls(decl => {
      valueParser(decl.value).walk(node => {
        // Verify that we're only looking at functions.
        if (
          node.type !== "function" ||
          isNativeCssFunction(node.value) ||
          node.value === ""
        ) {
          return;
        }

        // Verify we're only looking at quote() calls.
        if (node.value !== "quote") {
          return;
        }

        // Report error if first character is a quote.
        // postcss-value-parser represents quoted strings as type 'string' (as opposed to word)
        if (node.nodes[0].quote || vars[node.nodes[0].value] === "string") {
          const fix = () => {
            decl.value = decl.value.replace(/quote\((.*)\)/, "$1");
          };

          const index = declarationValueIndex(decl) + node.sourceIndex;
          utils.report({
            message: messages.rejected,
            node: decl,
            index,
            endIndex: index + node.value.length,
            result,
            ruleName,
            fix
          });
        }
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
