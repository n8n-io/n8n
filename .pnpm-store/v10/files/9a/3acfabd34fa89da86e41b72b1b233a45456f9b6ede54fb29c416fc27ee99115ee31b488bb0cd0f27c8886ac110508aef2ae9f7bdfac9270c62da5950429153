"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("double-slash-comment-whitespace-inside");

const messages = utils.ruleMessages(ruleName, {
  expected: "Expected a space after //",
  rejected: "Unexpected space after //"
});

const meta = {
  url: ruleUrl(ruleName),
  fixable: true
};

function rule(expectation, options, context) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: expectation,
      possible: ["always", "never"]
    });

    if (!validOptions) {
      return;
    }

    root.walkComments(comment => {
      if (comment.text.trim() === "") {
        return;
      }

      // Only process // comments
      if (!comment.raws.inline && !comment.inline) {
        return;
      }

      let message;

      if (
        expectation === "never" &&
        (comment.raws.left !== "" || /^\/+\s/.test(comment.raws.text))
      ) {
        message = messages.rejected;
      } else if (
        expectation === "always" &&
        comment.raws.left === "" &&
        !/^(\/)*(\s|$)/.test(comment.raws.text)
      ) {
        message = messages.expected;
      } else {
        return;
      }

      if (context.fix) {
        if (expectation === "always") {
          comment.raws.text = comment.raws.text.replace(/^(\/*)/, "$1 ");
        } else {
          comment.raws.left = "";
          comment.raws.text = comment.raws.text.replace(/^(\/*)\s+/, "$1");
        }
        return;
      }

      const extraSlashes = comment.raws.text.match(/^\/+/)?.[0]?.length || 0;

      utils.report({
        message,
        node: root,
        index: comment.source.start.offset + 2 + extraSlashes,
        endIndex: comment.source.start.offset + 2 + extraSlashes,
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
