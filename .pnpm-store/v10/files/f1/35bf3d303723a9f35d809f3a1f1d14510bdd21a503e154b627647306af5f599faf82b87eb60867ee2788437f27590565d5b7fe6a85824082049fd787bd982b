import { c as createRule, n as isJSX, i as isSingleLine } from '../utils.js';
import '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const messages = {
  missingLineBreak: "Missing line break around JSX"
};
function endWithComma(context, node) {
  const sourceCode = context.sourceCode;
  const nextToken = sourceCode.getTokenAfter(node);
  return !!nextToken && nextToken.value === "," && nextToken.range[0] >= node.range[1];
}
var jsxFunctionCallNewline = createRule({
  name: "jsx-function-call-newline",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce line breaks before and after JSX elements when they are used as arguments to a function."
    },
    fixable: "whitespace",
    messages,
    schema: [{
      type: "string",
      enum: ["always", "multiline"]
    }]
  },
  create(context) {
    const option = context.options[0] || "multiline";
    function needsOpeningNewLine(node) {
      const previousToken = context.sourceCode.getTokenBefore(node);
      if (astUtilsExports.isTokenOnSameLine(previousToken, node))
        return true;
      return false;
    }
    function needsClosingNewLine(node) {
      const nextToken = context.sourceCode.getTokenAfter(node);
      if (endWithComma(context, node))
        return false;
      if (node.loc.end.line === nextToken.loc.end.line)
        return true;
      return false;
    }
    function check(node) {
      if (!node || !isJSX(node))
        return;
      const sourceCode = context.sourceCode;
      if (option === "always" || !isSingleLine(node)) {
        const needsOpening = needsOpeningNewLine(node);
        const needsClosing = needsClosingNewLine(node);
        if (needsOpening || needsClosing) {
          context.report({
            node,
            messageId: "missingLineBreak",
            fix: (fixer) => {
              const text = sourceCode.getText(node);
              let fixed = text;
              if (needsOpening)
                fixed = `
${fixed}`;
              if (needsClosing)
                fixed = `${fixed}
`;
              return fixer.replaceText(node, fixed);
            }
          });
        }
      }
    }
    function handleCallExpression(node) {
      if (node.arguments.length === 0)
        return;
      node.arguments.forEach(check);
    }
    return {
      CallExpression(node) {
        handleCallExpression(node);
      },
      NewExpression(node) {
        handleCallExpression(node);
      }
    };
  }
});

export { jsxFunctionCallNewline as default };
