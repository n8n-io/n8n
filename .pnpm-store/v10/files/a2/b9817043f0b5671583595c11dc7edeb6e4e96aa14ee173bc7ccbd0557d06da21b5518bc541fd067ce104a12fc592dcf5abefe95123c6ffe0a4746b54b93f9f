"use strict";

const valueParser = require("postcss-value-parser");
const { utils } = require("stylelint");
const declarationValueIndex = require("../../utils/declarationValueIndex");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("function-color-relative");

const messages = utils.ruleMessages(ruleName, {
  expected: "Expected the scale-color function to be used"
});

const meta = {
  url: ruleUrl(ruleName)
};

const functionNames = new Set([
  "saturate",
  "desaturate",
  "darken",
  "lighten",
  "opacify",
  "fade-in",
  "transparentize",
  "fade-out"
]);

function isColorFunction(node) {
  return node.type === "function" && functionNames.has(node.value);
}

function rule(primary) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: primary
    });

    if (!validOptions) {
      return;
    }

    root.walkDecls(decl => {
      const declValueIndex = declarationValueIndex(decl);

      valueParser(decl.value).walk(node => {
        // Verify that we're only looking at functions.
        if (node.type !== "function" || node.value === "") {
          return;
        }

        const isFilter = decl.prop === "filter";
        const isSassColorFunction = !isFilter && isColorFunction(node);
        const isDSFilterColorFunction =
          isFilter &&
          node.value === "drop-shadow" &&
          node.nodes.some(isColorFunction);

        if (isSassColorFunction || isDSFilterColorFunction) {
          const funcNodes = isDSFilterColorFunction
            ? node.nodes.filter(isColorFunction)
            : [node];

          funcNodes.forEach(funcNode => {
            const index = declValueIndex + funcNode.sourceIndex;
            utils.report({
              message: messages.expected,
              node: decl,
              index,
              endIndex: index + funcNode.value.length,
              result,
              ruleName
            });
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
