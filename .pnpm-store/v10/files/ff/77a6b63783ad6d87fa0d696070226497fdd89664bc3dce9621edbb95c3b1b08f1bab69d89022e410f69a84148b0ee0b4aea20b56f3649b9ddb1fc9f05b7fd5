import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

var noMultiSpaces = createRule({
  name: "no-multi-spaces",
  meta: {
    type: "layout",
    docs: {
      description: "Disallow multiple spaces"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "object",
        properties: {
          exceptions: {
            type: "object",
            patternProperties: {
              "^([A-Z][a-z]*)+$": {
                type: "boolean"
              }
            },
            additionalProperties: false
          },
          ignoreEOLComments: {
            type: "boolean",
            default: false
          },
          includeTabs: {
            type: "boolean",
            default: true
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      multipleSpaces: "Multiple spaces found before '{{displayValue}}'."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const options = context.options[0] || {};
    const ignoreEOLComments = options.ignoreEOLComments;
    const exceptions = Object.assign({ Property: true, ImportAttribute: true }, options.exceptions);
    const hasExceptions = Object.keys(exceptions).some((key) => exceptions[key]);
    const spacesRe = options.includeTabs === false ? / {2}/ : /[ \t]{2}/;
    function formatReportedCommentValue(token) {
      const valueLines = token.value.split("\n");
      const value = valueLines[0];
      const formattedValue = `${value.slice(0, 12)}...`;
      return valueLines.length === 1 && value.length <= 12 ? value : formattedValue;
    }
    return {
      Program() {
        sourceCode.tokensAndComments.forEach((leftToken, leftIndex, tokensAndComments) => {
          if (leftIndex === tokensAndComments.length - 1)
            return;
          const rightToken = tokensAndComments[leftIndex + 1];
          if (!spacesRe.test(sourceCode.text.slice(leftToken.range[1], rightToken.range[0])) || leftToken.loc.end.line < rightToken.loc.start.line) {
            return;
          }
          if (ignoreEOLComments && astUtilsExports.isCommentToken(rightToken) && (leftIndex === tokensAndComments.length - 2 || rightToken.loc.end.line < tokensAndComments[leftIndex + 2].loc.start.line)) {
            return;
          }
          if (hasExceptions) {
            const parentNode = sourceCode.getNodeByRangeIndex(rightToken.range[0] - 1);
            if (parentNode && exceptions[parentNode.type])
              return;
          }
          let displayValue;
          if (rightToken.type === "Block")
            displayValue = `/*${formatReportedCommentValue(rightToken)}*/`;
          else if (rightToken.type === "Line")
            displayValue = `//${formatReportedCommentValue(rightToken)}`;
          else
            displayValue = rightToken.value;
          context.report({
            node: rightToken,
            loc: { start: leftToken.loc.end, end: rightToken.loc.start },
            messageId: "multipleSpaces",
            data: { displayValue },
            fix: (fixer) => fixer.replaceTextRange([leftToken.range[1], rightToken.range[0]], " ")
          });
        });
      }
    };
  }
});

export { noMultiSpaces as default };
