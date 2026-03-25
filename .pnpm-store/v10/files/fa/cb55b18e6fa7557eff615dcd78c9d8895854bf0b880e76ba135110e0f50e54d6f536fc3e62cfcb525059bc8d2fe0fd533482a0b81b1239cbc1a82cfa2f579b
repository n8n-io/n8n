import { c as createRule, S as STATEMENT_LIST_PARENTS } from '../utils.js';
import '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var braceStyle = createRule({
  name: "brace-style",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent brace style for blocks"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "string",
        enum: ["1tbs", "stroustrup", "allman"]
      },
      {
        type: "object",
        properties: {
          allowSingleLine: {
            type: "boolean",
            default: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      nextLineOpen: "Opening curly brace does not appear on the same line as controlling statement.",
      sameLineOpen: "Opening curly brace appears on the same line as controlling statement.",
      blockSameLine: "Statement inside of curly braces should be on next line.",
      nextLineClose: "Closing curly brace does not appear on the same line as the subsequent block.",
      singleLineClose: "Closing curly brace should be on the same line as opening curly brace or on the line after the previous block.",
      sameLineClose: "Closing curly brace appears on the same line as the subsequent block."
    }
  },
  defaultOptions: ["1tbs", { allowSingleLine: false }],
  create(context, optionsWithDefaults) {
    const [
      style,
      { allowSingleLine } = { }
    ] = optionsWithDefaults;
    const isAllmanStyle = style === "allman";
    const sourceCode = context.sourceCode;
    function removeNewlineBetween(firstToken, secondToken) {
      const textRange = [firstToken.range[1], secondToken.range[0]];
      const textBetween = sourceCode.text.slice(textRange[0], textRange[1]);
      if (textBetween.trim())
        return null;
      return (fixer) => fixer.replaceTextRange(textRange, " ");
    }
    function validateCurlyPair(openingCurlyToken, closingCurlyToken) {
      const tokenBeforeOpeningCurly = sourceCode.getTokenBefore(openingCurlyToken);
      const tokenBeforeClosingCurly = sourceCode.getTokenBefore(closingCurlyToken);
      const tokenAfterOpeningCurly = sourceCode.getTokenAfter(openingCurlyToken);
      const singleLineException = allowSingleLine && astUtilsExports.isTokenOnSameLine(openingCurlyToken, closingCurlyToken);
      if (!isAllmanStyle && !astUtilsExports.isTokenOnSameLine(tokenBeforeOpeningCurly, openingCurlyToken)) {
        context.report({
          node: openingCurlyToken,
          messageId: "nextLineOpen",
          fix: removeNewlineBetween(
            tokenBeforeOpeningCurly,
            openingCurlyToken
          )
        });
      }
      if (isAllmanStyle && astUtilsExports.isTokenOnSameLine(tokenBeforeOpeningCurly, openingCurlyToken) && !singleLineException) {
        context.report({
          node: openingCurlyToken,
          messageId: "sameLineOpen",
          fix: (fixer) => fixer.insertTextBefore(openingCurlyToken, "\n")
        });
      }
      if (astUtilsExports.isTokenOnSameLine(openingCurlyToken, tokenAfterOpeningCurly) && tokenAfterOpeningCurly !== closingCurlyToken && !singleLineException) {
        context.report({
          node: openingCurlyToken,
          messageId: "blockSameLine",
          fix: (fixer) => fixer.insertTextAfter(openingCurlyToken, "\n")
        });
      }
      if (astUtilsExports.isTokenOnSameLine(tokenBeforeClosingCurly, closingCurlyToken) && tokenBeforeClosingCurly !== openingCurlyToken && !singleLineException) {
        context.report({
          node: closingCurlyToken,
          messageId: "singleLineClose",
          fix: (fixer) => fixer.insertTextBefore(closingCurlyToken, "\n")
        });
      }
    }
    function validateCurlyBeforeKeyword(curlyToken) {
      const keywordToken = sourceCode.getTokenAfter(curlyToken);
      if (style === "1tbs" && !astUtilsExports.isTokenOnSameLine(curlyToken, keywordToken)) {
        context.report({
          node: curlyToken,
          messageId: "nextLineClose",
          fix: removeNewlineBetween(curlyToken, keywordToken)
        });
      }
      if (style !== "1tbs" && astUtilsExports.isTokenOnSameLine(curlyToken, keywordToken)) {
        context.report({
          node: curlyToken,
          messageId: "sameLineClose",
          fix: (fixer) => fixer.insertTextAfter(curlyToken, "\n")
        });
      }
    }
    return {
      BlockStatement(node) {
        if (!STATEMENT_LIST_PARENTS.has(node.parent.type))
          validateCurlyPair(sourceCode.getFirstToken(node), sourceCode.getLastToken(node));
      },
      StaticBlock(node) {
        validateCurlyPair(
          sourceCode.getFirstToken(node, { skip: 1 }),
          // skip the `static` token
          sourceCode.getLastToken(node)
        );
      },
      ClassBody(node) {
        validateCurlyPair(sourceCode.getFirstToken(node), sourceCode.getLastToken(node));
      },
      SwitchStatement(node) {
        const closingCurly = sourceCode.getLastToken(node);
        const openingCurly = sourceCode.getTokenBefore(node.cases.length ? node.cases[0] : closingCurly);
        validateCurlyPair(openingCurly, closingCurly);
      },
      IfStatement(node) {
        if (node.consequent.type === "BlockStatement" && node.alternate) {
          validateCurlyBeforeKeyword(sourceCode.getLastToken(node.consequent));
        }
      },
      TryStatement(node) {
        validateCurlyBeforeKeyword(sourceCode.getLastToken(node.block));
        if (node.handler && node.finalizer) {
          validateCurlyBeforeKeyword(sourceCode.getLastToken(node.handler.body));
        }
      },
      TSModuleBlock(node) {
        const openingCurly = sourceCode.getFirstToken(node);
        const closingCurly = sourceCode.getLastToken(node);
        validateCurlyPair(openingCurly, closingCurly);
      }
    };
  }
});

export { braceStyle as default };
