"use strict";

const { utils } = require("stylelint");
const eachRoot = require("../../utils/eachRoot");
const isWhitespace = require("../../utils/isWhitespace");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");
const { calculationOperatorSpaceChecker } = require("../operator-no-unspaced");

const ruleName = namespace("operator-no-newline-before");

const messages = utils.ruleMessages(ruleName, {
  rejected: operator => `Unexpected newline before "${operator}"`
});

const meta = {
  url: ruleUrl(ruleName)
};

/**
 * The checker function: whether there is a newline before THAT operator.
 */
function checkNewlineBefore({
  string,
  globalIndex,
  startIndex,
  endIndex,
  node,
  result
}) {
  const symbol = string.substring(startIndex, endIndex + 1);
  let newLineBefore = false;

  let index = startIndex - 1;

  while (index && isWhitespace(string[index])) {
    if (string[index] === "\n") {
      newLineBefore = true;
      break;
    }

    index--;
  }

  if (newLineBefore) {
    const index = globalIndex + startIndex;
    utils.report({
      ruleName,
      result,
      node,
      message: messages.rejected(symbol),
      index,
      endIndex: index + symbol.length
    });
  }
}

function rule(expectation) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: expectation
    });

    if (!validOptions) {
      return;
    }

    eachRoot(root, checkRoot);

    function checkRoot(root) {
      calculationOperatorSpaceChecker({
        root,
        result,
        checker: checkNewlineBefore
      });
    }
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
