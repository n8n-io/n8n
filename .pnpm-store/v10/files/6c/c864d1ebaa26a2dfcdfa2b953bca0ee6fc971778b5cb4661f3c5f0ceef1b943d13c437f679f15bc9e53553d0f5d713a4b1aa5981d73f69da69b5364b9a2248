import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

var arrayBracketNewline = createRule({
  name: "array-bracket-newline",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce linebreaks after opening and before closing array brackets"
    },
    fixable: "whitespace",
    schema: [
      {
        oneOf: [
          {
            type: "string",
            enum: ["always", "never", "consistent"]
          },
          {
            type: "object",
            properties: {
              multiline: {
                type: "boolean"
              },
              minItems: {
                type: ["integer", "null"],
                minimum: 0
              }
            },
            additionalProperties: false
          }
        ]
      }
    ],
    messages: {
      unexpectedOpeningLinebreak: "There should be no linebreak after '['.",
      unexpectedClosingLinebreak: "There should be no linebreak before ']'.",
      missingOpeningLinebreak: "A linebreak is required after '['.",
      missingClosingLinebreak: "A linebreak is required before ']'."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    function normalizeOptionValue(option) {
      let consistent = false;
      let multiline = false;
      let minItems = 0;
      if (option) {
        if (option === "consistent") {
          consistent = true;
          minItems = Number.POSITIVE_INFINITY;
        } else if (option === "always" || typeof option !== "string" && option.minItems === 0) {
          minItems = 0;
        } else if (option === "never") {
          minItems = Number.POSITIVE_INFINITY;
        } else {
          multiline = Boolean(option.multiline);
          minItems = option.minItems || Number.POSITIVE_INFINITY;
        }
      } else {
        consistent = false;
        multiline = true;
        minItems = Number.POSITIVE_INFINITY;
      }
      return { consistent, multiline, minItems };
    }
    function normalizeOptions(options) {
      const value = normalizeOptionValue(options);
      return { ArrayExpression: value, ArrayPattern: value };
    }
    function reportNoBeginningLinebreak(node, token) {
      context.report({
        node,
        loc: token.loc,
        messageId: "unexpectedOpeningLinebreak",
        fix(fixer) {
          const nextToken = sourceCode.getTokenAfter(token, { includeComments: true });
          if (!nextToken || astUtilsExports.isCommentToken(nextToken))
            return null;
          return fixer.removeRange([token.range[1], nextToken.range[0]]);
        }
      });
    }
    function reportNoEndingLinebreak(node, token) {
      context.report({
        node,
        loc: token.loc,
        messageId: "unexpectedClosingLinebreak",
        fix(fixer) {
          const previousToken = sourceCode.getTokenBefore(token, { includeComments: true });
          if (!previousToken || astUtilsExports.isCommentToken(previousToken))
            return null;
          return fixer.removeRange([previousToken.range[1], token.range[0]]);
        }
      });
    }
    function reportRequiredBeginningLinebreak(node, token) {
      context.report({
        node,
        loc: token.loc,
        messageId: "missingOpeningLinebreak",
        fix(fixer) {
          return fixer.insertTextAfter(token, "\n");
        }
      });
    }
    function reportRequiredEndingLinebreak(node, token) {
      context.report({
        node,
        loc: token.loc,
        messageId: "missingClosingLinebreak",
        fix(fixer) {
          return fixer.insertTextBefore(token, "\n");
        }
      });
    }
    function check(node) {
      const elements = node.elements;
      const normalizedOptions = normalizeOptions(context.options[0]);
      const options = normalizedOptions[node.type];
      const openBracket = sourceCode.getFirstToken(node);
      const closeBracket = sourceCode.getLastToken(node);
      const firstIncComment = sourceCode.getTokenAfter(openBracket, { includeComments: true });
      const lastIncComment = sourceCode.getTokenBefore(closeBracket, { includeComments: true });
      const first = sourceCode.getTokenAfter(openBracket);
      const last = sourceCode.getTokenBefore(closeBracket);
      const needsLinebreaks = elements.length >= options.minItems || options.multiline && elements.length > 0 && !astUtilsExports.isTokenOnSameLine(lastIncComment, firstIncComment) || elements.length === 0 && firstIncComment.type === "Block" && !astUtilsExports.isTokenOnSameLine(lastIncComment, firstIncComment) && firstIncComment === lastIncComment || options.consistent && !astUtilsExports.isTokenOnSameLine(openBracket, first);
      if (needsLinebreaks) {
        if (astUtilsExports.isTokenOnSameLine(openBracket, first))
          reportRequiredBeginningLinebreak(node, openBracket);
        if (astUtilsExports.isTokenOnSameLine(last, closeBracket))
          reportRequiredEndingLinebreak(node, closeBracket);
      } else {
        if (!astUtilsExports.isTokenOnSameLine(openBracket, first))
          reportNoBeginningLinebreak(node, openBracket);
        if (!astUtilsExports.isTokenOnSameLine(last, closeBracket))
          reportNoEndingLinebreak(node, closeBracket);
      }
    }
    return {
      ArrayPattern: check,
      ArrayExpression: check
    };
  }
});

export { arrayBracketNewline as default };
