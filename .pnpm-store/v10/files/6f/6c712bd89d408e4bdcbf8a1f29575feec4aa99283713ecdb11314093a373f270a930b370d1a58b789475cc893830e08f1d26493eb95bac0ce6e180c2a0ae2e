"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("no-unused-private-members");

const messages = utils.ruleMessages(ruleName, {
  expected: privateMember =>
    `Expected usage of private member "${privateMember}" within the stylesheet`
});

const meta = {
  url: ruleUrl(ruleName)
};

function extractFunctionName(inputString) {
  const matches = [...inputString.matchAll(/(?:\s*([\w\-$]+)\s*)?\(/g)].flat();
  return matches;
}

function getPrivateMembers(inputString) {
  const matches = inputString.match(/([$%]*[-_]+[\w\d-_]+)/g);
  return matches;
}

function matchUnderscores(inputString) {
  return inputString.replaceAll("_", "-");
}

function isWithinMixin(node) {
  let parent = node.parent;
  while (parent) {
    if (parent.type === "atrule" && parent.name === "mixin") {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

function rule(primaryOption) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: primaryOption
    });

    if (!validOptions) {
      return;
    }

    const privateMembers = {
      selectors: new Map(),
      variables: new Map(),
      functions: new Map(),
      mixins: new Map()
    };

    // Skip for files using @import.
    let hasImport = false;
    root.walkAtRules("import", () => (hasImport = true));
    if (hasImport) return;

    root.walk(node => {
      // Private placeholder selectors
      const isPrivatePlaceholderSelector =
        node.type === "rule" &&
        (node.selector.includes("%-") || node.selector.includes("%_"));
      if (isPrivatePlaceholderSelector) {
        const selectors = node.selector
          .split(/:|\./g)
          .filter(
            selector => selector.startsWith("%-") | selector.includes("%_")
          );
        selectors.forEach(selector => {
          if (!privateMembers.selectors.has(selector)) {
            privateMembers.selectors.set(matchUnderscores(selector), node);
          }
        });
      }

      // Private variables
      const isPrivateVariable =
        node.type === "decl" &&
        (node.prop.startsWith("$-") || node.prop.startsWith("$_")) &&
        !isWithinMixin(node);
      if (isPrivateVariable) {
        privateMembers.variables.set(matchUnderscores(node.prop), node);
      }

      // Private functions
      const isPrivateFunction =
        node.type === "atrule" &&
        node.name === "function" &&
        (node.params.startsWith("-") || node.params.startsWith("_"));
      if (isPrivateFunction) {
        const match = extractFunctionName(node.params);
        if (match.length < 2) return;
        privateMembers.functions.set(matchUnderscores(match[1]), node);
      }

      // Private mixins
      const isPrivateMixin =
        node.type === "atrule" &&
        node.name === "mixin" &&
        (node.params.startsWith("-") || node.params.startsWith("_"));
      if (isPrivateMixin) {
        const match = extractFunctionName(node.params);
        privateMembers.mixins.set(
          matchUnderscores(match.length < 2 ? node.params : match[1]),
          node
        );
      }
    });

    root.walk(node => {
      if (node.type === "atrule" || node.type === "rule") {
        const value = node.type === "rule" ? node.selector : node.params;
        const valuePrivateMembers = getPrivateMembers(value);
        if (valuePrivateMembers) {
          valuePrivateMembers.forEach(privateMember => {
            privateMember = matchUnderscores(privateMember);
            if (privateMembers.mixins.get(privateMember) !== node)
              privateMembers.mixins.delete(privateMember);
            if (
              privateMembers.selectors.get(privateMember) !== node &&
              node.type === "atrule"
            )
              privateMembers.selectors.delete(privateMember);
            if (privateMembers.variables.get(privateMember) !== node)
              privateMembers.variables.delete(privateMember);
            if (privateMembers.functions.get(privateMember) !== node)
              privateMembers.functions.delete(privateMember);
          });
        }
      }
    });

    root.walkDecls(decls => {
      const valuePrivateMembers = getPrivateMembers(decls.value);
      if (valuePrivateMembers) {
        valuePrivateMembers.forEach(privateMember => {
          privateMember = matchUnderscores(privateMember);
          if (privateMembers.variables.get(privateMember) !== decls)
            privateMembers.variables.delete(privateMember);
          if (privateMembers.functions.get(privateMember) !== decls)
            privateMembers.functions.delete(privateMember);
        });
      }
    });

    for (const types in privateMembers) {
      for (const [key, node] of privateMembers[types].entries()) {
        utils.report({
          message: messages.expected(node.type === "decl" ? node.prop : key),
          node,
          result,
          ruleName
        });
      }
    }
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
