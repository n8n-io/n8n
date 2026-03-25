"use strict";

const { utils } = require("stylelint");
const { isBoolean } = require("../../utils/validateTypes");
const { isString } = require("../../utils/validateTypes");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("no-duplicate-dollar-variables");

const messages = utils.ruleMessages(ruleName, {
  rejected: variable => `Unexpected duplicate dollar variable ${variable}`
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(value, secondaryOptions) {
  return (root, result) => {
    const validOptions = utils.validateOptions(
      result,
      ruleName,
      {
        actual: value
      },
      {
        actual: secondaryOptions,
        possible: {
          ignoreInside: ["at-rule", "nested-at-rule"],
          ignoreInsideAtRules: [isString],
          ignoreDefaults: [isBoolean]
        },
        optional: true
      }
    );

    if (!validOptions) {
      return;
    }

    const vars = {};

    /**
     * Traverse the [vars] tree through the path defined by [ancestors], creating nodes as needed.
     * @param {*} ancestors
     * @returns the tree of the node defined by the last of [ancestors].
     */
    function getScope(ancestors) {
      let scope = vars;

      for (const node of ancestors) {
        if (!(node in scope)) {
          scope[node] = {};
        }

        scope = scope[node];
      }

      return scope;
    }

    /**
     * Iterates through the ancestors while checking each scope until the [variable] is found.
     * If not found, an object with empty values is returned.
     * @param {*} ancestors
     * @param {string} variable the variable name.
     * @returns The previously declared variable data or an object with empty values.
     */
    function getVariableData(ancestors, variable) {
      let scope = vars;

      for (const node of ancestors) {
        scope = scope[node];

        if (scope[variable]) {
          return scope[variable];
        }
      }

      return {
        defaultCount: 0,
        isDeclared: false
      };
    }

    /**
     * Checks whether the given [variableData] is declared.
     * @param {{ defaultCount: number; isDeclared: boolean; }} variableData the variable data
     * containing default count and if the variable is declared.
     * @param {boolean} isDefault if the variable contains the `!default` keyword.
     * @param {boolean | number} ignoreDefaults the ignore defaults options.
     * @returns true if declared.
     */
    function isDeclared(variableData, isDefault, ignoreDefaults) {
      if (isDefault) {
        if (Number.isFinite(ignoreDefaults)) {
          return variableData.defaultCount >= ignoreDefaults;
        } else if (ignoreDefaults) {
          return false;
        }
      }

      return variableData.isDeclared;
    }

    /**
     * Processes the variable data based on the given arguments.
     * @param {{ defaultCount: number; isDeclared: boolean; }} variableData the variable data
     * containing default count and if the variable is declared.
     * @param {boolean} isDefault if the variable contains the `!default` keyword.
     * @param {boolean | number} ignoreDefaults the ignore defaults options.
     * @returns the updated `variableData`.
     */
    function processVariableData(variableData, isDefault, ignoreDefaults) {
      return {
        defaultCount: isDefault
          ? ++variableData.defaultCount
          : variableData.defaultCount,
        isDeclared:
          isDefault && ignoreDefaults !== false ? variableData.isDeclared : true
      };
    }

    const ignoreDefaults =
      secondaryOptions && secondaryOptions.ignoreDefaults !== undefined
        ? secondaryOptions.ignoreDefaults
        : 1;

    root.walkDecls(decl => {
      const isVar = decl.prop[0] === "$";
      const isInsideIgnoredAtRule =
        decl.parent.type === "atrule" &&
        secondaryOptions &&
        secondaryOptions.ignoreInside &&
        secondaryOptions.ignoreInside === "at-rule";
      const isInsideIgnoredNestedAtRule =
        decl.parent.type === "atrule" &&
        decl.parent.parent.type !== "root" &&
        secondaryOptions &&
        secondaryOptions.ignoreInside &&
        secondaryOptions.ignoreInside === "nested-at-rule";
      const isInsideIgnoredSpecifiedAtRule =
        decl.parent.type === "atrule" &&
        secondaryOptions &&
        secondaryOptions.ignoreInsideAtRules &&
        secondaryOptions.ignoreInsideAtRules.includes(decl.parent.name);

      if (
        !isVar ||
        isInsideIgnoredAtRule ||
        isInsideIgnoredNestedAtRule ||
        isInsideIgnoredSpecifiedAtRule
      ) {
        return;
      }

      const ancestors = [];
      let parent = decl.parent;

      while (parent !== null && parent !== undefined) {
        const parentKey = parent.toString();

        ancestors.unshift(parentKey);
        parent = parent.parent;
      }

      const scope = getScope(ancestors);
      const isDefault = /!default/.test(decl.value);
      const variableData = getVariableData(ancestors, decl.prop);

      if (isDeclared(variableData, isDefault, ignoreDefaults)) {
        utils.report({
          message: messages.rejected(decl.prop),
          node: decl,
          result,
          ruleName,
          word: decl.prop
        });
      }

      scope[decl.prop] = processVariableData(
        variableData,
        isDefault,
        ignoreDefaults
      );
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
