"use strict";

const valueParser = require("postcss-value-parser");
const { utils } = require("stylelint");
const getAtRuleParams = require("../../utils/getAtRuleParams");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const interpolationPrefix = /^#{\s*/m;

const rules = {
  red: "color",
  blue: "color",
  green: "color",
  mix: "color",
  hue: "color",
  saturation: "color",
  lightness: "color",
  complement: "color",
  "adjust-color": "color",
  "scale-color": "color",
  "change-color": "color",
  "ie-hex-str": "color",
  "map-get": "map",
  "map-merge": "map",
  "map-remove": "map",
  "map-keys": "map",
  "map-values": "map",
  "map-has-key": "map",
  unquote: "string",
  quote: "string",
  "str-length": "string",
  "str-insert": "string",
  "str-index": "string",
  "str-slice": "string",
  "to-upper-case": "string",
  "to-lower-case": "string",
  "unique-id": "string",
  percentage: "math",
  ceil: "math",
  floor: "math",
  abs: "math",
  random: "math",
  unit: "math",
  unitless: "math",
  comparable: "math",
  length: "list",
  nth: "list",
  "set-nth": "list",
  join: "list",
  append: "list",
  zip: "list",
  index: "list",
  "list-separator": "list",
  "feature-exists": "meta",
  "variable-exists": "meta",
  "global-variable-exists": "meta",
  "function-exists": "meta",
  "mixin-exists": "meta",
  inspect: "meta",
  "get-function": "meta",
  "type-of": "meta",
  call: "meta",
  "content-exists": "meta",
  keywords: "meta",
  "selector-nest": "selector",
  "selector-append": "selector",
  "selector-replace": "selector",
  "selector-unify": "selector",
  "is-superselector": "selector",
  "simple-selectors": "selector",
  "selector-parse": "selector",
  "selector-extend": "selector",
  lighten: "color",
  "adjust-hue": "color",
  darken: "color",
  desaturate: "color",
  opacify: "color",
  transparentize: "color"
};

const new_rule_names = {
  "adjust-color": "adjust",
  "scale-color": "scale",
  "change-color": "change",
  "map-get": "get",
  "map-merge": "merge",
  "map-remove": "remove",
  "map-keys": "keys",
  "map-values": "values",
  "map-has-key": "has-key",
  "str-length": "length",
  "str-insert": "insert",
  "str-index": "index",
  "str-slice": "slice",
  unitless: "is-unitless",
  comparable: "compatible",
  "list-separator": "separator",
  "selector-nest": "nest",
  "selector-append": "append",
  "selector-replace": "replace",
  "selector-unify": "unify",
  "selector-parse": "parse",
  "selector-extend": "extend",
  lighten: "adjust",
  "adjust-hue": "adjust",
  darken: "adjust",
  desaturate: "adjust",
  opacify: "adjust",
  saturate: "adjust",
  transparentize: "adjust"
};

const rule_mapping = {
  lighten: ["lighten($color, $amount)", "adjust($color, $lightness: $amount)"],
  "adjust-hue": [
    "adjust-hue($color, $amount)",
    "adjust($color, $hue: $amount)"
  ],
  darken: ["darken($color, $amount)", "adjust($color, $lightness: -$amount)"],
  desaturate: [
    "desaturate($color, $amount)",
    "adjust($color, $saturation: -$amount)"
  ],
  opacify: ["opacify($color, $amount)", "adjust($color, $alpha: -$amount)"],
  saturate: [
    "saturate($color, $amount)",
    "adjust($color, $saturation: $amount)"
  ],
  transparentize: [
    "transparentize($color, $amount)",
    "adjust($color, $alpha: -$amount)"
  ]
};

const ruleName = namespace("no-global-function-names");

const messages = utils.ruleMessages(ruleName, {
  rejectedFullMessage: string => string,
  rejected: name => errorMessage(name)
});

const meta = {
  url: ruleUrl(ruleName)
};

function errorMessage(name) {
  const sass_package = rules[name];
  const rename = new_rule_names[name];
  const map_rule = rule_mapping[name];

  if (rename) {
    if (map_rule) {
      const [old_rule, new_rule] = map_rule;

      return `Expected ${sass_package}.${new_rule} instead of ${old_rule}`;
    }

    return `Expected ${sass_package}.${rename} instead of ${name}`;
  } else {
    return `Expected ${sass_package}.${name} instead of ${name}`;
  }
}

function rule(value) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: value
    });

    if (!validOptions) {
      return;
    }

    root.walkDecls(decl => {
      checkValue(decl, decl.value);
    });
    root.walkAtRules(atRule => {
      const params = getAtRuleParams(atRule);
      checkValue(atRule, params);
    });

    function checkValue(parentNode, value) {
      valueParser(value).walk(node => {
        const cleanValue = node.value.replace(interpolationPrefix, "");

        // Verify that we're only looking at functions.
        if (node.type !== "function" || cleanValue === "") {
          return;
        }

        if (rules[cleanValue]) {
          utils.report({
            message: messages.rejected(cleanValue),
            node: parentNode,
            word: cleanValue,
            result,
            ruleName
          });
        }
      });
    }
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
