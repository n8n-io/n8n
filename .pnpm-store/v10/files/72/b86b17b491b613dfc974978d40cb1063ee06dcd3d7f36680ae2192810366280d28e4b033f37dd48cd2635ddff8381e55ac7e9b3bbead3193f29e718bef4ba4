import { c as createRule, r as isDOMComponent } from '../utils.js';
import '@eslint-community/eslint-utils';
import '../vendor.js';
import '@typescript-eslint/types';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const optionDefaults = { component: true, html: true };
const messages = {
  notSelfClosing: "Empty components are self-closing"
};
var jsxSelfClosingComp = createRule({
  name: "jsx-self-closing-comp",
  meta: {
    type: "layout",
    docs: {
      description: "Disallow extra closing tags for components without children"
    },
    fixable: "code",
    messages,
    schema: [
      {
        type: "object",
        properties: {
          component: {
            default: optionDefaults.component,
            type: "boolean"
          },
          html: {
            default: optionDefaults.html,
            type: "boolean"
          }
        },
        additionalProperties: false
      }
    ]
  },
  create(context) {
    function isComponent(node) {
      return node.name && (node.name.type === "JSXIdentifier" || node.name.type === "JSXMemberExpression") && !isDOMComponent(node);
    }
    function childrenIsEmpty(node) {
      return node.parent.children.length === 0;
    }
    function childrenIsMultilineSpaces(node) {
      const childrens = node.parent.children;
      return childrens.length === 1 && childrens[0].type === "JSXText" && childrens[0].value.includes("\n") && childrens[0].value.replace(/(?!\xA0)\s/g, "") === "";
    }
    function isShouldBeSelfClosed(node) {
      const configuration = Object.assign({}, optionDefaults, context.options[0]);
      return (configuration.component && isComponent(node) || configuration.html && isDOMComponent(node)) && !node.selfClosing && (childrenIsEmpty(node) || childrenIsMultilineSpaces(node));
    }
    return {
      JSXOpeningElement(node) {
        if (!isShouldBeSelfClosed(node))
          return;
        context.report({
          messageId: "notSelfClosing",
          node,
          fix(fixer) {
            const openingElementEnding = node.range[1] - 1;
            const closingElementEnding = node.parent.closingElement?.range[1] ?? NaN;
            const range = [openingElementEnding, closingElementEnding];
            return fixer.replaceTextRange(range, " />");
          }
        });
      }
    };
  }
});

export { jsxSelfClosingComp as default };
