import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import '../vendor.js';
import '@typescript-eslint/types';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var restSpreadSpacing = createRule({
  name: "rest-spread-spacing",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce spacing between rest and spread operators and their expressions"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "string",
        enum: ["always", "never"]
      }
    ],
    messages: {
      unexpectedWhitespace: "Unexpected whitespace after {{type}} operator.",
      expectedWhitespace: "Expected whitespace after {{type}} operator."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const alwaysSpace = context.options[0] === "always";
    function checkWhiteSpace(node) {
      const operator = sourceCode.getFirstToken(node);
      const nextToken = sourceCode.getTokenAfter(operator);
      const hasWhitespace = sourceCode.isSpaceBetween(operator, nextToken);
      let type;
      switch (node.type) {
        case "SpreadElement":
          type = "spread";
          if (node.parent.type === "ObjectExpression")
            type += " property";
          break;
        case "RestElement":
          type = "rest";
          if (node.parent.type === "ObjectPattern")
            type += " property";
          break;
        default:
          return;
      }
      if (alwaysSpace && !hasWhitespace) {
        context.report({
          node,
          loc: operator.loc,
          messageId: "expectedWhitespace",
          data: {
            type
          },
          fix(fixer) {
            return fixer.replaceTextRange([operator.range[1], nextToken.range[0]], " ");
          }
        });
      } else if (!alwaysSpace && hasWhitespace) {
        context.report({
          node,
          loc: {
            start: operator.loc.end,
            end: nextToken.loc.start
          },
          messageId: "unexpectedWhitespace",
          data: {
            type
          },
          fix(fixer) {
            return fixer.removeRange([operator.range[1], nextToken.range[0]]);
          }
        });
      }
    }
    return {
      SpreadElement: checkWhiteSpace,
      RestElement: checkWhiteSpace
    };
  }
});

export { restSpreadSpacing as default };
