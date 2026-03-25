"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("load-no-partial-leading-underscore");

const messages = utils.ruleMessages(ruleName, {
  expected: "Unexpected leading underscore in imported partial name"
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(actual) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, { actual });

    if (!validOptions) {
      return;
    }

    const hasArgumentsRegExp = /\(\s*([^)]+?)\s*\)/;

    function checkPathForUnderscore(path, atrule) {
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
        node: atrule,
        result,
        ruleName,
        word: pathStripped
      });
    }

    root.walkAtRules(atrule => {
      if (
        atrule.name === "import" ||
        atrule.name === "use" ||
        atrule.name === "forward"
      ) {
        // Processing comma-separated lists of import paths
        atrule.params.split(",").forEach(path => {
          checkPathForUnderscore(path, atrule);
        });
      }
      if (atrule.name === "include") {
        // Processing meta.load-css url
        if (atrule.params.match(/load-css/)) {
          const args = hasArgumentsRegExp.exec(atrule.params);
          if (args) {
            const arg = args[0].split(",");
            checkPathForUnderscore(arg[0].replace(/[()]/g, ""), atrule);
          }
        }
      }
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
