import { c as createRule, i as isSingleLine } from '../utils.js';
import '@typescript-eslint/types';
import '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const messages = {
  propOnNewLine: "Property should be placed on a new line",
  propOnSameLine: "Property should be placed on the same line as the component declaration"
};
var jsxFirstPropNewLine = createRule({
  name: "jsx-first-prop-new-line",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce proper position of the first property in JSX"
    },
    fixable: "code",
    messages,
    schema: [
      {
        type: "string",
        enum: ["always", "never", "multiline", "multiline-multiprop", "multiprop"]
      }
    ]
  },
  create(context) {
    const configuration = context.options[0] || "multiline-multiprop";
    return {
      JSXOpeningElement(node) {
        if (configuration === "multiline" && !isSingleLine(node) || configuration === "multiline-multiprop" && !isSingleLine(node) && node.attributes.length > 1 || configuration === "multiprop" && node.attributes.length > 1 || configuration === "always") {
          node.attributes.some((decl) => {
            if (decl.loc.start.line === node.loc.start.line) {
              context.report({
                node: decl,
                messageId: "propOnNewLine",
                fix(fixer) {
                  return fixer.replaceTextRange([(node.typeArguments || node.name).range[1], decl.range[0]], "\n");
                }
              });
            }
            return true;
          });
        } else if (configuration === "never" && node.attributes.length > 0 || configuration === "multiprop" && !isSingleLine(node) && node.attributes.length <= 1) {
          const firstNode = node.attributes[0];
          if (node.loc.start.line < firstNode.loc.start.line) {
            context.report({
              node: firstNode,
              messageId: "propOnSameLine",
              fix(fixer) {
                return fixer.replaceTextRange([node.name.range[1], firstNode.range[0]], " ");
              }
            });
          }
        }
      }
    };
  }
});

export { jsxFirstPropNewLine as default };
