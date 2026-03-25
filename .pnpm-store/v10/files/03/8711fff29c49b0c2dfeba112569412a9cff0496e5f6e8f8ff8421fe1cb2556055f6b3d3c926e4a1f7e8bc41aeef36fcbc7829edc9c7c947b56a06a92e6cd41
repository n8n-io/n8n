import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

var computedPropertySpacing = createRule({
  name: "computed-property-spacing",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent spacing inside computed property brackets"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "string",
        enum: ["always", "never"]
      },
      {
        type: "object",
        properties: {
          enforceForClassMembers: {
            type: "boolean",
            default: true
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unexpectedSpaceBefore: "There should be no space before '{{tokenValue}}'.",
      unexpectedSpaceAfter: "There should be no space after '{{tokenValue}}'.",
      missingSpaceBefore: "A space is required before '{{tokenValue}}'.",
      missingSpaceAfter: "A space is required after '{{tokenValue}}'."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const propertyNameMustBeSpaced = context.options[0] === "always";
    const enforceForClassMembers = !context.options[1] || context.options[1].enforceForClassMembers;
    function reportNoBeginningSpace(node, token, tokenAfter) {
      context.report({
        node,
        loc: { start: token.loc.end, end: tokenAfter.loc.start },
        messageId: "unexpectedSpaceAfter",
        data: {
          tokenValue: token.value
        },
        fix(fixer) {
          return fixer.removeRange([token.range[1], tokenAfter.range[0]]);
        }
      });
    }
    function reportNoEndingSpace(node, token, tokenBefore) {
      context.report({
        node,
        loc: { start: tokenBefore.loc.end, end: token.loc.start },
        messageId: "unexpectedSpaceBefore",
        data: {
          tokenValue: token.value
        },
        fix(fixer) {
          return fixer.removeRange([tokenBefore.range[1], token.range[0]]);
        }
      });
    }
    function reportRequiredBeginningSpace(node, token) {
      context.report({
        node,
        loc: token.loc,
        messageId: "missingSpaceAfter",
        data: {
          tokenValue: token.value
        },
        fix(fixer) {
          return fixer.insertTextAfter(token, " ");
        }
      });
    }
    function reportRequiredEndingSpace(node, token) {
      context.report({
        node,
        loc: token.loc,
        messageId: "missingSpaceBefore",
        data: {
          tokenValue: token.value
        },
        fix(fixer) {
          return fixer.insertTextBefore(token, " ");
        }
      });
    }
    function checkSpacing(propertyName) {
      return function(node) {
        if (!node.computed)
          return;
        const property = node[propertyName];
        const before = sourceCode.getTokenBefore(property, astUtilsExports.isOpeningBracketToken);
        const first = sourceCode.getTokenAfter(before, { includeComments: true });
        const after = sourceCode.getTokenAfter(property, astUtilsExports.isClosingBracketToken);
        const last = sourceCode.getTokenBefore(after, { includeComments: true });
        if (astUtilsExports.isTokenOnSameLine(before, first)) {
          if (propertyNameMustBeSpaced) {
            if (!sourceCode.isSpaceBetween(before, first) && astUtilsExports.isTokenOnSameLine(before, first))
              reportRequiredBeginningSpace(node, before);
          } else {
            if (sourceCode.isSpaceBetween(before, first))
              reportNoBeginningSpace(node, before, first);
          }
        }
        if (astUtilsExports.isTokenOnSameLine(last, after)) {
          if (propertyNameMustBeSpaced) {
            if (!sourceCode.isSpaceBetween(last, after) && astUtilsExports.isTokenOnSameLine(last, after))
              reportRequiredEndingSpace(node, after);
          } else {
            if (sourceCode.isSpaceBetween(last, after))
              reportNoEndingSpace(node, after, last);
          }
        }
      };
    }
    const listeners = {
      Property: checkSpacing("key"),
      MemberExpression: checkSpacing("property")
    };
    if (enforceForClassMembers) {
      listeners.MethodDefinition = checkSpacing("key");
      listeners.PropertyDefinition = checkSpacing("key");
    }
    return listeners;
  }
});

export { computedPropertySpacing as default };
