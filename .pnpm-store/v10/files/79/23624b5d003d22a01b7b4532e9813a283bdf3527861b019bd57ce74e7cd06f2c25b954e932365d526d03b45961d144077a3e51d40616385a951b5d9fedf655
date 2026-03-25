import { c as createRule, F as isParenthesised } from '../utils.js';
import '@typescript-eslint/types';
import '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

function isConditional(node) {
  return node.type === "ConditionalExpression";
}
var noConfusingArrow = createRule({
  name: "no-confusing-arrow",
  meta: {
    type: "layout",
    docs: {
      description: "Disallow arrow functions where they could be confused with comparisons"
    },
    fixable: "code",
    schema: [{
      type: "object",
      properties: {
        allowParens: { type: "boolean", default: true },
        onlyOneSimpleParam: { type: "boolean", default: false }
      },
      additionalProperties: false
    }],
    messages: {
      confusing: "Arrow function used ambiguously with a conditional expression."
    }
  },
  create(context) {
    const config = context.options[0] || {};
    const allowParens = config.allowParens || config.allowParens === void 0;
    const onlyOneSimpleParam = config.onlyOneSimpleParam;
    const sourceCode = context.sourceCode;
    function checkArrowFunc(node) {
      const body = node.body;
      if (isConditional(body) && !(allowParens && isParenthesised(sourceCode, body)) && !(onlyOneSimpleParam && !(node.params.length === 1 && node.params[0].type === "Identifier"))) {
        context.report({
          node,
          messageId: "confusing",
          fix(fixer) {
            return allowParens ? fixer.replaceText(node.body, `(${sourceCode.getText(node.body)})`) : null;
          }
        });
      }
    }
    return {
      ArrowFunctionExpression: checkArrowFunc
    };
  }
});

export { noConfusingArrow as default };
