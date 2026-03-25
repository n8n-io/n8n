"use strict";

const valueParser = require("postcss-value-parser");
const { utils } = require("stylelint");
const declarationValueIndex = require("../../utils/declarationValueIndex");
const isNativeCssFunction = require("../../utils/isNativeCssFunction");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("function-unquote-no-unquoted-strings-inside");

const messages = utils.ruleMessages(ruleName, {
  rejected: "Unquote function used with an already-unquoted string"
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(primary, _, context) {
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

        // Verify we're only looking at unquote() calls.
        if (node.value !== "unquote") {
          return;
        }

        // Report error if first character is a quote.
        // postcss-value-parser represents quoted strings as type 'string' (as opposed to word)
        if (
          (!node.nodes[0].quote && node.nodes[0].value[0] !== "$") ||
          vars[node.nodes[0].value] === "word"
        ) {
          if (context.fix) {
            decl.value = decl.value.replace(/unquote\((.*)\)/, "$1");
          } else {
            const index = declarationValueIndex(decl) + node.sourceIndex;
            utils.report({
              message: messages.rejected,
              node: decl,
              index,
              endIndex: index + node.value.length,
              result,
              ruleName
            });
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
