"use strict";

const isCustomPropertySet = require("../../utils/isCustomPropertySet");
const isStandardSyntaxProperty = require("../../utils/isStandardSyntaxProperty");
const isStandardSyntaxDeclaration = require("../../utils/isStandardSyntaxDeclaration");
const isType = require("../../utils/isType");
const optionsMatches = require("../../utils/optionsMatches");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");
const hasInterpolation = require("../../utils/hasInterpolation");
const properties = require("known-css-properties").all;

const { utils } = require("stylelint");
const { isBoolean, isRegExp, isString } = require("../../utils/validateTypes");

const ruleName = namespace("property-no-unknown");

function vendorPrefix(node) {
  const match = node.match(/^(-\w+-)/);
  if (match) {
    return match[0] || "";
  }
  return "";
}

const messages = utils.ruleMessages(ruleName, {
  rejected: property => `Unexpected unknown property "${property}"`
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(primary, secondaryOptions) {
  const allValidProperties = new Set(properties);

  return (root, result) => {
    const validOptions = utils.validateOptions(
      result,
      ruleName,
      { actual: primary },
      {
        actual: secondaryOptions,
        possible: {
          ignoreProperties: [isString, isRegExp],
          checkPrefixed: [isBoolean],
          ignoreSelectors: [isString, isRegExp],
          ignoreAtRules: [isString, isRegExp]
        },
        optional: true
      }
    );

    if (!validOptions) {
      return;
    }

    const shouldCheckPrefixed =
      secondaryOptions && secondaryOptions.checkPrefixed;

    root.walkDecls(decl => {
      const hasNamespace = decl.prop.indexOf(".");
      let prop =
        hasNamespace > -1 ? decl.prop.slice(hasNamespace + 1) : decl.prop;

      if (
        !isStandardSyntaxProperty(prop) ||
        !isStandardSyntaxDeclaration(decl) ||
        isCustomPropertySet(prop) ||
        prop.startsWith("--") ||
        hasInterpolation(prop) ||
        (!shouldCheckPrefixed && vendorPrefix(prop)) ||
        optionsMatches(secondaryOptions, "ignoreProperties", prop)
      ) {
        return;
      }

      const parent = decl.parent;

      if (
        parent &&
        isType(parent, "rule") &&
        optionsMatches(secondaryOptions, "ignoreSelectors", parent.selector)
      ) {
        return;
      }

      let node = parent;

      while (node && node.type !== "root") {
        if (
          isType(node, "atrule") &&
          optionsMatches(secondaryOptions, "ignoreAtRules", node.name)
        ) {
          return;
        }

        node = node.parent;
      }

      // Nested properties
      let pointer = parent;
      while (
        pointer &&
        isType(pointer, "rule") &&
        pointer.selector &&
        pointer.selector[pointer.selector.length - 1] === ":" &&
        pointer.selector.substring(0, 2) !== "--"
      ) {
        prop = pointer.selector.replace(":", "") + "-" + prop;
        pointer = pointer.parent;
      }

      // Support `nested-property:value { property: value};
      while (
        pointer &&
        isType(pointer, "decl") &&
        pointer.isNested &&
        pointer.prop
      ) {
        prop = pointer.prop + "-" + prop;
        pointer = pointer.parent;
      }

      if (allValidProperties.has(prop.toLowerCase())) {
        return;
      }

      utils.report({
        message: messages.rejected(prop),
        node: decl,
        word: prop,
        result,
        ruleName
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;
module.exports = rule;
