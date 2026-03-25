import { getStaticValue } from "@eslint-community/eslint-utils";
import {
  collectReportViolationAndSuggestionData,
  getContextIdentifiers,
  getKeyName,
  getMessageIdNodeById,
  getMessagesNode,
  getReportInfo,
  getRuleInfo
} from "../utils.js";
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow unused placeholders in rule report messages",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-unused-placeholders.md"
    },
    fixable: void 0,
    schema: [],
    messages: {
      placeholderUnused: "The placeholder {{{{unusedKey}}}} is unused (does not exist in the actual message)."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const { scopeManager } = sourceCode;
    let contextIdentifiers = /* @__PURE__ */ new Set();
    const ruleInfo = getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }
    const messagesNode = getMessagesNode(ruleInfo, scopeManager);
    return {
      Program(ast) {
        contextIdentifiers = getContextIdentifiers(scopeManager, ast);
      },
      CallExpression(node) {
        const scope = sourceCode.getScope(node);
        if (node.callee.type === "MemberExpression" && contextIdentifiers.has(node.callee.object) && node.callee.property.type === "Identifier" && node.callee.property.name === "report") {
          const reportInfo = getReportInfo(node, context);
          if (!reportInfo) {
            return;
          }
          const reportMessagesAndDataArray = collectReportViolationAndSuggestionData(reportInfo);
          if (messagesNode) {
            reportMessagesAndDataArray.forEach((obj) => {
              if (!obj.message && obj.messageId && obj.messageId.type === "Literal" && typeof obj.messageId.value === "string") {
                const correspondingMessage = getMessageIdNodeById(
                  obj.messageId.value,
                  ruleInfo,
                  scopeManager,
                  scope
                );
                if (correspondingMessage) {
                  obj.message = correspondingMessage.value;
                }
              }
            });
          }
          for (const { message, data } of reportMessagesAndDataArray.filter(
            (obj) => obj.message
          )) {
            const messageStaticValue = getStaticValue(message, scope);
            if ((message?.type === "Literal" && typeof message.value === "string" || messageStaticValue && typeof messageStaticValue.value === "string") && data && data.type === "ObjectExpression") {
              const messageValue = (
                // @ts-expect-error
                message.value || messageStaticValue.value
              );
              const PLACEHOLDER_MATCHER = /{{\s*([^{}]+?)\s*}}/g;
              const placeholdersInMessage = /* @__PURE__ */ new Set();
              const matches = messageValue.matchAll(PLACEHOLDER_MATCHER);
              for (const match of matches) {
                if (match[1]) {
                  placeholdersInMessage.add(match[1]);
                }
              }
              data.properties.forEach((prop) => {
                const key = getKeyName(prop);
                if (key && !placeholdersInMessage.has(key)) {
                  context.report({
                    node: prop,
                    messageId: "placeholderUnused",
                    data: { unusedKey: key }
                  });
                }
              });
            }
          }
        }
      }
    };
  }
};
var no_unused_placeholders_default = rule;
export {
  no_unused_placeholders_default as default
};
