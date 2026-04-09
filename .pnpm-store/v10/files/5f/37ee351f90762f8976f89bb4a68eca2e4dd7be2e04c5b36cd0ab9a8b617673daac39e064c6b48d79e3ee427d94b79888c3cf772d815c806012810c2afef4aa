"use strict";

const { utils } = require("stylelint");
const declarationValueIndex = require("../../utils/declarationValueIndex");
const isSingleLineString = require("../../utils/isSingleLineString");
const whitespaceChecker = require("../../utils/whitespaceChecker");
const { isBoolean } = require("../../utils/validateTypes");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("dollar-variable-colon-newline-after");

const messages = utils.ruleMessages(ruleName, {
  expectedAfter: () => 'Expected newline after ":"',
  expectedAfterMultiLine: () =>
    'Expected newline after ":" with a multi-line value'
});

const meta = {
  url: ruleUrl(ruleName),
  fixable: true
};

function rule(expectation, options, context) {
  const checker = whitespaceChecker("newline", expectation, messages);

  return (root, result) => {
    const validOptions = utils.validateOptions(
      result,
      ruleName,
      {
        actual: expectation,
        possible: ["always", "always-multi-line"]
      },
      {
        actual: options,
        possible: {
          disableFix: isBoolean
        },
        optional: true
      }
    );

    if (!validOptions) {
      return;
    }

    const shouldFix = options?.disableFix !== true;

    root.walkDecls(decl => {
      if (!decl.prop || decl.prop[0] !== "$") {
        return;
      }

      const value = decl.value.trim();
      const startsWithParen = value[0] === "(";
      const endsWithParen = value[value.length - 1] === ")";
      const endsWithDefault = /\)\s*!default$/.test(value);
      const isMultilineVarWithParens =
        startsWithParen &&
        (endsWithParen || endsWithDefault) &&
        !isSingleLineString(value);

      if (isMultilineVarWithParens) {
        return;
      }

      // Get the raw $var, and only that
      const endOfPropIndex =
        declarationValueIndex(decl) + decl.raw("between").length - 1;
      // `$var:`, `$var :`
      const propPlusColon = decl.toString().slice(0, endOfPropIndex);

      for (let i = 0, l = propPlusColon.length; i < l; i++) {
        if (propPlusColon[i] !== ":") {
          continue;
        }

        const indexToCheck =
          propPlusColon.substr(propPlusColon[i], 3) === "/*"
            ? propPlusColon.indexOf("*/", i) + 1
            : i;

        checker.afterOneOnly({
          source: propPlusColon,
          index: indexToCheck,
          lineCheckStr: decl.value,
          err: m => {
            const fix = () => {
              const nextLinePrefix =
                expectation === "always"
                  ? decl.raws.before.replace(context.newline, "")
                  : decl.value
                      .split(context.newline)[1]
                      .replace(/^(\s+).*$/, (_, whitespace) => whitespace);

              decl.raws.between = decl.raws.between.replace(
                /:(.*)$/,
                `:${context.newline}${nextLinePrefix}`
              );
            };

            utils.report({
              message: m,
              node: decl,
              index: indexToCheck,
              endIndex: indexToCheck,
              result,
              ruleName,
              fix: shouldFix ? fix : undefined
            });
          }
        });
        break;
      }
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
