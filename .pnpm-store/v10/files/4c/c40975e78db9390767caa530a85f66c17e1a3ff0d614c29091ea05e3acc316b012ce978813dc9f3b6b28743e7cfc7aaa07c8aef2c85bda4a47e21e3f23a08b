import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

var functionCallSpacing = createRule({
  name: "function-call-spacing",
  meta: {
    type: "layout",
    docs: {
      description: "Require or disallow spacing between function identifiers and their invocations"
    },
    fixable: "whitespace",
    schema: {
      anyOf: [
        {
          type: "array",
          items: [
            {
              type: "string",
              enum: ["never"]
            }
          ],
          minItems: 0,
          maxItems: 1
        },
        {
          type: "array",
          items: [
            {
              type: "string",
              enum: ["always"]
            },
            {
              type: "object",
              properties: {
                allowNewlines: {
                  type: "boolean"
                },
                optionalChain: {
                  type: "object",
                  properties: {
                    before: {
                      type: "boolean"
                    },
                    after: {
                      type: "boolean"
                    }
                  },
                  additionalProperties: false
                }
              },
              additionalProperties: false
            }
          ],
          minItems: 0,
          maxItems: 2
        }
      ]
    },
    messages: {
      unexpectedWhitespace: "Unexpected whitespace between function name and paren.",
      unexpectedNewline: "Unexpected newline between function name and paren.",
      missing: "Missing space between function name and paren."
    }
  },
  defaultOptions: ["never", {}],
  create(context, [option, config]) {
    const sourceCode = context.sourceCode;
    const text = sourceCode.getText();
    const { allowNewlines = false, optionalChain = { before: true, after: true } } = config;
    function checkSpacing(node, leftToken, rightToken) {
      const isOptionalCall = astUtilsExports.isOptionalCallExpression(node);
      const textBetweenTokens = text.slice(leftToken.range[1], rightToken.range[0]).replace(/\/\*.*?\*\//gu, "");
      const hasWhitespace = /\s/u.test(textBetweenTokens);
      const hasNewline = hasWhitespace && astUtilsExports.LINEBREAK_MATCHER.test(textBetweenTokens);
      if (option === "never") {
        if (hasWhitespace) {
          return context.report({
            node,
            loc: {
              start: leftToken.loc.end,
              end: rightToken.loc.start
            },
            messageId: "unexpectedWhitespace",
            fix(fixer) {
              if (sourceCode.commentsExistBetween(leftToken, rightToken))
                return null;
              if (isOptionalCall) {
                return fixer.replaceTextRange([
                  leftToken.range[1],
                  rightToken.range[0]
                ], "?.");
              }
              return fixer.removeRange([
                leftToken.range[1],
                rightToken.range[0]
              ]);
            }
          });
        }
      } else if (isOptionalCall) {
        const { before: beforeOptionChain = true, after: afterOptionChain = true } = optionalChain;
        const hasPrefixSpace = /^\s/u.test(textBetweenTokens);
        const hasSuffixSpace = /\s$/u.test(textBetweenTokens);
        const hasCorrectPrefixSpace = beforeOptionChain ? hasPrefixSpace : !hasPrefixSpace;
        const hasCorrectSuffixSpace = afterOptionChain ? hasSuffixSpace : !hasSuffixSpace;
        const hasCorrectNewline = allowNewlines || !hasNewline;
        if (!hasCorrectPrefixSpace || !hasCorrectSuffixSpace || !hasCorrectNewline) {
          const messageId = !hasCorrectNewline ? "unexpectedNewline" : !beforeOptionChain && hasPrefixSpace || !afterOptionChain && hasSuffixSpace ? "unexpectedWhitespace" : "missing";
          context.report({
            node,
            loc: {
              start: leftToken.loc.end,
              end: rightToken.loc.start
            },
            messageId,
            fix(fixer) {
              if (sourceCode.commentsExistBetween(leftToken, rightToken))
                return null;
              let text2 = textBetweenTokens;
              if (!allowNewlines) {
                const GLOBAL_LINEBREAK_MATCHER = new RegExp(astUtilsExports.LINEBREAK_MATCHER.source, "g");
                text2 = text2.replaceAll(GLOBAL_LINEBREAK_MATCHER, " ");
              }
              if (!hasCorrectPrefixSpace)
                text2 = beforeOptionChain ? ` ${text2}` : text2.trimStart();
              if (!hasCorrectSuffixSpace)
                text2 = afterOptionChain ? `${text2} ` : text2.trimEnd();
              return fixer.replaceTextRange([leftToken.range[1], rightToken.range[0]], text2);
            }
          });
        }
      } else {
        if (!hasWhitespace) {
          context.report({
            node,
            loc: {
              start: leftToken.loc.end,
              end: rightToken.loc.start
            },
            messageId: "missing",
            fix(fixer) {
              return fixer.insertTextBefore(rightToken, " ");
            }
          });
        } else if (!allowNewlines && hasNewline) {
          context.report({
            node,
            loc: {
              start: leftToken.loc.end,
              end: rightToken.loc.start
            },
            messageId: "unexpectedNewline",
            fix(fixer) {
              if (sourceCode.commentsExistBetween(leftToken, rightToken))
                return null;
              return fixer.replaceTextRange(
                [leftToken.range[1], rightToken.range[0]],
                " "
              );
            }
          });
        }
      }
    }
    return {
      "CallExpression, NewExpression": function(node) {
        const closingParenToken = sourceCode.getLastToken(node);
        const lastCalleeTokenWithoutPossibleParens = sourceCode.getLastToken(
          node.typeArguments ?? node.callee
        );
        const openingParenToken = sourceCode.getFirstTokenBetween(
          lastCalleeTokenWithoutPossibleParens,
          closingParenToken,
          astUtilsExports.isOpeningParenToken
        );
        if (!openingParenToken || openingParenToken.range[1] >= node.range[1]) {
          return;
        }
        const lastCalleeToken = sourceCode.getTokenBefore(
          openingParenToken,
          astUtilsExports.isNotOptionalChainPunctuator
        );
        checkSpacing(node, lastCalleeToken, openingParenToken);
      },
      ImportExpression(node) {
        const leftToken = sourceCode.getFirstToken(node);
        const rightToken = sourceCode.getTokenAfter(leftToken);
        checkSpacing(node, leftToken, rightToken);
      }
    };
  }
});

export { functionCallSpacing as default };
