import { c as createRule, n as isJSX, i as isSingleLine } from '../utils.js';
import '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const DEFAULTS = {
  declaration: "parens",
  assignment: "parens",
  return: "parens",
  arrow: "parens",
  condition: "ignore",
  logical: "ignore",
  prop: "ignore",
  propertyValue: "ignore"
};
const messages = {
  missingParens: "Missing parentheses around multilines JSX",
  parensOnNewLines: "Parentheses around JSX should be on separate lines"
};
var jsxWrapMultilines = createRule({
  name: "jsx-wrap-multilines",
  meta: {
    type: "layout",
    docs: {
      description: "Disallow missing parentheses around multiline JSX"
    },
    fixable: "code",
    messages,
    schema: [{
      type: "object",
      // true/false are for backwards compatibility
      properties: {
        declaration: {
          type: ["string", "boolean"],
          enum: [true, false, "ignore", "parens", "parens-new-line"]
        },
        assignment: {
          type: ["string", "boolean"],
          enum: [true, false, "ignore", "parens", "parens-new-line"]
        },
        return: {
          type: ["string", "boolean"],
          enum: [true, false, "ignore", "parens", "parens-new-line"]
        },
        arrow: {
          type: ["string", "boolean"],
          enum: [true, false, "ignore", "parens", "parens-new-line"]
        },
        condition: {
          type: ["string", "boolean"],
          enum: [true, false, "ignore", "parens", "parens-new-line"]
        },
        logical: {
          type: ["string", "boolean"],
          enum: [true, false, "ignore", "parens", "parens-new-line"]
        },
        prop: {
          type: ["string", "boolean"],
          enum: [true, false, "ignore", "parens", "parens-new-line"]
        },
        propertyValue: {
          type: ["string", "boolean"],
          enum: [true, false, "ignore", "parens", "parens-new-line"]
        }
      },
      additionalProperties: false
    }]
  },
  create(context) {
    function getOption(type) {
      const userOptions = context.options[0] || {};
      if (type in userOptions)
        return userOptions[type];
      return DEFAULTS[type];
    }
    function isEnabled(type) {
      const option = getOption(type);
      return option && option !== "ignore";
    }
    function needsOpeningNewLine(node) {
      const previousToken = context.sourceCode.getTokenBefore(node);
      if (!astUtilsExports.isParenthesized(node, context.sourceCode))
        return false;
      if (astUtilsExports.isTokenOnSameLine(previousToken, node))
        return true;
      return false;
    }
    function needsClosingNewLine(node) {
      const nextToken = context.sourceCode.getTokenAfter(node);
      if (!astUtilsExports.isParenthesized(node, context.sourceCode))
        return false;
      if (astUtilsExports.isTokenOnSameLine(node, nextToken))
        return true;
      return false;
    }
    function trimTokenBeforeNewline(tokenBefore) {
      const isBracket = tokenBefore.value === "{" || tokenBefore.value === "[";
      return `${tokenBefore.value.trim()}${isBracket ? "" : " "}`;
    }
    function check(node, type) {
      if (!node || !isJSX(node))
        return;
      const sourceCode = context.sourceCode;
      const option = getOption(type);
      if ((option === true || option === "parens") && !astUtilsExports.isParenthesized(node, context.sourceCode) && !isSingleLine(node)) {
        context.report({
          node,
          messageId: "missingParens",
          fix: (fixer) => fixer.replaceText(node, `(${sourceCode.getText(node)})`)
        });
      }
      if (option === "parens-new-line" && !isSingleLine(node)) {
        if (!astUtilsExports.isParenthesized(node, context.sourceCode)) {
          const tokenBefore = sourceCode.getTokenBefore(node);
          const tokenAfter = sourceCode.getTokenAfter(node);
          const start = node.loc.start;
          if (tokenBefore.loc.end.line < start.line) {
            const textBefore = sourceCode.getText().slice(tokenBefore.range[1], node.range[0]).trim();
            const isTab = /^\t/.test(sourceCode.lines[start.line - 1]);
            const INDENT = isTab ? "	" : " ";
            const indentBefore = INDENT.repeat(start.column);
            const indentAfter = INDENT.repeat(Math.max(0, start.column - (isTab ? 1 : 2)));
            context.report({
              node,
              messageId: "missingParens",
              fix: (fixer) => fixer.replaceTextRange(
                [
                  tokenBefore.range[0],
                  tokenAfter && (tokenAfter.value === ";" || tokenAfter.value === "}") ? tokenAfter.range[0] : node.range[1]
                ],
                `${trimTokenBeforeNewline(tokenBefore)}(
${indentBefore}${textBefore}${textBefore.length > 0 ? `
${indentBefore}` : ""}${sourceCode.getText(node)}
${indentAfter})`
              )
            });
          } else {
            context.report({
              node,
              messageId: "missingParens",
              fix: (fixer) => fixer.replaceText(node, `(
${sourceCode.getText(node)}
)`)
            });
          }
        } else {
          const needsOpening = needsOpeningNewLine(node);
          const needsClosing = needsClosingNewLine(node);
          if (needsOpening || needsClosing) {
            context.report({
              node,
              messageId: "parensOnNewLines",
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
    }
    return {
      VariableDeclarator(node) {
        const type = "declaration";
        if (!isEnabled(type))
          return;
        if (!isEnabled("condition") && node.init && node.init.type === "ConditionalExpression") {
          check(node.init.consequent, type);
          check(node.init.alternate, type);
          return;
        }
        check(node.init, type);
      },
      AssignmentExpression(node) {
        const type = "assignment";
        if (!isEnabled(type))
          return;
        if (!isEnabled("condition") && node.right.type === "ConditionalExpression") {
          check(node.right.consequent, type);
          check(node.right.alternate, type);
          return;
        }
        check(node.right, type);
      },
      ReturnStatement(node) {
        const type = "return";
        if (isEnabled(type))
          check(node.argument, type);
      },
      "ArrowFunctionExpression:exit": (node) => {
        const arrowBody = node.body;
        const type = "arrow";
        if (isEnabled(type) && arrowBody.type !== "BlockStatement")
          check(arrowBody, type);
      },
      ConditionalExpression(node) {
        const type = "condition";
        if (isEnabled(type)) {
          check(node.consequent, type);
          check(node.alternate, type);
        }
      },
      LogicalExpression(node) {
        const type = "logical";
        if (isEnabled(type))
          check(node.right, type);
      },
      JSXAttribute(node) {
        const type = "prop";
        if (isEnabled(type) && node.value && node.value.type === "JSXExpressionContainer")
          check(node.value.expression, type);
      },
      ObjectExpression(node) {
        const type = "propertyValue";
        if (isEnabled(type)) {
          node.properties.forEach((property) => {
            if (property.type === "Property" && property.value.type === "JSXElement")
              check(property.value, type);
          });
        }
      }
    };
  }
});

export { jsxWrapMultilines as default };
