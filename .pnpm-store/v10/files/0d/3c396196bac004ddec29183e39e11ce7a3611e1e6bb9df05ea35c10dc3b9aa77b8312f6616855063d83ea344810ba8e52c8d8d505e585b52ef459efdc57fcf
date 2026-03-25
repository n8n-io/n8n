import { c as createRule, a as canTokensBeAdjacent } from '../utils.js';
import '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

function hasBlockBody(node) {
  return node.body.type === "BlockStatement";
}
var arrowParens = createRule({
  name: "arrow-parens",
  meta: {
    type: "layout",
    docs: {
      description: "Require parentheses around arrow function arguments"
    },
    fixable: "code",
    schema: [
      {
        type: "string",
        enum: ["always", "as-needed"]
      },
      {
        type: "object",
        properties: {
          requireForBlockBody: {
            type: "boolean",
            default: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unexpectedParens: "Unexpected parentheses around single function argument.",
      expectedParens: "Expected parentheses around arrow function argument.",
      unexpectedParensInline: "Unexpected parentheses around single function argument having a body with no curly braces.",
      expectedParensBlock: "Expected parentheses around arrow function argument having a body with curly braces."
    }
  },
  create(context) {
    const asNeeded = context.options[0] === "as-needed";
    const requireForBlockBody = asNeeded && context.options[1] && context.options[1].requireForBlockBody === true;
    const sourceCode = context.sourceCode;
    function findOpeningParenOfParams(node) {
      const tokenBeforeParams = sourceCode.getTokenBefore(node.params[0]);
      if (tokenBeforeParams && astUtilsExports.isOpeningParenToken(tokenBeforeParams) && node.range[0] <= tokenBeforeParams.range[0]) {
        return tokenBeforeParams;
      }
      return null;
    }
    function getClosingParenOfParams(node) {
      return sourceCode.getTokenAfter(node.params[0], astUtilsExports.isClosingParenToken);
    }
    function hasCommentsInParensOfParams(node, openingParen) {
      return sourceCode.commentsExistBetween(openingParen, getClosingParenOfParams(node));
    }
    function hasUnexpectedTokensBeforeOpeningParen(node, openingParen) {
      const expectedCount = node.async ? 1 : 0;
      return sourceCode.getFirstToken(node, { skip: expectedCount }) !== openingParen;
    }
    return {
      "ArrowFunctionExpression[params.length=1]": function(node) {
        const shouldHaveParens = !asNeeded || requireForBlockBody && hasBlockBody(node);
        const openingParen = findOpeningParenOfParams(node);
        const hasParens = openingParen !== null;
        const [param] = node.params;
        if (shouldHaveParens && !hasParens) {
          context.report({
            node,
            messageId: requireForBlockBody ? "expectedParensBlock" : "expectedParens",
            loc: param.loc,
            *fix(fixer) {
              yield fixer.insertTextBefore(param, "(");
              yield fixer.insertTextAfter(param, ")");
            }
          });
        }
        if (!shouldHaveParens && hasParens && param.type === "Identifier" && !param.optional && !param.typeAnnotation && !node.returnType && !hasCommentsInParensOfParams(node, openingParen) && !hasUnexpectedTokensBeforeOpeningParen(node, openingParen)) {
          context.report({
            node,
            messageId: requireForBlockBody ? "unexpectedParensInline" : "unexpectedParens",
            loc: param.loc,
            *fix(fixer) {
              const tokenBeforeOpeningParen = sourceCode.getTokenBefore(openingParen);
              const closingParen = getClosingParenOfParams(node);
              if (tokenBeforeOpeningParen && tokenBeforeOpeningParen.range[1] === openingParen.range[0] && !canTokensBeAdjacent(tokenBeforeOpeningParen, sourceCode.getFirstToken(param))) {
                yield fixer.insertTextBefore(openingParen, " ");
              }
              yield fixer.removeRange([openingParen.range[0], param.range[0]]);
              yield fixer.removeRange([param.range[1], closingParen.range[1]]);
            }
          });
        }
      }
    };
  }
});

export { arrowParens as default };
