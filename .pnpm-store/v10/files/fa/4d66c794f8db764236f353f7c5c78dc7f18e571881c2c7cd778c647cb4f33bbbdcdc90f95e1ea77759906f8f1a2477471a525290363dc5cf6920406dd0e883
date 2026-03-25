import { c as createRule, k as createGlobalLinebreakMatcher } from '../utils.js';
import '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var operatorLinebreak = createRule({
  name: "operator-linebreak",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent linebreak style for operators"
    },
    schema: [
      {
        oneOf: [
          {
            type: "string",
            enum: ["after", "before", "none"]
          },
          {
            type: "null"
          }
        ]
      },
      {
        type: "object",
        properties: {
          overrides: {
            type: "object",
            additionalProperties: {
              type: "string",
              enum: ["after", "before", "none", "ignore"]
            }
          }
        },
        additionalProperties: false
      }
    ],
    fixable: "code",
    messages: {
      operatorAtBeginning: "'{{operator}}' should be placed at the beginning of the line.",
      operatorAtEnd: "'{{operator}}' should be placed at the end of the line.",
      badLinebreak: "Bad line breaking before and after '{{operator}}'.",
      noLinebreak: "There should be no line break before or after '{{operator}}'."
    }
  },
  create(context) {
    const usedDefaultGlobal = !context.options[0];
    const globalStyle = context.options[0] || "after";
    const options = context.options[1] || {};
    const styleOverrides = options.overrides ? Object.assign({}, options.overrides) : {};
    if (usedDefaultGlobal && !styleOverrides["?"])
      styleOverrides["?"] = "before";
    if (usedDefaultGlobal && !styleOverrides[":"])
      styleOverrides[":"] = "before";
    const sourceCode = context.sourceCode;
    function getFixer(operatorToken, desiredStyle) {
      return (fixer) => {
        const tokenBefore = sourceCode.getTokenBefore(operatorToken);
        const tokenAfter = sourceCode.getTokenAfter(operatorToken);
        const textBefore = sourceCode.text.slice(tokenBefore.range[1], operatorToken.range[0]);
        const textAfter = sourceCode.text.slice(operatorToken.range[1], tokenAfter.range[0]);
        const hasLinebreakBefore = !astUtilsExports.isTokenOnSameLine(tokenBefore, operatorToken);
        const hasLinebreakAfter = !astUtilsExports.isTokenOnSameLine(operatorToken, tokenAfter);
        let newTextBefore, newTextAfter;
        if (hasLinebreakBefore !== hasLinebreakAfter && desiredStyle !== "none") {
          if (sourceCode.getTokenBefore(operatorToken, { includeComments: true }) !== tokenBefore && sourceCode.getTokenAfter(operatorToken, { includeComments: true }) !== tokenAfter) {
            return null;
          }
          newTextBefore = textAfter;
          newTextAfter = textBefore;
        } else {
          const LINEBREAK_REGEX = createGlobalLinebreakMatcher();
          newTextBefore = desiredStyle === "before" || textBefore.trim() ? textBefore : textBefore.replace(LINEBREAK_REGEX, "");
          newTextAfter = desiredStyle === "after" || textAfter.trim() ? textAfter : textAfter.replace(LINEBREAK_REGEX, "");
          if (newTextBefore === textBefore && newTextAfter === textAfter)
            return null;
        }
        if (newTextAfter === "" && tokenAfter.type === "Punctuator" && "+-".includes(operatorToken.value) && tokenAfter.value === operatorToken.value) {
          newTextAfter += " ";
        }
        return fixer.replaceTextRange([tokenBefore.range[1], tokenAfter.range[0]], newTextBefore + operatorToken.value + newTextAfter);
      };
    }
    function validateNode(node, rightSide, operator) {
      const operatorToken = sourceCode.getTokenBefore(rightSide, (token) => token.value === operator);
      const leftToken = sourceCode.getTokenBefore(operatorToken);
      const rightToken = sourceCode.getTokenAfter(operatorToken);
      const operatorStyleOverride = styleOverrides[operator];
      const style = operatorStyleOverride || globalStyle;
      const fix = getFixer(operatorToken, style);
      if (astUtilsExports.isTokenOnSameLine(leftToken, operatorToken) && astUtilsExports.isTokenOnSameLine(operatorToken, rightToken)) ; else if (operatorStyleOverride !== "ignore" && !astUtilsExports.isTokenOnSameLine(leftToken, operatorToken) && !astUtilsExports.isTokenOnSameLine(operatorToken, rightToken)) {
        context.report({
          node,
          loc: operatorToken.loc,
          messageId: "badLinebreak",
          data: {
            operator
          },
          fix
        });
      } else if (style === "before" && astUtilsExports.isTokenOnSameLine(leftToken, operatorToken)) {
        context.report({
          node,
          loc: operatorToken.loc,
          messageId: "operatorAtBeginning",
          data: {
            operator
          },
          fix
        });
      } else if (style === "after" && astUtilsExports.isTokenOnSameLine(operatorToken, rightToken)) {
        context.report({
          node,
          loc: operatorToken.loc,
          messageId: "operatorAtEnd",
          data: {
            operator
          },
          fix
        });
      } else if (style === "none") {
        context.report({
          node,
          loc: operatorToken.loc,
          messageId: "noLinebreak",
          data: {
            operator
          },
          fix
        });
      }
    }
    function validateBinaryExpression(node) {
      validateNode(node, node.right, node.operator);
    }
    return {
      BinaryExpression: validateBinaryExpression,
      LogicalExpression: validateBinaryExpression,
      AssignmentExpression: validateBinaryExpression,
      VariableDeclarator(node) {
        if (node.init)
          validateNode(node, node.init, "=");
      },
      PropertyDefinition(node) {
        if (node.value)
          validateNode(node, node.value, "=");
      },
      ConditionalExpression(node) {
        validateNode(node, node.consequent, "?");
        validateNode(node, node.alternate, ":");
      },
      TSImportEqualsDeclaration(node) {
        validateNode(node, node.moduleReference, "=");
      },
      TSTypeAliasDeclaration(node) {
        validateNode(node, node.typeAnnotation, "=");
      },
      TSConditionalType(node) {
        validateNode(node, node.trueType, "?");
        validateNode(node, node.falseType, ":");
      },
      TSIntersectionType(node) {
        const { types } = node;
        for (let idx = 0; idx < types.length - 1; idx++) {
          validateNode(types[idx], types[idx + 1], "&");
        }
      },
      TSUnionType(node) {
        const { types } = node;
        for (let idx = 0; idx < types.length - 1; idx++) {
          validateNode(types[idx], types[idx + 1], "|");
        }
      },
      TSTypeParameter(node) {
        if (!node.default)
          return;
        validateNode(node, node.default, "=");
      },
      TSEnumMember(node) {
        if (!node.initializer)
          return;
        validateNode(node, node.initializer, "=");
      }
    };
  }
});

export { operatorLinebreak as default };
