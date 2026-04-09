"use strict";

const valueParser = require("postcss-value-parser");
const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");
const validateTypes = require("../../utils/validateTypes");

const ruleName = namespace("dollar-variable-no-missing-interpolation");

const messages = utils.ruleMessages(ruleName, {
  rejected: (nodeName, variableName) =>
    `Expected variable ${variableName} to be interpolated when using it with ${nodeName}`
});

const meta = {
  url: ruleUrl(ruleName),
  fixable: true
};

const SCSS_VARIABLE_PATTERN = /([a-zA-Z0-9_-]+\.)?\$[a-zA-Z0-9_-]+/g;

const CUSTOM_IDENT_PROPERTIES = [
  "animation",
  "animation-name",
  "counter-reset",
  "counter-increment",
  "list-style-type",
  "will-change"
];

const CUSTOM_IDENT_AT_RULES = ["counter-style", "keyframes", "supports"];

function isAtRule(type) {
  return type === "atrule";
}

function isCustomIdentAtRule(node) {
  return isAtRule(node.type) && CUSTOM_IDENT_AT_RULES.includes(node.name);
}

function isCustomIdentProp(node) {
  return CUSTOM_IDENT_PROPERTIES.includes(node.prop);
}

function isAtSupports(node) {
  return isAtRule(node.type) && node.name === "supports";
}

function isCustomProperty(node) {
  return node.prop && node.prop.startsWith("--");
}

/**
 * Variables inside #{...} blocks are already interpolated and should not be flagged.
 * Example: "animation-name: #{$bar} $baz" - $bar is interpolated, $baz is not.
 * Handles nested blocks: #{outer(#{inner($var)})}
 */
function isInsideInterpolationBlock(value, variableIndex) {
  let depth = 0;
  let insideBlock = false;

  // Scan from the start of the value up to the variable position
  for (let i = 0; i < variableIndex; i++) {
    if (value[i] === "#" && value[i + 1] === "{") {
      depth++;
      insideBlock = true;
      i++; // Skip the '{' to avoid double-counting
    } else if (value[i] === "}") {
      depth--;
      if (depth === 0) {
        insideBlock = false;
      }
    }
  }

  return insideBlock && depth > 0;
}

function isSassVariable(value) {
  return value && value[0] === "$";
}

