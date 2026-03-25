"use strict";

const valueParser = require("postcss-value-parser");
const { utils } = require("stylelint");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("dimension-no-non-numeric-values");

const messages = utils.ruleMessages(ruleName, {
  rejected: unit =>
    `Expected "$value * 1${unit}" instead of "#{$value}${unit}". Consider writing "value" in terms of ${unit} originally.`
});

const meta = {
  url: ruleUrl(ruleName)
};

const units = [
  // Font-relative lengths:
  // https://www.w3.org/TR/css-values-4/#font-relative-lengths
  "em",
  "ex",
  "cap",
  "ch",
  "ic",
  "rem",
  "lh",
  "rlh",

  // Viewport-relative lengths:
  // https://www.w3.org/TR/css-values-4/#viewport-relative-lengths
  "vw",
  "vh",
  "vi",
  "vb",
  "vmin",
  "vmax",

  // Absolute lengths:
  // https://www.w3.org/TR/css-values-4/#absolute-lengths
  "cm",
  "mm",
  "Q",
  "in",
  "pc",
  "pt",
  "px",

  // Angle units:
  // https://www.w3.org/TR/css-values-4/#angles
  "deg",
  "grad",
  "rad",
  "turn",

  // Duration units:
  // https://www.w3.org/TR/css-values-4/#time
  "s",
  "ms",

  // Frequency units:
  // https://www.w3.org/TR/css-values-4/#frequency
  "Hz",
  "kHz",

  // Resolution units:
  // https://www.w3.org/TR/css-values-4/#resolution
  "dpi",
  "dpcm",
  "dppx",
  "x",

  // Flexible lengths:
  // https://www.w3.org/TR/css-grid-1/#fr-unit
  "fr"
];

function rule(primary) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: primary
    });

    if (!validOptions) {
      return;
    }

    root.walkDecls(decl => {
      valueParser(decl.value).walk(node => {
        // All words are non-quoted, while strings are quoted.
        // If quoted, it's probably a deliberate non-numeric dimension.
        if (node.type !== "word") {
          return;
        }

        if (!isInterpolated(node.value)) {
          return;
        }

        const regex = new RegExp(`#{[$a-z_0-9 +-]*}(${units.join("|")});?`);
        const matchUnit = decl.value.match(regex);

        if (!matchUnit) {
          return;
        }

        const unit = matchUnit[1];
        utils.report({
          ruleName,
          result,
          message: messages.rejected(unit),
          word: matchUnit[0],
          node: decl
        });
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

function isInterpolated(value) {
  let boolean = false;

  // ValueParser breaks up interpolation with math into multiple, fragmented
  // segments (#{$value, +, 2}px). The easiest way to detect this is to look for a fragmented
  // interpolated section.
  if (value.match(/^#{\$[a-z]*$/)) {
    return true;
  }

  units.forEach(unit => {
    const regex = new RegExp(`^#{[$a-z_0-9 +-]*}${unit};?$`);

    if (value.match(regex)) {
      boolean = true;
    }
  });

  return boolean;
}

module.exports = rule;
module.exports.units = units;
