import { getKeyName, getTestInfo } from "../utils.js";
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "enforce consistent usage of shorthand strings for test cases with no options",
      category: "Tests",
      recommended: false,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/test-case-shorthand-strings.md"
    },
    fixable: "code",
    schema: [
      {
        description: "What behavior to enforce of when shorthand strings should be banned or required.",
        enum: ["as-needed", "never", "consistent", "consistent-as-needed"]
      }
    ],
    defaultOptions: ["as-needed"],
    messages: {
      useShorthand: "Use {{preferred}} for this test case instead of {{actual}}."
    }
  },
  create(context) {
    const shorthandOption = context.options[0] || "as-needed";
    const sourceCode = context.sourceCode;
    function reportTestCases(cases) {
      const caseInfoList = cases.filter((testCase) => !!testCase).map((testCase) => {
        if (testCase.type === "Literal" || testCase.type === "TemplateLiteral") {
          return { node: testCase, shorthand: true, needsLongform: false };
        }
        if (testCase.type === "ObjectExpression") {
          return {
            node: testCase,
            shorthand: false,
            needsLongform: !(testCase.properties.length === 1 && getKeyName(testCase.properties[0]) === "code")
          };
        }
        return null;
      }).filter((testCase) => !!testCase);
      const isConsistent = new Set(caseInfoList.map((caseInfo) => caseInfo.shorthand)).size <= 1;
      const hasCaseNeedingLongform = caseInfoList.some(
        (caseInfo) => caseInfo.needsLongform
      );
      let caseInfoFilter;
      switch (shorthandOption) {
        case "as-needed":
          caseInfoFilter = (caseInfo) => !caseInfo.shorthand && !caseInfo.needsLongform;
          break;
        case "never":
          caseInfoFilter = (caseInfo) => caseInfo.shorthand;
          break;
        case "consistent":
          caseInfoFilter = isConsistent ? () => false : (caseInfo) => caseInfo.shorthand;
          break;
        case "consistent-as-needed":
          caseInfoFilter = (caseInfo) => caseInfo.shorthand === hasCaseNeedingLongform;
          break;
        default:
          return;
      }
      caseInfoList.filter(caseInfoFilter).forEach((badCaseInfo) => {
        context.report({
          node: badCaseInfo.node,
          messageId: "useShorthand",
          data: {
            preferred: badCaseInfo.shorthand ? "an object" : "a string",
            actual: badCaseInfo.shorthand ? "a string" : "an object"
          },
          fix(fixer) {
            return fixer.replaceText(
              badCaseInfo.node,
              badCaseInfo.shorthand ? `{code: ${sourceCode.getText(badCaseInfo.node)}}` : (
                // @ts-expect-error
                sourceCode.getText(badCaseInfo.node.properties[0].value)
              )
            );
          }
        });
      });
    }
    return {
      Program(ast) {
        getTestInfo(context, ast).map((testRun) => testRun.valid).filter(Boolean).forEach(reportTestCases);
      }
    };
  }
};
var test_case_shorthand_strings_default = rule;
export {
  test_case_shorthand_strings_default as default
};
