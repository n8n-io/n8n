import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

const UNIONS = ["|", "&"];
var spaceInfixOps = createRule({
  name: "space-infix-ops",
  meta: {
    type: "layout",
    docs: {
      description: "Require spacing around infix operators"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "object",
        properties: {
          int32Hint: {
            type: "boolean",
            default: false
          },
          ignoreTypes: {
            type: "boolean",
            default: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      missingSpace: "Operator '{{operator}}' must be spaced."
    }
  },
  defaultOptions: [
    {
      int32Hint: false,
      ignoreTypes: false
    }
  ],
  create(context) {
    const int32Hint = context.options[0] ? context.options[0].int32Hint === true : false;
    const ignoreTypes = context.options[0] ? context.options[0].ignoreTypes === true : false;
    const sourceCode = context.sourceCode;
    function report(node, operator) {
      context.report({
        node,
        loc: operator.loc,
        messageId: "missingSpace",
        data: {
          operator: operator.value
        },
        fix(fixer) {
          const previousToken = sourceCode.getTokenBefore(operator);
          const afterToken = sourceCode.getTokenAfter(operator);
          let fixString = "";
          if (operator.range[0] - previousToken.range[1] === 0)
            fixString = " ";
          fixString += operator.value;
          if (afterToken.range[0] - operator.range[1] === 0)
            fixString += " ";
          return fixer.replaceText(operator, fixString);
        }
      });
    }
    function getFirstNonSpacedToken(left, right, op) {
      const operator = sourceCode.getFirstTokenBetween(left, right, (token) => token.value === op);
      const prev = sourceCode.getTokenBefore(operator);
      const next = sourceCode.getTokenAfter(operator);
      if (!sourceCode.isSpaceBetween(prev, operator) || !sourceCode.isSpaceBetween(operator, next))
        return operator;
      return null;
    }
    function checkBinary(node) {
      const leftNode = "typeAnnotation" in node.left && node.left.typeAnnotation ? node.left.typeAnnotation : node.left;
      const rightNode = node.right;
      const operator = "operator" in node && node.operator ? node.operator : "=";
      const nonSpacedNode = getFirstNonSpacedToken(leftNode, rightNode, operator);
      if (nonSpacedNode) {
        if (!(int32Hint && sourceCode.getText(node).endsWith("|0")))
          report(node, nonSpacedNode);
      }
    }
    function checkConditional(node) {
      const nonSpacedConsequentNode = getFirstNonSpacedToken(node.test, node.consequent, "?");
      const nonSpacedAlternateNode = getFirstNonSpacedToken(node.consequent, node.alternate, ":");
      if (nonSpacedConsequentNode)
        report(node, nonSpacedConsequentNode);
      if (nonSpacedAlternateNode)
        report(node, nonSpacedAlternateNode);
    }
    function checkVar(node) {
      const leftNode = node.id.typeAnnotation ? node.id.typeAnnotation : node.id;
      const rightNode = node.init;
      if (rightNode) {
        const nonSpacedNode = getFirstNonSpacedToken(leftNode, rightNode, "=");
        if (nonSpacedNode)
          report(node, nonSpacedNode);
      }
    }
    function isSpaceChar(token) {
      return token.type === AST_TOKEN_TYPES.Punctuator && /^[=?:]$/.test(token.value);
    }
    function checkAndReportAssignmentSpace(node, leftNode, rightNode) {
      if (!rightNode || !leftNode)
        return;
      const operator = sourceCode.getFirstTokenBetween(
        leftNode,
        rightNode,
        isSpaceChar
      );
      const prev = sourceCode.getTokenBefore(operator);
      const next = sourceCode.getTokenAfter(operator);
      if (!sourceCode.isSpaceBetween(prev, operator) || !sourceCode.isSpaceBetween(operator, next)) {
        report(node, operator);
      }
    }
    function checkForEnumAssignmentSpace(node) {
      checkAndReportAssignmentSpace(node, node.id, node.initializer);
    }
    function checkForPropertyDefinitionAssignmentSpace(node) {
      const leftNode = node.optional && !node.typeAnnotation ? sourceCode.getTokenAfter(node.key) : node.typeAnnotation ?? node.key;
      checkAndReportAssignmentSpace(node, leftNode, node.value);
    }
    function checkForTypeAnnotationSpace(typeAnnotation) {
      const types = typeAnnotation.types;
      types.forEach((type) => {
        const skipFunctionParenthesis = type.type === AST_NODE_TYPES.TSFunctionType ? astUtilsExports.isNotOpeningParenToken : 0;
        const operator = sourceCode.getTokenBefore(
          type,
          skipFunctionParenthesis
        );
        if (!ignoreTypes && operator != null && UNIONS.includes(operator.value)) {
          const prev = sourceCode.getTokenBefore(operator);
          const next = sourceCode.getTokenAfter(operator);
          if (!sourceCode.isSpaceBetween(prev, operator) || !sourceCode.isSpaceBetween(operator, next)) {
            report(typeAnnotation, operator);
          }
        }
      });
    }
    function checkForTypeAliasAssignment(node) {
      checkAndReportAssignmentSpace(
        node,
        node.typeParameters ?? node.id,
        node.typeAnnotation
      );
    }
    function checkForTypeConditional(node) {
      checkAndReportAssignmentSpace(node, node.extendsType, node.trueType);
      checkAndReportAssignmentSpace(node, node.trueType, node.falseType);
    }
    return {
      AssignmentExpression: checkBinary,
      AssignmentPattern: checkBinary,
      BinaryExpression: checkBinary,
      LogicalExpression: checkBinary,
      ConditionalExpression: checkConditional,
      VariableDeclarator: checkVar,
      TSEnumMember: checkForEnumAssignmentSpace,
      PropertyDefinition: checkForPropertyDefinitionAssignmentSpace,
      TSTypeAliasDeclaration: checkForTypeAliasAssignment,
      TSUnionType: checkForTypeAnnotationSpace,
      TSIntersectionType: checkForTypeAnnotationSpace,
      TSConditionalType: checkForTypeConditional
    };
  }
});

export { spaceInfixOps as default };
