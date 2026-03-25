"use strict";

const { utils } = require("stylelint");
const moduleNamespace = require("../../utils/moduleNamespace");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("at-each-key-value-single-line");

const messages = utils.ruleMessages(ruleName, {
  expected:
    "Use @each $key, $value in $map syntax instead of $value: map-get($map, $key)"
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

    const mapNamespace = moduleNamespace(root, "sass:map");

    root.walkAtRules("each", rule => {
      const parts = separateEachParams(rule.params);

      // If loop is fetching both key + value, return
      if (parts[0].length === 2) {
        return;
      }

      // If didn't call map-keys, return.
      if (!didCallMapKeys(parts[1], mapNamespace)) {
        return;
      }

      // Loop over decls inside of each statement and loop for variable assignments.
      rule.walkDecls(innerDecl => {
        // Check that this decl is a map-get call
        if (innerDecl.prop[0] !== "$") {
          return;
        }

        if (!didCallMapGet(innerDecl.value, mapNamespace)) {
          return;
        }

        // Check map_name + key_name match.
        const map_get_parts = mapGetParameters(innerDecl.value, mapNamespace);

        // Check map names match.
        if (map_get_parts[0] !== mapName(parts[1], mapNamespace)) {
          return;
        }

        // Match key names match.
        if (map_get_parts[1] !== parts[0][0]) {
          return;
        }

        utils.report({
          message: messages.expected,
          node: rule,
          result,
          ruleName,
          word: rule.params
        });
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

// Takes in a param string from node.params
// Returns: [[key variable, value variable], map_decl] (all Strings)
function separateEachParams(paramString) {
  const parts = paramString.split("in");

  return [parts[0].split(",").map(s => s.trim()), parts[1].trim()];
}

function didCallMapKeys(mapDecl, mapNamespace) {
  const pattern = getNamespacedPattern("keys\\(.*\\)", mapNamespace);

  return new RegExp(pattern).test(mapDecl);
}

function didCallMapGet(mapDecl, mapNamespace) {
  const pattern = getNamespacedPattern("get\\((.*),(.*)\\)", mapNamespace);

  return new RegExp(pattern).test(mapDecl);
}

// Fetch the name of the map from a map-keys() or map.keys() call.
function mapName(mapDecl, mapNamespace) {
  if (didCallMapKeys(mapDecl, mapNamespace)) {
    const pattern = getNamespacedPattern("keys\\((.*)\\)", mapNamespace);

    return mapDecl.match(new RegExp(pattern))[1];
  }

  return mapDecl;
}

// Returns the parameters of a map-get or map.get call
// Returns [map variable, key_variable]
function mapGetParameters(mapGetDecl, mapNamespace) {
  const pattern = getNamespacedPattern("get\\((.*), ?(.*)\\)", mapNamespace);
  const parts = mapGetDecl.match(new RegExp(pattern));

  return [parts[1], parts[2]];
}

function getNamespacedPattern(pattern, namespace) {
  return namespace !== null ? `(?:${namespace}\\.|map-)${pattern}` : pattern;
}

module.exports = rule;
