"use strict";

const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const coreRuleName = "comment-no-empty";

const ruleName = namespace(coreRuleName);

const messages = utils.ruleMessages(ruleName, {
  rejected: "Unexpected empty comment"
});

const meta = {
  url: ruleUrl(ruleName)
};

function rule(primary) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: primary
    });

    if (!validOptions) {
      return;
    }

    root.walkComments(comment => {
      if (isEmptyComment(comment)) {
        utils.report({
          message: messages.rejected,
          node: comment,
          result,
          ruleName
        });
      }
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

function isEmptyComment(comment) {
  return comment.text === "";
}

module.exports = rule;
