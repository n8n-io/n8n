"use strict";

const valueParser = require("postcss-value-parser");
const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("map-keys-quotes");

const messages = utils.ruleMessages(ruleName, {
  expected: "Expected keys in map to be quoted."
});

const meta = {
  url: ruleUrl(ruleName)
};

const mathOperators = ["+", "/", "-", "*", "%"];

function rule(primary) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: primary,
      possible: ["always"]
    });

    if (!validOptions) {
      return;
    }

    root.walkDecls(decl => {
      if (decl.prop[0] !== "$") {
        return;
      }

      valueParser(decl.value).walk(node => {
        if (
          node.type === "function" &&
          node.value === "" &&
          isMap(node.nodes)
        ) {
          // Identify all of the map-keys and see if they're strings (not words).
          const mapKeys = returnMapKeys(node.nodes);

          mapKeys.forEach(mapKey => {
            if (mathOperators.includes(mapKey.value)) {
              return;
            }

            if (mapKey.type === "word" && isNaN(mapKey.value)) {
              utils.report({
                message: messages.expected,
                node: decl,
                result,
                ruleName,
                word: mapKey.value
              });
            }
          });
        }
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

// Takes in a list of map nodes and identifies if they are a map.
// A map is identified by the pattern: [string/word colon(div) anything comma(div) ...]
function isMap(nodes) {
  if (nodes.length < 4) {
    return false;
  }

  if (nodes[0].type !== "word" && nodes[0].type !== "string") {
    return false;
  }

  if (nodes[1].value !== ":") {
    return false;
  }

  if (nodes[3].value !== ",") {
    return false;
  }

  return true;
}

function returnMapKeys(array) {
  const new_array = [];

  for (let i = 0; i < array.length; i += 4) {
    new_array.push(array[i]);
  }

  return new_array;
}

module.exports = rule;
