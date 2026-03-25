import { getStaticValue } from "@eslint-community/eslint-utils";
import {
  getContextIdentifiers,
  getKeyName,
  getReportInfo,
  getRuleInfo
} from "../utils.js";
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "enforce a consistent format for rule report messages",
      category: "Rules",
      recommended: false,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/report-message-format.md"
    },
    fixable: void 0,
    schema: [
      {
        description: "Format that all report messages must match.",
        type: "string"
      }
    ],
    defaultOptions: [""],
    messages: {
      noMatch: "Report message does not match the pattern '{{pattern}}'."
    }
  },
  create(context) {
    const pattern = new RegExp(context.options[0] || "");
    let contextIdentifiers;
    function processMessageNode(message, scope) {
      const staticValue = getStaticValue(message, scope);
      if (message.type === "Literal" && typeof message.value === "string" && !pattern.test(message.value) || message.type === "TemplateLiteral" && message.quasis.length === 1 && !pattern.test(message.quasis[0].value.cooked ?? "") || staticValue && typeof staticValue.value === "string" && !pattern.test(staticValue.value)) {
        context.report({
          node: message,
          messageId: "noMatch",
          data: { pattern: context.options[0] || "" }
        });
      }
    }
    const sourceCode = context.sourceCode;
    const ruleInfo = getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }
    return {
      Program(ast) {
        const scope = sourceCode.getScope(ast);
        contextIdentifiers = getContextIdentifiers(
          sourceCode.scopeManager,
          ast
        );
        const messagesObject = ruleInfo && ruleInfo.meta && ruleInfo.meta.type === "ObjectExpression" && ruleInfo.meta.properties.filter((prop) => prop.type === "Property").find((prop) => getKeyName(prop) === "messages");
        if (!messagesObject || messagesObject.value.type !== "ObjectExpression") {
          return;
        }
        messagesObject.value.properties.filter((prop) => prop.type === "Property").map((prop) => prop.value).forEach((it) => processMessageNode(it, scope));
      },
      CallExpression(node) {
        const scope = sourceCode.getScope(node);
        if (node.callee.type === "MemberExpression" && contextIdentifiers.has(node.callee.object) && node.callee.property.type === "Identifier" && node.callee.property.name === "report") {
          const reportInfo = getReportInfo(node, context);
          const message = reportInfo && reportInfo.message;
          const suggest = reportInfo && reportInfo.suggest;
          if (message) {
            processMessageNode(message, scope);
          }
          if (suggest && suggest.type === "ArrayExpression") {
            suggest.elements.flatMap(
              (obj) => !!obj && obj.type === "ObjectExpression" ? obj.properties : []
            ).filter((prop) => prop.type === "Property").filter(
              (prop) => prop.key.type === "Identifier" && prop.key.name === "message"
            ).map((prop) => prop.value).forEach((it) => processMessageNode(it, scope));
          }
        }
      }
    };
  }
};
var report_message_format_default = rule;
export {
  report_message_format_default as default
};
