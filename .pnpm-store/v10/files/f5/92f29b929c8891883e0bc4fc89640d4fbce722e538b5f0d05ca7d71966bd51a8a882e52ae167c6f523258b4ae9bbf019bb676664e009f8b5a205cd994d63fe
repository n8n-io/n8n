import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

var semiSpacing = createRule({
  name: "semi-spacing",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent spacing before and after semicolons"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "object",
        properties: {
          before: {
            type: "boolean",
            default: false
          },
          after: {
            type: "boolean",
            default: true
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unexpectedWhitespaceBefore: "Unexpected whitespace before semicolon.",
      unexpectedWhitespaceAfter: "Unexpected whitespace after semicolon.",
      missingWhitespaceBefore: "Missing whitespace before semicolon.",
      missingWhitespaceAfter: "Missing whitespace after semicolon."
    }
  },
  create(context) {
    const config = context.options[0];
    const sourceCode = context.sourceCode;
    let requireSpaceBefore = false;
    let requireSpaceAfter = true;
    if (typeof config === "object") {
      requireSpaceBefore = config.before;
      requireSpaceAfter = config.after;
    }
    function hasLeadingSpace(token) {
      const tokenBefore = sourceCode.getTokenBefore(token);
      return tokenBefore && astUtilsExports.isTokenOnSameLine(tokenBefore, token) && sourceCode.isSpaceBetween(tokenBefore, token);
    }
    function hasTrailingSpace(token) {
      const tokenAfter = sourceCode.getTokenAfter(token);
      return tokenAfter && astUtilsExports.isTokenOnSameLine(token, tokenAfter) && sourceCode.isSpaceBetween(token, tokenAfter);
    }
    function isLastTokenInCurrentLine(token) {
      const tokenAfter = sourceCode.getTokenAfter(token);
      return !(tokenAfter && astUtilsExports.isTokenOnSameLine(token, tokenAfter));
    }
    function isFirstTokenInCurrentLine(token) {
      const tokenBefore = sourceCode.getTokenBefore(token);
      return !(tokenBefore && astUtilsExports.isTokenOnSameLine(token, tokenBefore));
    }
    function isBeforeClosingParen(token) {
      const nextToken = sourceCode.getTokenAfter(token);
      return nextToken && astUtilsExports.isClosingBraceToken(nextToken) || astUtilsExports.isClosingParenToken(nextToken);
    }
    function checkSemicolonSpacing(token, node) {
      if (astUtilsExports.isSemicolonToken(token)) {
        if (hasLeadingSpace(token)) {
          if (!requireSpaceBefore) {
            const tokenBefore = sourceCode.getTokenBefore(token);
            const loc = {
              start: tokenBefore.loc.end,
              end: token.loc.start
            };
            context.report({
              node,
              loc,
              messageId: "unexpectedWhitespaceBefore",
              fix(fixer) {
                return fixer.removeRange([tokenBefore.range[1], token.range[0]]);
              }
            });
          }
        } else {
          if (requireSpaceBefore) {
            const loc = token.loc;
            context.report({
              node,
              loc,
              messageId: "missingWhitespaceBefore",
              fix(fixer) {
                return fixer.insertTextBefore(token, " ");
              }
            });
          }
        }
        if (!isFirstTokenInCurrentLine(token) && !isLastTokenInCurrentLine(token) && !isBeforeClosingParen(token)) {
          if (hasTrailingSpace(token)) {
            if (!requireSpaceAfter) {
              const tokenAfter = sourceCode.getTokenAfter(token);
              const loc = {
                start: token.loc.end,
                end: tokenAfter.loc.start
              };
              context.report({
                node,
                loc,
                messageId: "unexpectedWhitespaceAfter",
                fix(fixer) {
                  return fixer.removeRange([token.range[1], tokenAfter.range[0]]);
                }
              });
            }
          } else {
            if (requireSpaceAfter) {
              const loc = token.loc;
              context.report({
                node,
                loc,
                messageId: "missingWhitespaceAfter",
                fix(fixer) {
                  return fixer.insertTextAfter(token, " ");
                }
              });
            }
          }
        }
      }
    }
    function checkNode(node) {
      const token = sourceCode.getLastToken(node);
      checkSemicolonSpacing(token, node);
    }
    return {
      VariableDeclaration: checkNode,
      ExpressionStatement: checkNode,
      BreakStatement: checkNode,
      ContinueStatement: checkNode,
      DebuggerStatement: checkNode,
      DoWhileStatement: checkNode,
      ReturnStatement: checkNode,
      ThrowStatement: checkNode,
      ImportDeclaration: checkNode,
      ExportNamedDeclaration: checkNode,
      ExportAllDeclaration: checkNode,
      ExportDefaultDeclaration: checkNode,
      ForStatement(node) {
        if (node.init)
          checkSemicolonSpacing(sourceCode.getTokenAfter(node.init), node);
        if (node.test)
          checkSemicolonSpacing(sourceCode.getTokenAfter(node.test), node);
      },
      PropertyDefinition: checkNode,
      TSDeclareFunction: checkNode,
      TSTypeAliasDeclaration: checkNode,
      TSTypeAnnotation(node) {
        const excludeNodeTypes = /* @__PURE__ */ new Set([
          AST_NODE_TYPES.TSDeclareFunction
        ]);
        if (node.parent && !excludeNodeTypes.has(node.parent.type))
          checkNode(node.parent);
      }
    };
  }
});

export { semiSpacing as default };
