import { getTestInfo } from "../utils.js";
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "disallow invalid RuleTester test cases where the `output` matches the `code`",
      category: "Tests",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/prefer-output-null.md"
    },
    fixable: "code",
    schema: [],
    messages: {
      useOutputNull: "Use `output: null` to assert that a test case is not autofixed."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Program(ast) {
        getTestInfo(context, ast).forEach((testRun) => {
          testRun.invalid.filter((test) => !!test).forEach((test) => {
            function getTestInfoProperty(key) {
              if (test.type === "ObjectExpression") {
                return test.properties.filter((item) => item.type === "Property").find(
                  (item) => item.key.type === "Identifier" && item.key.name === key
                ) ?? null;
              }
              return null;
            }
            const code = getTestInfoProperty("code");
            const output = getTestInfoProperty("output");
            if (output && code && sourceCode.getText(output.value) === sourceCode.getText(code.value)) {
              context.report({
                node: output,
                messageId: "useOutputNull",
                fix: (fixer) => fixer.replaceText(output.value, "null")
              });
            }
          });
        });
      }
    };
  }
};
var prefer_output_null_default = rule;
export {
  prefer_output_null_default as default
};
