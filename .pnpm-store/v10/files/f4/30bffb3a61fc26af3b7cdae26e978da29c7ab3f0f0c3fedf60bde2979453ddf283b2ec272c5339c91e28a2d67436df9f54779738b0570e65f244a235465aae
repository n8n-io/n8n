import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import '../vendor.js';
import '@typescript-eslint/types';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const OVERRIDE_SCHEMA = {
  oneOf: [
    {
      type: "string",
      enum: ["before", "after", "both", "neither"]
    },
    {
      type: "object",
      properties: {
        before: { type: "boolean" },
        after: { type: "boolean" }
      },
      additionalProperties: false
    }
  ]
};
var generatorStarSpacing = createRule({
  name: "generator-star-spacing",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent spacing around `*` operators in generator functions"
    },
    fixable: "whitespace",
    schema: [
      {
        oneOf: [
          {
            type: "string",
            enum: ["before", "after", "both", "neither"]
          },
          {
            type: "object",
            properties: {
              before: { type: "boolean" },
              after: { type: "boolean" },
              named: OVERRIDE_SCHEMA,
              anonymous: OVERRIDE_SCHEMA,
              method: OVERRIDE_SCHEMA
            },
            additionalProperties: false
          }
        ]
      }
    ],
    messages: {
      missingBefore: "Missing space before *.",
      missingAfter: "Missing space after *.",
      unexpectedBefore: "Unexpected space before *.",
      unexpectedAfter: "Unexpected space after *."
    }
  },
  create(context) {
    const optionDefinitions = {
      before: { before: true, after: false },
      after: { before: false, after: true },
      both: { before: true, after: true },
      neither: { before: false, after: false }
    };
    function optionToDefinition(option, defaults) {
      if (!option)
        return defaults;
      return typeof option === "string" ? optionDefinitions[option] : Object.assign({}, defaults, option);
    }
    const modes = function(option) {
      const defaults = optionToDefinition(option, optionDefinitions.before);
      return {
        named: optionToDefinition(option.named, defaults),
        anonymous: optionToDefinition(option.anonymous, defaults),
        method: optionToDefinition(option.method, defaults)
      };
    }(context.options[0] || {});
    const sourceCode = context.sourceCode;
    function isStarToken(token) {
      return token.value === "*" && token.type === "Punctuator";
    }
    function getStarToken(node) {
      return sourceCode.getFirstToken(
        "method" in node.parent && node.parent.method || node.parent.type === "MethodDefinition" ? node.parent : node,
        isStarToken
      );
    }
    function capitalize(str) {
      return str[0].toUpperCase() + str.slice(1);
    }
    function checkSpacing(kind, side, leftToken, rightToken) {
      if (!!(rightToken.range[0] - leftToken.range[1]) !== modes[kind][side]) {
        const after = leftToken.value === "*";
        const spaceRequired = modes[kind][side];
        const node = after ? leftToken : rightToken;
        const messageId = `${spaceRequired ? "missing" : "unexpected"}${capitalize(side)}`;
        context.report({
          node,
          messageId,
          fix(fixer) {
            if (spaceRequired) {
              if (after)
                return fixer.insertTextAfter(node, " ");
              return fixer.insertTextBefore(node, " ");
            }
            return fixer.removeRange([leftToken.range[1], rightToken.range[0]]);
          }
        });
      }
    }
    function checkFunction(node) {
      if (!node.generator)
        return;
      const starToken = getStarToken(node);
      const prevToken = sourceCode.getTokenBefore(starToken);
      const nextToken = sourceCode.getTokenAfter(starToken);
      let kind = "named";
      if (node.parent.type === "MethodDefinition" || node.parent.type === "Property" && node.parent.method)
        kind = "method";
      else if (!node.id)
        kind = "anonymous";
      if (!(kind === "method" && starToken === sourceCode.getFirstToken(node.parent)))
        checkSpacing(kind, "before", prevToken, starToken);
      checkSpacing(kind, "after", starToken, nextToken);
    }
    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction
    };
  }
});

export { generatorStarSpacing as default };
