import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

var templateCurlySpacing = createRule({
  name: "template-curly-spacing",
  meta: {
    type: "layout",
    docs: {
      description: "Require or disallow spacing around embedded expressions of template strings"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "string",
        enum: ["always", "never"]
      }
    ],
    messages: {
      expectedBefore: "Expected space(s) before '}'.",
      expectedAfter: "Expected space(s) after '${'.",
      unexpectedBefore: "Unexpected space(s) before '}'.",
      unexpectedAfter: "Unexpected space(s) after '${'."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const always = context.options[0] === "always";
    function checkSpacingBefore(token) {
      if (!token.value.startsWith("}"))
        return;
      const prevToken = sourceCode.getTokenBefore(token, { includeComments: true });
      const hasSpace = sourceCode.isSpaceBetween(prevToken, token);
      if (!astUtilsExports.isTokenOnSameLine(prevToken, token))
        return;
      if (always && !hasSpace) {
        context.report({
          loc: {
            start: token.loc.start,
            end: {
              line: token.loc.start.line,
              column: token.loc.start.column + 1
            }
          },
          messageId: "expectedBefore",
          fix: (fixer) => fixer.insertTextBefore(token, " ")
        });
      }
      if (!always && hasSpace) {
        context.report({
          loc: {
            start: prevToken.loc.end,
            end: token.loc.start
          },
          messageId: "unexpectedBefore",
          fix: (fixer) => fixer.removeRange([prevToken.range[1], token.range[0]])
        });
      }
    }
    function checkSpacingAfter(token) {
      if (!token.value.endsWith("${"))
        return;
      const nextToken = sourceCode.getTokenAfter(token, { includeComments: true });
      const hasSpace = sourceCode.isSpaceBetween(token, nextToken);
      if (!astUtilsExports.isTokenOnSameLine(token, nextToken))
        return;
      if (always && !hasSpace) {
        context.report({
          loc: {
            start: {
              line: token.loc.end.line,
              column: token.loc.end.column - 2
            },
            end: token.loc.end
          },
          messageId: "expectedAfter",
          fix: (fixer) => fixer.insertTextAfter(token, " ")
        });
      }
      if (!always && hasSpace) {
        context.report({
          loc: {
            start: token.loc.end,
            end: nextToken.loc.start
          },
          messageId: "unexpectedAfter",
          fix: (fixer) => fixer.removeRange([token.range[1], nextToken.range[0]])
        });
      }
    }
    return {
      TemplateElement(node) {
        const token = sourceCode.getFirstToken(node);
        checkSpacingBefore(token);
        checkSpacingAfter(token);
      }
    };
  }
});

export { templateCurlySpacing as default };
