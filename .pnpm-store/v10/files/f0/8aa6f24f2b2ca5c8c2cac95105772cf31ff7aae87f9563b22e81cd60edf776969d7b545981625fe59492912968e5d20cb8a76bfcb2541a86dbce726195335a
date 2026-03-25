"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("at-import-no-partial-leading-underscore");

const messages = utils.ruleMessages(ruleName, {
  expected: "Unexpected leading underscore in imported partial name"
});

const meta = {
  url: ruleUrl(ruleName),
  deprecated: true
};

function rule(actual) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, { actual });

    if (!validOptions) {
      return;
    }

    result.warn(
      "'at-import-no-partial-leading-underscore' has been deprecated, " +
        "and will be removed in '7.0'. Use 'load-no-partial-leading-underscore' instead.",
      {
        stylelintType: "deprecation",
        stylelintReference:
          "https://github.com/stylelint-scss/stylelint-scss/blob/v5.2.1/src/rules/at-import-no-partial-leading-underscore/README.md"
      }
    );

    function checkPathForUnderscore(path, decl) {
      // Stripping trailing quotes and whitespaces, if any
      const pathStripped = path
        .replace(/^\s*(["'])\s*/, "")
        .replace(/\s*(["'])\s*$/, "");

      // Searching a _ at the start of filename
      if (pathStripped.search(/(?:^|\/|\\)_[^/]+$/) === -1) {
        return;
      }

      // Skipping importing CSS: url(), ".css", URI with a protocol, media
      if (
        pathStripped.slice(0, 4) === "url(" ||
        pathStripped.slice(-4) === ".css" ||
        pathStripped.search("//") !== -1 ||
        pathStripped.search(/[\s,)"']\w+$/) !== -1
      ) {
        return;
      }

      utils.report({
        message: messages.expected,
        node: decl,
        result,
        ruleName
      });
    }

    root.walkAtRules("import", decl => {
      // Processing comma-separated lists of import paths
      decl.params.split(",").forEach(path => {
        checkPathForUnderscore(path, decl);
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
