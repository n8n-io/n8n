"use strict";

const { utils } = require("stylelint");
const valueParser = require("postcss-value-parser");
const getAtRuleParams = require("../../utils/getAtRuleParams");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("no-duplicate-load-rules");
const messages = utils.ruleMessages(ruleName, {
  rejected: duplicate => `Unexpected duplicate load rule ${duplicate}`
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

    const imports = {};
    const hasExplicitNamespace = new RegExp(
      /\s+(as|with|show|hide)\s+\(?[^;]*\)?/g
    );

    root.walkAtRules(/^(forward|import|use)$/i, atRule => {
      // Ignore explicit namespaces for @use
      const [firstParam, ...restParams] = valueParser(
        getAtRuleParams(
          atRule.name !== "forward"
            ? {
                ...atRule,
                params: atRule.params.replace(hasExplicitNamespace, "")
              }
            : atRule
        )
      ).nodes;

      if (!firstParam) {
        return;
      }

      // extract uri from url() if exists
      const uri =
        firstParam.type === "function" &&
        firstParam.value === "url" &&
        firstParam.nodes[0]
          ? firstParam.nodes[0].value
          : firstParam.value;

      const media = listImportConditions(restParams);
      const atRuleName = atRule.name.toLowerCase();

      let importedUris = imports[atRuleName]?.[uri];
      const isDuplicate = media.length
        ? media.some(q => importedUris && importedUris.includes(q))
        : importedUris;

      if (isDuplicate) {
        utils.report({
          message: messages.rejected,
          messageArgs: [uri],
          node: atRule,
          result,
          ruleName,
          word: atRule.toString()
        });

        return;
      }

      if (!importedUris) {
        if (!imports[atRuleName]) {
          imports[atRuleName] = {};
        }
        importedUris = imports[atRuleName][uri] = [];
      }

      importedUris.push(...media);
    });
  };
}

function stringifyCondition(node) {
  // remove whitespace to get a more consistent key
  return valueParser.stringify(node).replace(/\s/g, "");
}

function listImportConditions(params) {
  if (!params.length) return [];

  const separator = " ";
  /** @type {Array<string>} */
  const sharedConditions = [];
  /** @type {Array<string>} */
  const media = [];
  /** @type {Array<Node>} */
  let lastMediaQuery = [];

  for (const param of params) {
    // remove top level whitespace and comments to get a more consistent key
    if (param.type === "space" || param.type === "comment") {
      continue;
    }

    // layer and supports conditions must precede media query conditions
    if (!media.length) {
      // @import url(...) layer(base) supports(display: flex)
      if (
        param.type === "function" &&
        (param.value === "supports" || param.value === "layer")
      ) {
        sharedConditions.push(stringifyCondition(param));
        continue;
      }

      // @import url(...) layer
      if (param.type === "word" && param.value === "layer") {
        sharedConditions.push(stringifyCondition(param));
        continue;
      }
    }

    if (param.type === "div" && param.value === ",") {
      media.push(stringifyCondition(lastMediaQuery));
      lastMediaQuery = [];
      continue;
    }

    lastMediaQuery.push(param);
  }

  if (lastMediaQuery.length) {
    media.push(stringifyCondition(lastMediaQuery));
  }

  // Only media query conditions
  if (media.length && !sharedConditions.length) {
    return media;
  }

  // Only layer and supports conditions
  if (!media.length && sharedConditions.length) {
    return [sharedConditions.join(separator)];
  }

  const sharedConditionsString = sharedConditions.join(separator);

  return media.map(m => {
    return sharedConditionsString + separator + m;
  });
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
