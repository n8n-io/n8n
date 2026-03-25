"use strict";

const {
  isAttribute,
  isClassName,
  isCombinator,
  isIdentifier,
  isPseudoClass,
  isPseudoElement
} = require("postcss-selector-parser");
const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const parseSelector = require("../../utils/parseSelector");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("selector-no-union-class-name");

const messages = utils.ruleMessages(ruleName, {
  rejected: "Unexpected union class name with the parent selector (&)"
});

const meta = {
  url: ruleUrl(ruleName)
};

const validNestingTypes = [
  isClassName,
  isCombinator,
  isAttribute,
  isIdentifier,
  isPseudoClass,
  isPseudoElement
];

function rule(actual) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, { actual });

    if (!validOptions) {
      return;
    }

    root.walkRules(/&/, rule => {
      const parentNodes = [];

      const selector = getSelectorFromRule(rule.parent);

      if (selector) {
        parseSelector(selector, result, rule, fullSelector => {
          fullSelector.walk(node => parentNodes.push(node));
        });
      }

      if (parentNodes.length === 0) return;

      const lastParentNode = parentNodes[parentNodes.length - 1];

      if (!isClassName(lastParentNode)) return;

      parseSelector(rule.selector, result, rule, fullSelector => {
        fullSelector.walkNesting(node => {
          const next = node.next();

          if (!next) return;

          if (validNestingTypes.some(isType => isType(next))) return;

          utils.report({
            ruleName,
            result,
            node: rule,
            message: messages.rejected,
            index: node.sourceIndex,
            endIndex: node.sourceIndex + rule.selector.length
          });
        });
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

/**
 * Searches for the closest rule which
 * has a selector and returns the selector
 * @returns {string|undefined}
 */
function getSelectorFromRule(rule) {
  // All non at-rules have their own selector
  if (rule.selector !== undefined) {
    return rule.selector;
  }

  // At-rules like @mixin don't have a selector themself
  // but their parents might have one
  if (rule.parent) {
    return getSelectorFromRule(rule.parent);
  }
}

module.exports = rule;
