import {
  isCommaToken,
  isOpeningBraceToken,
  isClosingBraceToken
} from "@eslint-community/eslint-utils";
import { getTestInfo } from "../utils.js";
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow the test case property `only`",
      category: "Tests",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-only-tests.md"
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      foundOnly: "The test case property `only` can be used during development, but should not be checked-in, since it prevents all the tests from running.",
      removeOnly: "Remove `only`."
    }
  },
  create(context) {
    return {
      Program(ast) {
        for (const testRun of getTestInfo(context, ast)) {
          for (const test of [...testRun.valid, ...testRun.invalid]) {
            if (test?.type === "ObjectExpression") {
              const onlyProperty = test.properties.find(
                (property) => property.type === "Property" && property.key.type === "Identifier" && property.key.name === "only" && property.value.type === "Literal" && property.value.value
              );
              if (onlyProperty) {
                context.report({
                  node: onlyProperty,
                  messageId: "foundOnly",
                  suggest: [
                    {
                      messageId: "removeOnly",
                      *fix(fixer) {
                        const sourceCode = context.sourceCode;
                        const tokenBefore = sourceCode.getTokenBefore(onlyProperty);
                        const tokenAfter = sourceCode.getTokenAfter(onlyProperty);
                        if (tokenBefore && tokenAfter && (isCommaToken(tokenBefore) && isCommaToken(tokenAfter) || // In middle of properties
                        isOpeningBraceToken(tokenBefore) && isCommaToken(tokenAfter))) {
                          yield fixer.remove(tokenAfter);
                        }
                        if (tokenBefore && tokenAfter && isCommaToken(tokenBefore) && isClosingBraceToken(tokenAfter)) {
                          yield fixer.remove(tokenBefore);
                        }
                        yield fixer.remove(onlyProperty);
                      }
                    }
                  ]
                });
              }
            } else if (test?.type === "CallExpression" && test.callee.type === "MemberExpression" && test.callee.object.type === "Identifier" && test.callee.object.name === "RuleTester" && test.callee.property.type === "Identifier" && test.callee.property.name === "only") {
              context.report({ node: test.callee, messageId: "foundOnly" });
            }
          }
        }
      }
    };
  }
};
var no_only_tests_default = rule;
export {
  no_only_tests_default as default
};
