"use strict";

const { utils } = require("stylelint");
const blockString = require("../../utils/blockString");
const hasEmptyLine = require("../../utils/hasEmptyLine");
const isSingleLineString = require("../../utils/isSingleLineString");
const namespace = require("../../utils/namespace");
const optionsHaveException = require("../../utils/optionsHaveException");
const optionsHaveIgnored = require("../../utils/optionsHaveIgnored");
const ruleUrl = require("../../utils/ruleUrl");
const { isBoolean } = require("../../utils/validateTypes");

const ruleName = namespace("dollar-variable-empty-line-before");

const messages = utils.ruleMessages(ruleName, {
  expected: "Expected an empty line before $-variable",
  rejected: "Unexpected empty line before $-variable"
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(expectation, options, context) {
  return (root, result) => {
    const validOptions = utils.validateOptions(
      result,
      ruleName,
      {
        actual: expectation,
        possible: ["always", "never"]
      },
      {
        actual: options,
        possible: {
          except: ["first-nested", "after-comment", "after-dollar-variable"],
          ignore: [
            "after-comment",
            "inside-single-line-block",
            "after-dollar-variable"
          ],
          disableFix: isBoolean
        },
        optional: true
      }
    );

    if (!validOptions) {
      return;
    }

    const fix = (decl, match, replace) => {
      decl.raws.before = decl.raws.before.replace(
        new RegExp(`^${match}`),
        replace
      );
    };

    const hasNewline = str => str.includes(context.newline);

    root.walkDecls(decl => {
      if (!isDollarVar(decl)) {
        return;
      }

      // Always ignore the first $var in a stylesheet
      if (decl === root.first) {
        return;
      }

      // If ignoring vars after comments is set
      if (
        optionsHaveIgnored(options, "after-comment") &&
        decl.prev() &&
        decl.prev().type === "comment"
      ) {
        return;
      }

      // If ignoring single-line blocks
      if (
        optionsHaveIgnored(options, "inside-single-line-block") &&
        decl.parent.type !== "root" &&
        isSingleLineString(blockString(decl.parent))
      ) {
        return;
      }

      // if ignoring after another $-variable
      if (
        optionsHaveIgnored(options, "after-dollar-variable") &&
        decl.prev() &&
        isDollarVar(decl.prev())
      ) {
        return;
      }

      let expectHasEmptyLineBefore = expectation === "always";

      // Reverse for a variable that is a first child of its parent
      if (
        optionsHaveException(options, "first-nested") &&
        decl === decl.parent.first
      ) {
        expectHasEmptyLineBefore = !expectHasEmptyLineBefore;
      }

      // Reverse if after a comment
      if (
        optionsHaveException(options, "after-comment") &&
        decl.prev() &&
        decl.prev().type === "comment"
      ) {
        expectHasEmptyLineBefore = !expectHasEmptyLineBefore;
      }

      // Reverse if after another $-variable
      if (
        optionsHaveException(options, "after-dollar-variable") &&
        decl.prev() &&
        isDollarVar(decl.prev())
      ) {
        expectHasEmptyLineBefore = !expectHasEmptyLineBefore;
      }

      const before = decl.raws.before;

      if (expectHasEmptyLineBefore === hasEmptyLine(before)) {
        return;
      }

      const isFixDisabled = options && options.disableFix === true;

      if (context.fix && !isFixDisabled) {
        if (expectHasEmptyLineBefore && !hasEmptyLine(before)) {
          fix(decl, context.newline, context.newline + context.newline);

          if (
            optionsHaveException(options, "first-nested") &&
            !hasNewline(before)
          ) {
            fix(decl, "\\s+", context.newline + context.newline);
          }

          return;
        }

        if (!expectHasEmptyLineBefore && hasEmptyLine(before)) {
          fix(decl, "\\n\\r\\n", "\r\n");
          fix(decl, context.newline + context.newline, context.newline);

          return;
        }
      }

      utils.report({
        message: expectHasEmptyLineBefore
          ? messages.expected
          : messages.rejected,
        node: decl,
        result,
        ruleName
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

function isDollarVar(node) {
  return node.prop && node.prop[0] === "$";
}

module.exports = rule;
