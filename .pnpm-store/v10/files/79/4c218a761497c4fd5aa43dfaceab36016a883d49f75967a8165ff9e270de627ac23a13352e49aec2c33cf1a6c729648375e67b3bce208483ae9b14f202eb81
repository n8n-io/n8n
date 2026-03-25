import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import '../vendor.js';
import '@typescript-eslint/types';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const messages = {
  noLineGap: "Expected no line gap between \u201C{{prop1}}\u201D and \u201C{{prop2}}\u201D",
  onlyOneSpace: "Expected only one space between \u201C{{prop1}}\u201D and \u201C{{prop2}}\u201D"
};
var jsxPropsNoMultiSpaces = createRule({
  name: "jsx-props-no-multi-spaces",
  meta: {
    type: "layout",
    docs: {
      description: "Disallow multiple spaces between inline JSX props"
    },
    fixable: "code",
    messages,
    schema: []
  },
  create(context) {
    const sourceCode = context.sourceCode;
    function getPropName(propNode) {
      switch (propNode.type) {
        case "JSXSpreadAttribute":
          return sourceCode.getText(propNode.argument);
        case "JSXIdentifier":
          return propNode.name;
        case "JSXMemberExpression":
          return `${getPropName(propNode.object)}.${propNode.property.name}`;
        default:
          return propNode.name ? propNode.name.name : `${sourceCode.getText(propNode.object)}.${propNode.property.name}`;
      }
    }
    function hasEmptyLines(first, second) {
      const comments = sourceCode.getCommentsBefore ? sourceCode.getCommentsBefore(second) : [];
      const nodes = [].concat(first, comments, second);
      for (let i = 1; i < nodes.length; i += 1) {
        const prev = nodes[i - 1];
        const curr = nodes[i];
        if (curr.loc.start.line - prev.loc.end.line >= 2)
          return true;
      }
      return false;
    }
    function checkSpacing(prev, node) {
      if (hasEmptyLines(prev, node)) {
        context.report({
          messageId: "noLineGap",
          node,
          data: {
            prop1: getPropName(prev),
            prop2: getPropName(node)
          }
        });
      }
      if (prev.loc.end.line !== node.loc.end.line)
        return;
      const between = sourceCode.text.slice(prev.range[1], node.range[0]);
      if (between !== " ") {
        context.report({
          node,
          messageId: "onlyOneSpace",
          data: {
            prop1: getPropName(prev),
            prop2: getPropName(node)
          },
          fix(fixer) {
            return fixer.replaceTextRange([prev.range[1], node.range[0]], " ");
          }
        });
      }
    }
    function containsGenericType(node) {
      const containsTypeParams = typeof node.typeArguments !== "undefined";
      return containsTypeParams && node.typeArguments?.type === "TSTypeParameterInstantiation";
    }
    function getGenericNode(node) {
      const name = node.name;
      if (containsGenericType(node)) {
        const type = node.typeArguments;
        return Object.assign(
          {},
          node,
          {
            range: [
              name.range[0],
              type?.range[1]
            ]
          }
        );
      }
      return name;
    }
    return {
      JSXOpeningElement(node) {
        node.attributes.reduce((prev, prop) => {
          checkSpacing(prev, prop);
          return prop;
        }, getGenericNode(node));
      }
    };
  }
});

export { jsxPropsNoMultiSpaces as default };
