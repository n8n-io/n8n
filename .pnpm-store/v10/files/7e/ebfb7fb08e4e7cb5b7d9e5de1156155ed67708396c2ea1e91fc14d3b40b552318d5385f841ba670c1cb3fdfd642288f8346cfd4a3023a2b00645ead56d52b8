import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

const POSITION_SCHEMA = {
  type: "string",
  enum: ["beside", "below", "any"]
};
var nonblockStatementBodyPosition = createRule({
  name: "nonblock-statement-body-position",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce the location of single-line statements"
    },
    fixable: "whitespace",
    schema: [
      POSITION_SCHEMA,
      {
        type: "object",
        properties: {
          overrides: {
            type: "object",
            properties: {
              if: POSITION_SCHEMA,
              else: POSITION_SCHEMA,
              while: POSITION_SCHEMA,
              do: POSITION_SCHEMA,
              for: POSITION_SCHEMA
            },
            additionalProperties: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      expectNoLinebreak: "Expected no linebreak before this statement.",
      expectLinebreak: "Expected a linebreak before this statement."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    function getOption(keywordName) {
      return context.options[1] && context.options[1].overrides && context.options[1].overrides[keywordName] || context.options[0] || "beside";
    }
    function validateStatement(node, keywordName) {
      const option = getOption(keywordName);
      if (node.type === "BlockStatement" || option === "any")
        return;
      const tokenBefore = sourceCode.getTokenBefore(node);
      const onSameLine = astUtilsExports.isTokenOnSameLine(tokenBefore, node);
      if (onSameLine && option === "below") {
        context.report({
          node,
          messageId: "expectLinebreak",
          fix: (fixer) => fixer.insertTextBefore(node, "\n")
        });
      } else if (!onSameLine && option === "beside") {
        context.report({
          node,
          messageId: "expectNoLinebreak",
          fix(fixer) {
            if (sourceCode.getText().slice(tokenBefore.range[1], node.range[0]).trim())
              return null;
            return fixer.replaceTextRange([tokenBefore.range[1], node.range[0]], " ");
          }
        });
      }
    }
    return {
      IfStatement(node) {
        validateStatement(node.consequent, "if");
        if (node.alternate && node.alternate.type !== "IfStatement")
          validateStatement(node.alternate, "else");
      },
      WhileStatement: (node) => validateStatement(node.body, "while"),
      DoWhileStatement: (node) => validateStatement(node.body, "do"),
      ForStatement: (node) => validateStatement(node.body, "for"),
      ForInStatement: (node) => validateStatement(node.body, "for"),
      ForOfStatement: (node) => validateStatement(node.body, "for")
    };
  }
});

export { nonblockStatementBodyPosition as default };
