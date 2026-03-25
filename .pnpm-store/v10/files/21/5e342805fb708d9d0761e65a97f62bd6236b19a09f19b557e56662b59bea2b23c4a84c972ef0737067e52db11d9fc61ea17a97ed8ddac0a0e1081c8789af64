import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

function createRules(options) {
  const globals = {
    ...options?.before !== void 0 ? { before: options.before } : {},
    ...options?.after !== void 0 ? { after: options.after } : {}
  };
  const override = options?.overrides ?? {};
  const colon = {
    ...{ before: false, after: true },
    ...globals,
    ...override?.colon
  };
  const arrow = {
    ...{ before: true, after: true },
    ...globals,
    ...override?.arrow
  };
  return {
    colon,
    arrow,
    variable: { ...colon, ...override?.variable },
    property: { ...colon, ...override?.property },
    parameter: { ...colon, ...override?.parameter },
    returnType: { ...colon, ...override?.returnType }
  };
}
function getIdentifierRules(rules, node) {
  const scope = node?.parent;
  if (astUtilsExports.isVariableDeclarator(scope))
    return rules.variable;
  else if (astUtilsExports.isFunctionOrFunctionType(scope))
    return rules.parameter;
  return rules.colon;
}
function getRules(rules, node) {
  const scope = node?.parent?.parent;
  if (astUtilsExports.isTSFunctionType(scope) || astUtilsExports.isTSConstructorType(scope))
    return rules.arrow;
  else if (astUtilsExports.isIdentifier(scope))
    return getIdentifierRules(rules, scope);
  else if (astUtilsExports.isClassOrTypeElement(scope))
    return rules.property;
  else if (astUtilsExports.isFunction(scope))
    return rules.returnType;
  return rules.colon;
}
var typeAnnotationSpacing = createRule({
  name: "type-annotation-spacing",
  meta: {
    type: "layout",
    docs: {
      description: "Require consistent spacing around type annotations"
    },
    fixable: "whitespace",
    messages: {
      expectedSpaceAfter: "Expected a space after the '{{type}}'.",
      expectedSpaceBefore: "Expected a space before the '{{type}}'.",
      unexpectedSpaceAfter: "Unexpected space after the '{{type}}'.",
      unexpectedSpaceBefore: "Unexpected space before the '{{type}}'.",
      unexpectedSpaceBetween: "Unexpected space between the '{{previousToken}}' and the '{{type}}'."
    },
    schema: [
      {
        $defs: {
          spacingConfig: {
            type: "object",
            properties: {
              before: { type: "boolean" },
              after: { type: "boolean" }
            },
            additionalProperties: false
          }
        },
        type: "object",
        properties: {
          before: { type: "boolean" },
          after: { type: "boolean" },
          overrides: {
            type: "object",
            properties: {
              colon: { $ref: "#/items/0/$defs/spacingConfig" },
              arrow: { $ref: "#/items/0/$defs/spacingConfig" },
              variable: { $ref: "#/items/0/$defs/spacingConfig" },
              parameter: { $ref: "#/items/0/$defs/spacingConfig" },
              property: { $ref: "#/items/0/$defs/spacingConfig" },
              returnType: { $ref: "#/items/0/$defs/spacingConfig" }
            },
            additionalProperties: false
          }
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [
    // technically there is a default, but the overrides mean
    // that if we apply them here, it will break the no override case.
    {}
  ],
  create(context, [options]) {
    const punctuators = [":", "=>"];
    const sourceCode = context.sourceCode;
    const ruleSet = createRules(options);
    function checkTypeAnnotationSpacing(typeAnnotation) {
      const punctuatorTokenEnd = sourceCode.getTokenBefore(typeAnnotation, astUtilsExports.isNotOpeningParenToken);
      let punctuatorTokenStart = punctuatorTokenEnd;
      let previousToken = sourceCode.getTokenBefore(punctuatorTokenEnd);
      let type = punctuatorTokenEnd.value;
      if (!punctuators.includes(type))
        return;
      const { before, after } = getRules(ruleSet, typeAnnotation);
      if (type === ":" && previousToken.value === "?") {
        if (sourceCode.isSpaceBetween(previousToken, punctuatorTokenStart)) {
          context.report({
            node: punctuatorTokenStart,
            messageId: "unexpectedSpaceBetween",
            data: {
              type,
              previousToken: previousToken.value
            },
            fix(fixer) {
              return fixer.removeRange([
                previousToken.range[1],
                punctuatorTokenStart.range[0]
              ]);
            }
          });
        }
        type = "?:";
        punctuatorTokenStart = previousToken;
        previousToken = sourceCode.getTokenBefore(previousToken);
        if (previousToken.value === "+" || previousToken.value === "-") {
          type = `${previousToken.value}?:`;
          punctuatorTokenStart = previousToken;
          previousToken = sourceCode.getTokenBefore(previousToken);
        }
      }
      const hasNextSpace = sourceCode.isSpaceBetween(punctuatorTokenEnd, typeAnnotation);
      if (after && !hasNextSpace) {
        context.report({
          node: punctuatorTokenEnd,
          messageId: "expectedSpaceAfter",
          data: {
            type
          },
          fix(fixer) {
            return fixer.insertTextAfter(punctuatorTokenEnd, " ");
          }
        });
      } else if (!after && hasNextSpace) {
        context.report({
          node: punctuatorTokenEnd,
          messageId: "unexpectedSpaceAfter",
          data: {
            type
          },
          fix(fixer) {
            return fixer.removeRange([
              punctuatorTokenEnd.range[1],
              typeAnnotation.range[0]
            ]);
          }
        });
      }
      const hasPrevSpace = sourceCode.isSpaceBetween(previousToken, punctuatorTokenStart);
      if (before && !hasPrevSpace) {
        context.report({
          node: punctuatorTokenStart,
          messageId: "expectedSpaceBefore",
          data: {
            type
          },
          fix(fixer) {
            return fixer.insertTextAfter(previousToken, " ");
          }
        });
      } else if (!before && hasPrevSpace) {
        context.report({
          node: punctuatorTokenStart,
          messageId: "unexpectedSpaceBefore",
          data: {
            type
          },
          fix(fixer) {
            return fixer.removeRange([
              previousToken.range[1],
              punctuatorTokenStart.range[0]
            ]);
          }
        });
      }
    }
    return {
      TSMappedType(node) {
        if (node.typeAnnotation)
          checkTypeAnnotationSpacing(node.typeAnnotation);
      },
      TSTypeAnnotation(node) {
        checkTypeAnnotationSpacing(node.typeAnnotation);
      }
    };
  }
});

export { typeAnnotationSpacing as default };
