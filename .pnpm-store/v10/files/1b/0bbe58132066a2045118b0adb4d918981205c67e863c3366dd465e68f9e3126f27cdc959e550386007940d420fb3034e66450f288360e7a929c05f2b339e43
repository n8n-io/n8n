"use strict";

const { utils } = require("stylelint");
const blockString = require("../../utils/blockString");
const hasEmptyLine = require("../../utils/hasEmptyLine");
const isSingleLineString = require("../../utils/isSingleLineString");
const namespace = require("../../utils/namespace");
const optionsHaveException = require("../../utils/optionsHaveException");
const optionsHaveIgnored = require("../../utils/optionsHaveIgnored");
const ruleUrl = require("../../utils/ruleUrl");
const { isBoolean } = require("../../utils/validateTypes");

const ruleName = namespace("dollar-variable-empty-line-after");

const messages = utils.ruleMessages(ruleName, {
  expected: "Expected an empty line after $-variable",
  rejected: "Unexpected empty line after $-variable"
});

const meta = {
  url: ruleUrl(ruleName),
  fixable: true
};

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
          except: ["last-nested", "before-comment", "before-dollar-variable"],
          ignore: ["before-comment", "inside-single-line-block"],
          disableFix: isBoolean
        },
        optional: true
      }
    );

    if (!validOptions) {
      return;
    }

    const fixNext = (decl, match, replace) => {
      decl.raws.before = decl.raws.before.replace(
        new RegExp(`^${match}`),
        replace
      );
    };

    const fixParent = (decl, match, replace) => {
      decl.parent.raws.after = decl.parent.raws.after.replace(
        new RegExp(`^${match}`),
        replace
      );
    };

    const hasNewline = str => str.indexOf(context.newline) > -1;
    const isDollarVar = node => node.prop && node.prop[0] === "$";

    root.walkDecls(decl => {
      let expectEmptyLineAfter = expectation === "always";
      const exceptLastNested = optionsHaveException(options, "last-nested");
      const exceptBeforeComment = optionsHaveException(
        options,
        "before-comment"
      );
      const exceptBeforeVariable = optionsHaveException(
        options,
        "before-dollar-variable"
      );
      const ignoreInsideSingleLineBlock = optionsHaveIgnored(
        options,
        "inside-single-line-block"
      );
      const ignoreBeforeComment = optionsHaveIgnored(options, "before-comment");

      const isSingleLineDeclaration = isSingleLineString(
        blockString(decl.parent)
      );

      // Ignore declarations that aren't variables.
      // ------------------------------------------
      if (!isDollarVar(decl)) {
        return;
      }

      // Ignore declaration if it's the last line in a file.
      // ---------------------------------------------------
      if (decl === root.last) {
        return;
      }

      // Ignore single line blocks (if chosen as an option).
      // ---------------------------------------------------
      if (
        ignoreInsideSingleLineBlock &&
        decl.parent.type !== "root" &&
        isSingleLineDeclaration
      ) {
        return;
      }

      const next = decl.next();

      // The declaration is the last in a block.
      // ---------------------------------------
      if (!next) {
        const hasEmptyLineAfter = hasEmptyLine(decl.parent.raws.after);

        if (
          (expectEmptyLineAfter && hasEmptyLineAfter && !exceptLastNested) ||
          (!expectEmptyLineAfter && !hasEmptyLineAfter && !exceptLastNested) ||
          (expectEmptyLineAfter && !hasEmptyLineAfter && exceptLastNested) ||
          (!expectEmptyLineAfter && hasEmptyLineAfter && exceptLastNested)
        ) {
          return;
        }
      }

      // The declaration is NOT the last in a block.
      // -------------------------------------------
      else {
        const hasEmptyLineAfter = hasEmptyLine(next.raws.before);
        const nextIsComment = next.type === "comment";
        const nextIsVariable = isDollarVar(next);

        if (nextIsComment) {
          if (
            ignoreBeforeComment ||
            (expectEmptyLineAfter &&
              hasEmptyLineAfter &&
              !exceptBeforeComment) ||
            (!expectEmptyLineAfter &&
              !hasEmptyLineAfter &&
              !exceptBeforeComment) ||
            (expectEmptyLineAfter &&
              !hasEmptyLineAfter &&
              exceptBeforeComment) ||
            (!expectEmptyLineAfter && hasEmptyLineAfter && exceptBeforeComment)
          ) {
            return;
          }
        } else if (nextIsVariable) {
          if (
            (expectEmptyLineAfter &&
              hasEmptyLineAfter &&
              !exceptBeforeVariable) ||
            (!expectEmptyLineAfter &&
              !hasEmptyLineAfter &&
              !exceptBeforeVariable) ||
            (expectEmptyLineAfter &&
              !hasEmptyLineAfter &&
              exceptBeforeVariable) ||
            (!expectEmptyLineAfter &&
              hasEmptyLineAfter &&
              exceptBeforeVariable) ||
            (expectEmptyLineAfter && hasEmptyLineAfter && exceptBeforeVariable)
          ) {
            return;
          }
        } else if (expectEmptyLineAfter === hasEmptyLineAfter) {
          return;
        }
      }

      const isFixDisabled = options && options.disableFix === true;

      const fixCallback = () => {
        if (next) {
          const nextBefore = next.raws.before;
          const hasEmptyLineAfter = hasEmptyLine(nextBefore);
          const nextIsComment = next.type === "comment";
          const nextIsVariable = isDollarVar(next);

          if (expectEmptyLineAfter && !hasEmptyLineAfter) {
            fixNext(next, context.newline, context.newline + context.newline);

            if (exceptLastNested && !hasNewline(nextBefore)) {
              fixNext(next, "\\s+", context.newline + context.newline);
            }

            return;
          } else if (
            (expectEmptyLineAfter &&
              exceptBeforeComment &&
              nextIsComment &&
              hasEmptyLineAfter) ||
            (expectEmptyLineAfter &&
              exceptBeforeVariable &&
              nextIsVariable &&
              hasEmptyLineAfter) ||
            (!expectEmptyLineAfter && hasEmptyLineAfter)
          ) {
            fixNext(decl, "\\n\\r\\n", "\r\n");
            fixNext(next, context.newline + context.newline, context.newline);

            return;
          } else if (
            (!expectEmptyLineAfter &&
              exceptBeforeComment &&
              nextIsComment &&
              !hasEmptyLineAfter) ||
            (!expectEmptyLineAfter &&
              exceptBeforeVariable &&
              nextIsVariable &&
              !hasEmptyLineAfter)
          ) {
            fixNext(next, context.newline, context.newline + context.newline);

            return;
          }
        } else {
          const hasEmptyLineAfter = hasEmptyLine(decl.parent.raws.after);

          expectEmptyLineAfter = exceptLastNested
            ? !expectEmptyLineAfter
            : expectEmptyLineAfter;

          if (expectEmptyLineAfter && !hasEmptyLineAfter) {
            fixParent(decl, context.newline, context.newline + context.newline);

            return;
          } else if (!expectEmptyLineAfter && hasEmptyLineAfter) {
            fixParent(decl, "\\n\\r\\n", "\r\n");
            fixParent(decl, context.newline + context.newline, context.newline);

            return;
          }
        }
      };

      utils.report({
        message: expectEmptyLineAfter ? messages.expected : messages.rejected,
        node: decl,
        result,
        ruleName,
        fix: isFixDisabled ? undefined : fixCallback
      });
    });
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

module.exports = rule;
