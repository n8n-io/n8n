"use strict";

const valueParser = require("postcss-value-parser");
const { utils } = require("stylelint");
const { ALL_FUNCTIONS } = require("../../utils/functions");
const namespace = require("../../utils/namespace");
const { isRegExp, isString } = require("../../utils/validateTypes");
const ruleUrl = require("../../utils/ruleUrl");

const ruleToCheckAgainst = "function-no-unknown";

const ruleName = namespace(ruleToCheckAgainst);

const messages = utils.ruleMessages(ruleName, {
  rejected: name => `Unexpected unknown function "${name}"`
});

const meta = {
  url: ruleUrl(ruleName)
};

function extractNamespaceFromFunction(fn) {
  const matched = fn.match(/^(\w+)\.\w+$/);
  return matched ? matched[1] : undefined;
}

function isAtUseAsSyntax(nodes) {
  const [first, second, third] = nodes.slice(-3);
  return (
    first.type === "word" &&
    first.value === "as" &&
    second.type === "space" &&
    third.type === "word"
  );
}

function getAtUseNamespace(nodes) {
  if (isAtUseAsSyntax(nodes)) {
    const [last] = nodes.slice(-1);
    return last.value;
  }
  const [first] = nodes;
  const parts = first.value.split("/");
  const [last] = parts.slice(-1);
  return last;
}

function rule(primaryOption, secondaryOptions) {
  return async (root, result) => {
    const validOptions = utils.validateOptions(
      result,
      ruleName,
      {
        actual: primaryOption
      },
      {
        actual: secondaryOptions,
        possible: {
          ignoreFunctions: [isString, isRegExp]
        },
        optional: true
      }
    );

    if (!validOptions) {
      return;
    }

    const optionsFunctions =
      (secondaryOptions && secondaryOptions.ignoreFunctions) || [];
    const ignoreFunctions = ALL_FUNCTIONS.concat(optionsFunctions);
    const ignoreFunctionsAsSet = new Set(ignoreFunctions);
    const newSecondaryOptions = Object.assign({}, secondaryOptions, {
      ignoreFunctions
    });

    const atUseNamespaces = new Set();
    root.walkAtRules(/^use$/i, atRule => {
      const { nodes } = valueParser(atRule.params);
      atUseNamespaces.add(getAtUseNamespace(nodes));
    });

    const namespaceWarnings = new Set();

    await utils.checkAgainstRule(
      {
        ruleName: ruleToCheckAgainst,
        ruleSettings: [primaryOption, newSecondaryOptions],
        root
      },
      warning => {
        const { node: decl } = warning;

        // NOTE: Using `valueParser` is necessary for extracting a function name. This may be a performance waste.
        valueParser(decl.value).walk(valueNode => {
          const { type, value: funcName } = valueNode;

          if (type !== "function" || funcName.trim() === "") return;

          // TODO: For backward compatibility with Stylelint 15.7.0 or less.
          // We can remove this code when dropping support for old version.
          const namespace = extractNamespaceFromFunction(funcName);
          if (namespace && atUseNamespaces.has(namespace)) return;

          if (ignoreFunctionsAsSet.has(funcName)) return;

          utils.report({
            message: messages.rejected(funcName),
            ruleName,
            result,
            node: decl,
            word: funcName
          });

          namespaceWarnings.add(warning);
        });
      }
    );

    // NOTE: Since Stylelint 15.8.0, the built-in `function-no-unknown` rule has ignored SCSS functions with namespace.
    // See https://github.com/stylelint/stylelint/releases/tag/15.8.0
    // See https://github.com/stylelint/stylelint/pull/6921
    if (namespaceWarnings.size === 0) {
      root.walkDecls(decl => {
        valueParser(decl.value).walk(valueNode => {
          const { type, value } = valueNode;

          if (type !== "function" || value.trim() === "") return;

          const interpolationRegex = /^#{/;
          const funcName = value.replace(interpolationRegex, "");

          const namespace = extractNamespaceFromFunction(funcName);

          if (!namespace) return;

          if (atUseNamespaces.has(namespace)) return;

          if (ignoreFunctionsAsSet.has(funcName)) return;

          utils.report({
            message: messages.rejected(funcName),
            ruleName,
            result,
            node: decl,
            word: funcName
          });
        });
      });
    }
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
