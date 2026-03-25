import { c as createRule, m as isNodeFirstInLine } from '../utils.js';
import '@typescript-eslint/types';
import '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const messages = {
  wrongIndent: "Expected indentation of {{needed}} {{type}} {{characters}} but found {{gotten}}."
};
var jsxIndentProps = createRule({
  name: "jsx-indent-props",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce props indentation in JSX"
    },
    fixable: "code",
    messages,
    schema: [{
      anyOf: [
        {
          type: "string",
          enum: ["tab", "first"]
        },
        {
          type: "integer"
        },
        {
          type: "object",
          properties: {
            indentMode: {
              anyOf: [
                {
                  type: "string",
                  enum: ["tab", "first"]
                },
                {
                  type: "integer"
                }
              ]
            },
            ignoreTernaryOperator: {
              type: "boolean"
            }
          }
        }
      ]
    }]
  },
  create(context) {
    const options = context.options[0];
    const extraColumnStart = 0;
    let indentType = "space";
    let indentSize = 4;
    const line = {
      isUsingOperator: false,
      currentOperator: false
    };
    let ignoreTernaryOperator = false;
    if (context.options.length) {
      const isConfigObject = typeof context.options[0] === "object";
      const indentMode = isConfigObject ? typeof options === "object" && options.indentMode : options;
      if (indentMode === "first") {
        indentSize = "first";
        indentType = "space";
      } else if (indentMode === "tab") {
        indentSize = 1;
        indentType = "tab";
      } else if (typeof indentMode === "number") {
        indentSize = indentMode;
        indentType = "space";
      }
      if (typeof options === "object" && options.ignoreTernaryOperator)
        ignoreTernaryOperator = true;
    }
    function getNodeIndent(node) {
      let src = context.sourceCode.getText(node, node.loc.start.column + extraColumnStart);
      const lines = src.split("\n");
      src = lines[0];
      let regExp;
      if (indentType === "space")
        regExp = /^ +/;
      else
        regExp = /^\t+/;
      const indent = regExp.exec(src);
      const useOperator = /^[ \t]*:/.test(src) || /^[ \t]*\?/.test(src);
      const useBracket = /</.test(src);
      line.currentOperator = false;
      if (useOperator) {
        line.isUsingOperator = true;
        line.currentOperator = true;
      } else if (useBracket) {
        line.isUsingOperator = false;
      }
      return indent ? indent[0].length : 0;
    }
    function checkNodesIndent(nodes, indent) {
      let nestedIndent = indent;
      nodes.forEach((node) => {
        const nodeIndent = getNodeIndent(node);
        if (line.isUsingOperator && !line.currentOperator && indentSize !== "first" && !ignoreTernaryOperator) {
          nestedIndent += indentSize;
          line.isUsingOperator = false;
        }
        if (node.type !== "ArrayExpression" && node.type !== "ObjectExpression" && nodeIndent !== nestedIndent && isNodeFirstInLine(context, node)) {
          context.report({
            node,
            messageId: "wrongIndent",
            data: {
              needed: nestedIndent,
              type: indentType,
              characters: nestedIndent === 1 ? "character" : "characters",
              gotten: nodeIndent
            },
            fix(fixer) {
              return fixer.replaceTextRange(
                [
                  node.range[0] - node.loc.start.column,
                  node.range[0]
                ],
                new Array(nestedIndent + 1).join(indentType === "space" ? " " : "	")
              );
            }
          });
        }
      });
    }
    return {
      JSXOpeningElement(node) {
        if (!node.attributes.length)
          return;
        let propIndent;
        if (indentSize === "first") {
          const firstPropNode = node.attributes[0];
          propIndent = firstPropNode.loc.start.column;
        } else {
          const elementIndent = getNodeIndent(node);
          propIndent = elementIndent + indentSize;
        }
        checkNodesIndent(node.attributes, propIndent);
      }
    };
  }
});

export { jsxIndentProps as default };
