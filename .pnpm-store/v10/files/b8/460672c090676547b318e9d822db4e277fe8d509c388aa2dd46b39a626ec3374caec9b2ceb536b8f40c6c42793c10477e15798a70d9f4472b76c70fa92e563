"use strict";

const { utils } = require("stylelint");
const isStandardSyntaxProperty = require("../../utils/isStandardSyntaxProperty");
const optionsHaveException = require("../../utils/optionsHaveException");
const namespace = require("../../utils/namespace");
const parseNestedPropRoot = require("../../utils/parseNestedPropRoot");
const ruleUrl = require("../../utils/ruleUrl");

const hasOwnProp = Object.prototype.hasOwnProperty;

const ruleName = namespace("declaration-nested-properties");

const messages = utils.ruleMessages(ruleName, {
  expected: prop => `Expected property "${prop}" to be in a nested form`,
  rejected: prop => `Unexpected nested property "${prop}"`
});

const meta = {
  url: ruleUrl(ruleName)
};

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
          except: ["only-of-namespace"]
        },
        optional: true
      }
    );

    if (!validOptions) {
      return;
    }

    if (expectation === "always") {
      root.walk(item => {
        if (item.type !== "rule" && item.type !== "atrule") {
          return;
        }

        const warningCandidates = {};

        item.each(decl => {
          const { prop, type, selector } = decl;

          // Looking for namespaced non-nested properties
          // Namespaced prop is basically a prop with a `-` in a name, e.g. `margin-top`
          if (type === "decl") {
            if (!isStandardSyntaxProperty(prop)) {
              return;
            }

            // Add simple namespaced prop decls to warningCandidates.ns
            // (prop names with browser prefixes are ignored)
            const seekNamespace = /^([a-zA-Z\d]+)-/.exec(prop);

            if (seekNamespace && seekNamespace[1]) {
              const ns = seekNamespace[1];

              if (!hasOwnProp.call(warningCandidates, ns)) {
                warningCandidates[ns] = [];
              }

              warningCandidates[ns].push({ node: decl });
            }
          }

          // Nested props, `prop: [value] { <nested decls> }`
          if (type === "rule" || (type === "decl" && decl.isNested)) {
            // `background:red {` - selector;
            // `background: red {` - nested prop; space is decisive here
            const testForProp = parseNestedPropRoot(
              selector || decl.toString()
            );

            if (testForProp && testForProp.propName !== undefined) {
              const ns = testForProp.propName.value;

              if (!hasOwnProp.call(warningCandidates, ns)) {
                warningCandidates[ns] = [];
              }

              warningCandidates[ns].push({
                node: decl,
                nested: true
              });
            }
          }
        });

        // Now check if the found properties deserve warnings
        Object.keys(warningCandidates).forEach(namespace => {
          const exceptIfOnlyOfNs = optionsHaveException(
            options,
            "only-of-namespace"
          );
          const moreThanOneProp = warningCandidates[namespace].length > 1;

          warningCandidates[namespace].forEach(candidate => {
            if (candidate.nested === true) {
              if (exceptIfOnlyOfNs) {
                // If there is only one prop inside a nested prop - warn (reverse "always")
                if (
                  candidate.nested === true &&
                  candidate.node.nodes.length === 1
                ) {
                  utils.report({
                    message: messages.rejected(namespace),
                    node: candidate.node,
                    result,
                    ruleName
                  });
                }
              }
            } else {
              // Don't warn on non-nested namespaced props if there are
              // less than 2 of them, and except: "only-of-namespace" is set
              if (exceptIfOnlyOfNs && !moreThanOneProp) {
                return;
              }

              utils.report({
                message: messages.expected(candidate.node.prop),
                node: candidate.node,
                result,
                ruleName
              });
            }
          });
        });
      });
    } else if (expectation === "never") {
      root.walk(item => {
        // Just check if there are ANY nested props
        if (item.type === "rule") {
          // `background:red {` - selector;
          // `background: red {` - nested prop; space is decisive here
          const testForProp = parseNestedPropRoot(item.selector);

          if (testForProp && testForProp.propName !== undefined) {
            utils.report({
              message: messages.rejected(testForProp.propName.value),
              result,
              ruleName,
              node: item
            });
          }
        }
      });
    }
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
