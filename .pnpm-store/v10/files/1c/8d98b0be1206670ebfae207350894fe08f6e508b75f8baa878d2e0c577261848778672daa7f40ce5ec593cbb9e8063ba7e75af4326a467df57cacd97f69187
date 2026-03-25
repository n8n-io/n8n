"use strict";

const valueParser = require("postcss-value-parser");
const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("dollar-variable-no-missing-interpolation");

const messages = utils.ruleMessages(ruleName, {
  rejected: (n, v) =>
    `Expected variable ${v} to be interpolated when using it with ${n}`
});

const meta = {
  url: ruleUrl(ruleName)
};

// https://developer.mozilla.org/en/docs/Web/CSS/custom-ident#Lists_of_excluded_values
const customIdentProps = [
  "animation",
  "animation-name",
  "counter-reset",
  "counter-increment",
  "list-style-type",
  "will-change"
];

// https://developer.mozilla.org/en/docs/Web/CSS/At-rule
const customIdentAtRules = ["counter-style", "keyframes", "supports"];

function isAtRule(type) {
  return type === "atrule";
}

function isCustomIdentAtRule(node) {
  return isAtRule(node.type) && customIdentAtRules.includes(node.name);
}

function isCustomIdentProp(node) {
  return customIdentProps.includes(node.prop);
}

function isAtSupports(node) {
  return isAtRule(node.type) && node.name === "supports";
}

function isSassVar(value) {
  return value[0] === "$";
}

function isStringVal(value) {
  return /^(["']).*(["'])$/.test(value);
}

function toRegex(arr) {
  return new RegExp(`(${arr.join("|")})`);
}

function rule(actual) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, { actual });

    if (!validOptions) {
      return;
    }

    const stringVars = [];
    const vars = [];

    function findVars(node) {
      node.walkDecls(decl => {
        const { prop, value } = decl;

        if (!isSassVar(prop) || vars.includes(prop)) {
          return;
        }

        if (isStringVal(value)) {
          stringVars.push(prop);
        }

        vars.push(prop);
      });
    }

    findVars(root);
    root.walkRules(findVars);

    if (!vars.length) {
      return;
    }

    function shouldReport(node, value) {
      if (isAtSupports(node) || isCustomIdentProp(node)) {
        return stringVars.includes(value);
      }

      if (isCustomIdentAtRule(node)) {
        return vars.includes(value);
      }

      return false;
    }

    function report(node, value) {
      const { name, prop, type } = node;
      const nodeName = isAtRule(type) ? `@${name}` : prop;

      utils.report({
        ruleName,
        result,
        node,
        message: messages.rejected(nodeName, value),
        word: value
      });
    }

    function exitEarly(node) {
      return node.type !== "word" || !node.value;
    }

    function walkValues(node, value) {
      valueParser(value).walk(valNode => {
        const { value } = valNode;

        if (exitEarly(valNode) || !shouldReport(node, value)) {
          return;
        }

        report(node, value);
      });
    }

    root.walkDecls(toRegex(customIdentProps), decl => {
      walkValues(decl, decl.value);
    });

    root.walkAtRules(toRegex(customIdentAtRules), atRule => {
      walkValues(atRule, atRule.params);
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
