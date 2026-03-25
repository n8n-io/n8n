"use strict";

const nodeJsPath = require("path");
const { utils } = require("stylelint");
const atRuleParamIndex = require("../../utils/atRuleParamIndex");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("at-import-partial-extension");

const messages = utils.ruleMessages(ruleName, {
  expected: "Expected @import to have an extension",
  rejected: ext => `Unexpected extension ".${ext}" in @import`
});

const meta = {
  url: ruleUrl(ruleName),
  deprecated: true
};

// https://drafts.csswg.org/mediaqueries/#media-types
const mediaQueryTypes = [
  "all",
  "print",
  "screen",
  "speech",
  "tv",
  "tty",
  "projection",
  "handheld",
  "braille",
  "embossed",
  "aural"
];

const mediaQueryTypesRE = new RegExp(`(${mediaQueryTypes.join("|")})$`, "i");
const stripPath = path =>
  path.replace(/^\s*(["'])\s*/, "").replace(/\s*(["'])\s*$/, "");

function rule(expectation, _, context) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: expectation,
      possible: ["always", "never"]
    });

    if (!validOptions) {
      return;
    }

    result.warn(
      "'at-import-partial-extension has been deprecated, " +
        "and will be removed in '7.0'. Use 'load-partial-extension' instead.",
      {
        stylelintType: "deprecation",
        stylelintReference:
          "https://github.com/stylelint-scss/stylelint-scss/blob/v6.3.0/src/rules/at-import-partial-extension/README.md"
      }
    );

    root.walkAtRules("import", atRule => {
      const paths = atRule.params
        .split(/["']\s*,/)
        .filter(path => !mediaQueryTypesRE.test(path.trim()));

      // Processing comma-separated lists of import paths
      paths.forEach(path => {
        // Stripping trailing quotes and whitespaces, if any
        const pathStripped = stripPath(path);

        // Skipping importing CSS: url(), ".css", URI with a protocol
        if (
          pathStripped.slice(0, 4) === "url(" ||
          pathStripped.slice(-4) === ".css" ||
          pathStripped.search("//") !== -1
        ) {
          return;
        }

        const extension = nodeJsPath.extname(pathStripped).slice(1);

        if (!extension && expectation === "always") {
          utils.report({
            message: messages.expected,
            node: atRule,
            result,
            ruleName,
            word: pathStripped
          });

          return;
        }

        const isScssPartial = extension === "scss";
        if (extension && isScssPartial && expectation === "never") {
          if (context.fix) {
            const extPattern = new RegExp(`\\.${extension}(['" ]*)$`, "g");
            atRule.params = atRule.params.replace(extPattern, "$1");

            return;
          }

          const dotExt = `.${extension}`;
          const index =
            atRuleParamIndex(atRule) + atRule.params.lastIndexOf(dotExt);

          utils.report({
            message: messages.rejected(extension),
            node: atRule,
            index,
            endIndex: index + dotExt.length,
            result,
            ruleName
          });
        }
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
