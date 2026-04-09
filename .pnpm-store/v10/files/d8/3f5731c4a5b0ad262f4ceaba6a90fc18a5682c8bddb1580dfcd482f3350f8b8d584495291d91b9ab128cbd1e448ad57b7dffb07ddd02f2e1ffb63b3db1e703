"use strict";

const { utils } = require("stylelint");
const addEmptyLineBefore = require("../../utils/addEmptyLineBefore");
const isInlineComment = require("../../utils/isInlineComment");
const namespace = require("../../utils/namespace");
const optionsHaveException = require("../../utils/optionsHaveException");
const optionsHaveIgnored = require("../../utils/optionsHaveIgnored");
const removeEmptyLinesBefore = require("../../utils/removeEmptyLinesBefore");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("double-slash-comment-empty-line-before");

const messages = utils.ruleMessages(ruleName, {
  expected: "Expected empty line before comment",
  rejected: "Unexpected empty line before comment"
});

const meta = {
  url: ruleUrl(ruleName),
  fixable: true
};

const stylelintCommandPrefix = "stylelint-";

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
          except: ["first-nested", "inside-block"],
          ignore: ["stylelint-commands", "between-comments", "inside-block"]
        },
        optional: true
      }
    );

    if (!validOptions) {
      return;
    }

    root.walkComments(comment => {
      // Only process // comments
      if (!comment.raws.inline && !comment.inline) {
        return;
      }

      if (isInlineComment(comment)) {
        return;
      }

      // Ignore the first node
      if (comment === root.first) {
        return;
      }

      // Optionally ignore stylelint commands
      if (
        comment.text.indexOf(stylelintCommandPrefix) === 0 &&
        optionsHaveIgnored(options, "stylelint-commands")
      ) {
        return;
      }

      // Optionally ignore comments inside blocks
      if (
        comment.parent !== root &&
        optionsHaveIgnored(options, "inside-block")
      ) {
        return;
      }

      // Optionally ignore newlines between comments
      const prev = comment.prev();

      if (
        prev &&
        prev.type === "comment" &&
        optionsHaveIgnored(options, "between-comments")
      ) {
        return;
      }

      const before = comment.raw("before");

      const expectEmptyLineBefore = (() => {
        if (
          optionsHaveException(options, "first-nested") &&
          comment.parent !== root &&
          comment === comment.parent.first
        ) {
          return false;
        }

        // Reverse expectation for comments inside blocks
        if (
          comment.parent !== root &&
          optionsHaveException(options, "inside-block")
        ) {
          return expectation === "never";
        }

        return expectation === "always";
      })();

      const hasEmptyLineBefore = before.search(/\n\s*?\n/) !== -1;

      // Return if the expectation is met
      if (expectEmptyLineBefore === hasEmptyLineBefore) {
        return;
      }

      const fix = () => {
        if (expectEmptyLineBefore && !hasEmptyLineBefore) {
          addEmptyLineBefore(comment, context.newline);

          return;
        }

        if (!expectEmptyLineBefore && hasEmptyLineBefore) {
          removeEmptyLinesBefore(comment, context.newline);

          return;
        }
      };

      const message = expectEmptyLineBefore
        ? messages.expected
        : messages.rejected;

      utils.report({
        message,
        node: comment,
        result,
        ruleName,
        fix
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
