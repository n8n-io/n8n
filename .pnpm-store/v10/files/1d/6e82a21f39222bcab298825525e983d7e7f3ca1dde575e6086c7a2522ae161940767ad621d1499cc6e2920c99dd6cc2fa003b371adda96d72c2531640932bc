import { getTestInfo } from "../utils.js";
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow identical tests",
      category: "Tests",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-identical-tests.md"
    },
    fixable: "code",
    schema: [],
    messages: {
      identical: "This test case is identical to another case."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    function toKey(test) {
      if (test.type !== "ObjectExpression") {
        return JSON.stringify([test.type, sourceCode.getText(test)]);
      }
      return JSON.stringify([
        test.type,
        ...test.properties.map((p) => sourceCode.getText(p)).sort()
      ]);
    }
    return {
      Program(ast) {
        getTestInfo(context, ast).forEach((testRun) => {
          [testRun.valid, testRun.invalid].forEach((tests) => {
            const cache = /* @__PURE__ */ new Set();
            tests.filter((test) => !!test).forEach((test) => {
              const key = toKey(test);
              if (cache.has(key)) {
                context.report({
                  node: test,
                  messageId: "identical",
                  fix(fixer) {
                    const start = sourceCode.getTokenBefore(test);
                    const end = sourceCode.getTokenAfter(test);
                    return fixer.removeRange(
                      // should remove test's trailing comma
                      [
                        start.range[1],
                        end.value === "," ? end.range[1] : test.range[1]
                      ]
                    );
                  }
                });
              } else {
                cache.add(key);
              }
            });
          });
        });
      }
    };
  }
};
var no_identical_tests_default = rule;
export {
  no_identical_tests_default as default
};
