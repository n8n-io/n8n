import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

var arrowSpacing = createRule({
  name: "arrow-spacing",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent spacing before and after the arrow in arrow functions"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "object",
        properties: {
          before: {
            type: "boolean",
            default: true
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
      expectedBefore: "Missing space before =>.",
      unexpectedBefore: "Unexpected space before =>.",
      expectedAfter: "Missing space after =>.",
      unexpectedAfter: "Unexpected space after =>."
    }
  },
  create(context) {
    const rule = Object.assign({}, context.options[0]);
    rule.before = rule.before !== false;
    rule.after = rule.after !== false;
    const sourceCode = context.sourceCode;
    function getTokens(node) {
      const arrow = sourceCode.getTokenBefore(node.body, astUtilsExports.isArrowToken);
      return {
        before: sourceCode.getTokenBefore(arrow),
        arrow,
        after: sourceCode.getTokenAfter(arrow)
      };
    }
    function countSpaces(tokens) {
      const before = tokens.arrow.range[0] - tokens.before.range[1];
      const after = tokens.after.range[0] - tokens.arrow.range[1];
      return { before, after };
    }
    function spaces(node) {
      const tokens = getTokens(node);
      const countSpace = countSpaces(tokens);
      if (rule.before) {
        if (countSpace.before === 0) {
          context.report({
            node: tokens.before,
            messageId: "expectedBefore",
            fix(fixer) {
              return fixer.insertTextBefore(tokens.arrow, " ");
            }
          });
        }
      } else {
        if (countSpace.before > 0) {
          context.report({
            node: tokens.before,
            messageId: "unexpectedBefore",
            fix(fixer) {
              return fixer.removeRange([tokens.before.range[1], tokens.arrow.range[0]]);
            }
          });
        }
      }
      if (rule.after) {
        if (countSpace.after === 0) {
          context.report({
            node: tokens.after,
            messageId: "expectedAfter",
            fix(fixer) {
              return fixer.insertTextAfter(tokens.arrow, " ");
            }
          });
        }
      } else {
        if (countSpace.after > 0) {
          context.report({
            node: tokens.after,
            messageId: "unexpectedAfter",
            fix(fixer) {
              return fixer.removeRange([tokens.arrow.range[1], tokens.after.range[0]]);
            }
          });
        }
      }
    }
    return {
      ArrowFunctionExpression: spaces
    };
  }
});

export { arrowSpacing as default };