function isStringValue(value) {
  return /^(["']).*(["'])$/.test(value);
}

/**
 * Wrap uninterpolated SCSS variables with interpolation syntax.
 * Examples:
 *   "animation-name: $bar" → "animation-name: #{$bar}"
 *   "animation: $a 5s, $b 3s" → "animation: #{$a} 5s, #{$b} 3s"
 *   "--foo: variables.$someVariable" → "--foo: #{variables.$someVariable}"
 */
function wrapVariablesWithInterpolation(value) {
  let fixed = value;
  const matches = [...value.matchAll(SCSS_VARIABLE_PATTERN)];

  // Process matches in reverse order to maintain correct string indices.
  // If we processed left-to-right, wrapping "$a" would shift the indices
  // for "$b" in a string like "animation: $a 5s, $b 3s".
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const variable = match[0];
    const varIndex = match.index;

    // Skip variables that are already interpolated
    if (isInsideInterpolationBlock(value, varIndex)) {
      continue;
    }

    // Wrap the variable with interpolation syntax: $var → #{$var}
    fixed =
      fixed.slice(0, varIndex) +
      `#{${variable}}` +
      fixed.slice(varIndex + variable.length);
  }

  return fixed;
}

function createMatchingRegex(arr) {
  return new RegExp(`(${arr.join("|")})`);
}

/**
 * Collect all SCSS variables, separating string-valued ones for different reporting rules.
 */
function collectVariables(root) {
  const stringValuedVars = [];
  const allVars = [];

  function findVariablesInNode(node) {
    node.walkDecls(decl => {
      const { prop, value } = decl;

      // Handle dollar variables inside custom properties separately
      // since they need to always be interpolated (unlike plain dollar variables).
      if (
        !allVars.includes(value) &&
        isCustomProperty(decl) &&
        validateTypes.isDollarVar(value)
      ) {
        allVars.push(value);
        return;
      }

      // Skip if not a SCSS variable or already collected
      if (!isSassVariable(prop) || allVars.includes(prop)) {
        return;
      }

      // Track string-valued variables separately
      if (isStringValue(value)) {
        stringValuedVars.push(prop);
      }

      allVars.push(prop);
    });
  }

  // Collect variables from root and all rules
  findVariablesInNode(root);
  root.walkRules(findVariablesInNode);

  return {
    stringValuedVars,
    allVars
  };
}

/**
 * Reporting rules:
 * 1. String-valued variables in custom identifier properties → report
 * 2. String-valued variables in @supports → report
 * 3. All variables in custom identifier at-rules → report
 * 4. All variables in CSS custom properties → report
 */
function shouldReportVariable(node, variableName, stringValuedVars, allVars) {
  // Custom identifier properties and @supports require string-valued variables
  if (isAtSupports(node) || isCustomIdentProp(node)) {
    return stringValuedVars.includes(variableName);
  }

  // Custom identifier at-rules require all variables to be interpolated
  if (isCustomIdentAtRule(node)) {
    return allVars.includes(variableName);
  }

  // CSS custom properties always require interpolation for all variables
  if (isCustomProperty(node)) {
    return allVars.includes(variableName);
  }

  return false;
}

function reportViolation(node, variableName, result) {
  const { name, prop, type } = node;
  const nodeName = isAtRule(type) ? `@${name}` : prop;

  const fix = () => {
    // Apply the fix by wrapping all variables in the value
    if (type === "atrule") {
      node.params = wrapVariablesWithInterpolation(node.params);
    } else {
      node.value = wrapVariablesWithInterpolation(node.value);
    }
  };

  utils.report({
    ruleName,
    result,
    node,
    message: messages.rejected(nodeName, variableName),
    word: variableName,
    fix
  });
}

function shouldSkipValueNode(node) {
  return node.type !== "word" || !node.value;
}

function checkValueForVariables(
  node,
  value,
  reportedNodes,
  stringValuedVars,
  allVars,
  result
) {
  // Skip if we've already reported this node
  if (reportedNodes.has(node)) {
    return;
  }

  let firstViolatingVariable = null;

  // Parse the value and check each word token
  valueParser(value).walk(valueNode => {
    const { value: tokenValue } = valueNode;

    if (
      shouldSkipValueNode(valueNode) ||
      !shouldReportVariable(node, tokenValue, stringValuedVars, allVars)
    ) {
      return;
    }

    // Skip variables that are already inside interpolation blocks
    if (isInsideInterpolationBlock(value, value.indexOf("$"))) {
      return;
    }

    // Store the first variable we find for reporting
    if (!firstViolatingVariable) {
      firstViolatingVariable = tokenValue;
    }
  });

  // Only report once per node, using the first variable found
  if (firstViolatingVariable) {
    reportedNodes.add(node);
    reportViolation(node, firstViolatingVariable, result);
  }
}

/**
 * Check for SCSS variables that need interpolation in:
 * 1. String-valued variables with custom identifier properties (animation-name, counter-reset, etc.)
 * 2. All variables in custom identifier at-rules (@keyframes, @counter-style)
 * 3. String-valued variables in @supports with custom identifier properties
 * 4. All variables in CSS custom properties (--*)
 */
function rule(actual) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, { actual });

    if (!validOptions) {
      return;
    }

    // Collect all SCSS variables defined in the stylesheet
    const { stringValuedVars, allVars } = collectVariables(root);

    // Early exit if no variables found
    if (allVars.length === 0) {
      return;
    }

    // Track nodes we've already reported to avoid duplicates
    const reportedNodes = new Set();

    // Check custom identifier properties (animation-name, counter-reset, etc.)
    root.walkDecls(createMatchingRegex(CUSTOM_IDENT_PROPERTIES), decl => {
      checkValueForVariables(
        decl,
        decl.value,
        reportedNodes,
        stringValuedVars,
        allVars,
        result
      );
    });

    // Check custom identifier at-rules (@keyframes, @counter-style, @supports)
    root.walkAtRules(createMatchingRegex(CUSTOM_IDENT_AT_RULES), atRule => {
      checkValueForVariables(
        atRule,
        atRule.params,
        reportedNodes,
        stringValuedVars,
        allVars,
        result
      );
    });

    // Check all CSS custom properties (--*)
    root.walkDecls(decl => {
      if (isCustomProperty(decl)) {
        checkValueForVariables(
          decl,
          decl.value,
          reportedNodes,
          stringValuedVars,
          allVars,
          result
        );
      }
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
