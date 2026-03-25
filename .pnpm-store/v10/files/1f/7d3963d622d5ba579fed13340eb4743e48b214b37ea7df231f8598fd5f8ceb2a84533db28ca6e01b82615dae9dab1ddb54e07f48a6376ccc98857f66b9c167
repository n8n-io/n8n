import { getContextIdentifiers, getReportInfo } from "../utils.js";
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "disallow the version of `context.report()` with multiple arguments",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-deprecated-report-api.md"
    },
    fixable: "code",
    // or "code" or "whitespace"
    schema: [],
    messages: {
      useNewAPI: "Use the new-style context.report() API."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    let contextIdentifiers;
    return {
      Program(ast) {
        contextIdentifiers = getContextIdentifiers(
          sourceCode.scopeManager,
          ast
        );
      },
      CallExpression(node) {
        if (node.callee.type === "MemberExpression" && contextIdentifiers.has(node.callee.object) && node.callee.property.type === "Identifier" && node.callee.property.name === "report" && (node.arguments.length > 1 || node.arguments.length === 1 && node.arguments[0].type === "SpreadElement")) {
          context.report({
            node: node.callee.property,
            messageId: "useNewAPI",
            fix(fixer) {
              const openingParen = sourceCode.getTokenBefore(
                node.arguments[0]
              );
              const closingParen = sourceCode.getLastToken(node);
              const reportInfo = getReportInfo(node, context);
              if (!reportInfo) {
                return null;
              }
              return fixer.replaceTextRange(
                [openingParen.range[1], closingParen.range[0]],
                `{${Object.keys(reportInfo).map(
                  (key) => `${key}: ${sourceCode.getText(reportInfo[key])}`
                ).join(", ")}}`
              );
            }
          });
        }
      }
    };
  }
};
var no_deprecated_report_api_default = rule;
export {
  no_deprecated_report_api_default as default
};
