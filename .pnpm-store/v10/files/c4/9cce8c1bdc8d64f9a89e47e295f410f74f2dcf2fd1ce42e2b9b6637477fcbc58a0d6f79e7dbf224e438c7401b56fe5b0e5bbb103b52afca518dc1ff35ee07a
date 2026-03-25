import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

var functionCallArgumentNewline = createRule({
  name: "function-call-argument-newline",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce line breaks between arguments of a function call"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "string",
        enum: ["always", "never", "consistent"]
      }
    ],
    messages: {
      unexpectedLineBreak: "There should be no line break here.",
      missingLineBreak: "There should be a line break after this argument."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const checkers = {
      unexpected: {
        messageId: "unexpectedLineBreak",
        check: (prevToken, currentToken) => !astUtilsExports.isTokenOnSameLine(prevToken, currentToken),
        createFix: (token, tokenBefore) => (fixer) => fixer.replaceTextRange([tokenBefore.range[1], token.range[0]], " ")
      },
      missing: {
        messageId: "missingLineBreak",
        check: (prevToken, currentToken) => astUtilsExports.isTokenOnSameLine(prevToken, currentToken),
        createFix: (token, tokenBefore) => (fixer) => fixer.replaceTextRange([tokenBefore.range[1], token.range[0]], "\n")
      }
    };
    function checkArguments(argumentNodes, checker) {
      for (let i = 1; i < argumentNodes.length; i++) {
        const argumentNode = argumentNodes[i - 1];
        const prevArgToken = sourceCode.getLastToken(argumentNode);
        const currentArgToken = sourceCode.getFirstToken(argumentNodes[i]);
        if (checker.check(prevArgToken, currentArgToken)) {
          const tokenBefore = sourceCode.getTokenBefore(
            currentArgToken,
            { includeComments: true }
          );
          const hasLineCommentBefore = tokenBefore.type === "Line";
          context.report({
            node: argumentNodes[i - 1],
            loc: {
              start: tokenBefore.loc.end,
              end: currentArgToken.loc.start
            },
            messageId: checker.messageId,
            fix: hasLineCommentBefore ? null : checker.createFix(currentArgToken, tokenBefore)
          });
        }
      }
    }
    function check(argumentNodes) {
      if (argumentNodes.length < 2)
        return;
      const option = context.options[0] || "always";
      if (option === "never") {
        checkArguments(argumentNodes, checkers.unexpected);
      } else if (option === "always") {
        checkArguments(argumentNodes, checkers.missing);
      } else if (option === "consistent") {
        const firstArgToken = sourceCode.getLastToken(argumentNodes[0]);
        const secondArgToken = sourceCode.getFirstToken(argumentNodes[1]);
        if (astUtilsExports.isTokenOnSameLine(firstArgToken, secondArgToken))
          checkArguments(argumentNodes, checkers.unexpected);
        else
          checkArguments(argumentNodes, checkers.missing);
      }
    }
    return {
      CallExpression: (node) => check(node.arguments),
      NewExpression: (node) => check(node.arguments),
      ImportExpression: (node) => {
        if (node.options)
          check([node.source, node.options]);
      }
    };
  }
});

export { functionCallArgumentNewline as default };
