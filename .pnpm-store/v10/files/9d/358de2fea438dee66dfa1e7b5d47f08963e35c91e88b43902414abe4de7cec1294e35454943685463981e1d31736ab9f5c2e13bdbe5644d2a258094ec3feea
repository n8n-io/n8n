"use strict";

const nodeJsPath = require("path");
const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("partial-no-import");

const messages = utils.ruleMessages(ruleName, {
  expected: "Unexpected @import in a partial",
  expectedActualFile:
    "This rule won't work if linting in a code string without an actual file"
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(on) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: on
    });

    if (!validOptions) {
      return;
    }

    if (root.source.input.file === undefined || !root.source.input.file) {
      utils.report({
        message: messages.expectedActualFile,
        node: root,
        index: 1,
        endIndex: 2,
        result,
        ruleName
      });

      return;
    }

    const fileName = nodeJsPath.basename(root.source.input.file);
    const extName = nodeJsPath.extname(root.source.input.file);

    function checkImportForCSS(path, atRule) {
      // Stripping trailing quotes and whitespaces, if any
      const pathStripped = path
        .replace(/^\s*(["'])\s*/, "")
        .replace(/\s*(["'])\s*$/, "");

      // Skipping importing empty import, CSS: url(), ".css", URI with a protocol, media
      if (
        pathStripped.trim() === "" ||
        pathStripped.slice(0, 4) === "url(" ||
        pathStripped.slice(-4) === ".css" ||
        pathStripped.search("//") !== -1 ||
        pathStripped.search(/[\s,)"']\w+$/) !== -1
      ) {
        return;
      }

      utils.report({
        message: messages.expected,
        node: atRule,
        word: pathStripped,
        result,
        ruleName
      });
    }

    // Usual CSS file
    if (extName === ".css") {
      return;
    }

    // Not a partial
    if (fileName[0] !== "_") {
      return;
    }

    root.walkAtRules("import", mixinCall => {
      // Check if @import is treated as CSS import; report only if not
      // Processing comma-separated lists of import paths
      mixinCall.params.split(/["']\s*,/).forEach(path => {
        checkImportForCSS(path, mixinCall);
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
