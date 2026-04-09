"use strict";

const resolveNestedSelector = require("postcss-resolve-nested-selector");
const { utils } = require("stylelint");
const { isRegExp, isString } = require("../../utils/validateTypes");
const hasInterpolatingAmpersand = require("../../utils/hasInterpolatingAmpersand");
const isStandardRule = require("../../utils/isStandardRule");
const isStandardSelector = require("../../utils/isStandardSelector");
const parseSelector = require("../../utils/parseSelector");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("percent-placeholder-pattern");

const messages = utils.ruleMessages(ruleName, {
  expected: (placeholderName, pattern) =>
    `Expected "${placeholderName}" to match pattern "${pattern}"`
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(pattern) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: pattern,
      possible: [isRegExp, isString]
    });

    if (!validOptions) {
      return;
    }

    const regexpPattern = isString(pattern) ? new RegExp(pattern) : pattern;

    // Checking placeholder definitions (looking among regular rules)
    root.walkRules(rule => {
      const { selector } = rule;

      // Just a shorthand for calling `parseSelector`
      function parse(selector) {
        parseSelector(selector, result, rule, s => checkSelector(s, rule));
      }

      // If it's a custom prop or a less mixin
      if (!isStandardRule(rule)) {
        return;
      }

      // If the selector has interpolation
      if (!isStandardSelector(selector)) {
        return;
      }

      // Nested selectors are processed in steps, as nesting levels are resolved.
      // Here we skip processing intermediate parts of selectors (to process only fully resolved selectors)
      // if (rule.nodes.some(node => node.type === "rule" || node.type === "atrule")) { return }

      // Only resolve selectors that have an interpolating "&"
      if (hasInterpolatingAmpersand(selector)) {
        resolveNestedSelector(selector, rule).forEach(parse);
      } else {
        parse(selector);
      }
    });

    function checkSelector(fullSelector, rule) {
      // postcss-selector-parser gives %placeholders' nodes a "tag" type
      fullSelector.walkTags(compoundSelector => {
        const { value } = compoundSelector;

        if (value[0] !== "%") {
          return;
        }

        const placeholderName = value.slice(1);

        if (regexpPattern.test(placeholderName)) {
          return;
        }

        utils.report({
          result,
          ruleName,
          message: messages.expected,
          messageArgs: [placeholderName, pattern],
          node: rule,
          word: value
        });
      });
    }
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
