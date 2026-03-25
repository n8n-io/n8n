"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("block-no-redundant-nesting");

const messages = utils.ruleMessages(ruleName, {
  rejected: "Unexpected nesting for single child block"
});

const meta = {
  url: ruleUrl(ruleName)
};

function resolveNestedSelector(parentSelector, nestedSelector) {
  if (nestedSelector.includes("&")) {
    return nestedSelector.replace(/&/g, parentSelector);
  }
  return [parentSelector, nestedSelector].join(" ");
}

function processRuleNode(ruleNode, result, context) {
  if (ruleNode.nodes.length !== 1) {
    return;
  }

  const nestedRuleNode = ruleNode.nodes[0];
  if (
    nestedRuleNode.type !== "rule" ||
    nestedRuleNode.selector.endsWith(":") ||
    ruleNode.selectors.length !== 1 ||
    nestedRuleNode.selectors.length !== 1
  ) {
    return;
  }

  if (context.fix) {
    ruleNode.selector = resolveNestedSelector(
      ruleNode.selector,
      nestedRuleNode.selector
    );
    ruleNode.nodes = nestedRuleNode.nodes;
    ruleNode.raws.semicolon = nestedRuleNode.raws.semicolon;

    if (ruleNode.nodes.length === 1) {
      for (const rule of ruleNode.nodes) {
        rule.parent = ruleNode;
      }
      processRuleNode(ruleNode, result, context);
    }
    return;
  }

  utils.report({
    message: messages.rejected,
    node: nestedRuleNode,
    result,
    ruleName
  });
}

function rule(actual, _, context) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual
    });

    if (!validOptions) {
      return;
    }

    root.walkRules(ruleNode => processRuleNode(ruleNode, result, context));
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
