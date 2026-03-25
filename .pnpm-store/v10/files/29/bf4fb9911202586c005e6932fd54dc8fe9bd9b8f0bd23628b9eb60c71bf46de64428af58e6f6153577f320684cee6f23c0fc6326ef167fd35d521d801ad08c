import { c as createRule, h as hasCommentsBetween } from '../utils.js';
import '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var implicitArrowLinebreak = createRule({
  name: "implicit-arrow-linebreak",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce the location of arrow function bodies"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "string",
        enum: ["beside", "below"]
      }
    ],
    messages: {
      expected: "Expected a linebreak before this expression.",
      unexpected: "Expected no linebreak before this expression."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const option = context.options[0] || "beside";
    function validateExpression(node) {
      if (node.body.type === "BlockStatement")
        return;
      const arrowToken = sourceCode.getTokenBefore(node.body, astUtilsExports.isNotOpeningParenToken);
      const firstTokenOfBody = sourceCode.getTokenAfter(arrowToken);
      const onSameLine = astUtilsExports.isTokenOnSameLine(arrowToken, firstTokenOfBody);
      if (onSameLine && option === "below") {
        context.report({
          node: firstTokenOfBody,
          messageId: "expected",
          fix: (fixer) => fixer.insertTextBefore(firstTokenOfBody, "\n")
        });
      } else if (!onSameLine && option === "beside") {
        context.report({
          node: firstTokenOfBody,
          messageId: "unexpected",
          fix(fixer) {
            if (hasCommentsBetween(sourceCode, arrowToken, firstTokenOfBody))
              return null;
            return fixer.replaceTextRange([arrowToken.range[1], firstTokenOfBody.range[0]], " ");
          }
        });
      }
    }
    return {
      ArrowFunctionExpression: (node) => validateExpression(node)
    };
  }
});

export { implicitArrowLinebreak as default };
