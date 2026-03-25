import { c as createRule, u as isStringLiteral, v as isSurroundedBy } from '../utils.js';
import '@typescript-eslint/types';
import '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const QUOTE_SETTINGS = {
  "prefer-double": {
    quote: '"',
    description: "singlequote",
    convert(str) {
      return str.replace(/'/gu, '"');
    }
  },
  "prefer-single": {
    quote: "'",
    description: "doublequote",
    convert(str) {
      return str.replace(/"/gu, "'");
    }
  }
};
var jsxQuotes = createRule({
  name: "jsx-quotes",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce the consistent use of either double or single quotes in JSX attributes"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "string",
        enum: ["prefer-single", "prefer-double"]
      }
    ],
    messages: {
      unexpected: "Unexpected usage of {{description}}."
    }
  },
  create(context) {
    const quoteOption = context.options[0] || "prefer-double";
    const setting = QUOTE_SETTINGS[quoteOption];
    function usesExpectedQuotes(node) {
      return node.value.includes(setting.quote) || isSurroundedBy(node.raw, setting.quote);
    }
    return {
      JSXAttribute(node) {
        const attributeValue = node.value;
        if (attributeValue && isStringLiteral(attributeValue) && !usesExpectedQuotes(attributeValue)) {
          context.report({
            node: attributeValue,
            messageId: "unexpected",
            data: {
              description: setting.description
            },
            fix(fixer) {
              return fixer.replaceText(attributeValue, setting.convert(attributeValue.raw));
            }
          });
        }
      }
    };
  }
});

export { jsxQuotes as default };
