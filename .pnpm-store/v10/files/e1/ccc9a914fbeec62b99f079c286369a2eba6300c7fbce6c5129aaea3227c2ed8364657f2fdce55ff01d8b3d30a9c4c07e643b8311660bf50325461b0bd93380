import {
  collectReportViolationAndSuggestionData,
  findPossibleVariableValues,
  getContextIdentifiers,
  getMessageIdNodeById,
  getMessagesNode,
  getReportInfo,
  getRuleInfo
} from "../utils.js";
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow `messageId`s that are missing from `meta.messages`",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-missing-message-ids.md"
    },
    fixable: void 0,
    schema: [],
    messages: {
      missingMessage: '`meta.messages` is missing the messageId "{{messageId}}".'
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const { scopeManager } = sourceCode;
    const ruleInfo = getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }
    const messagesNode = getMessagesNode(ruleInfo, scopeManager);
    let contextIdentifiers;
    if (!messagesNode || messagesNode.type !== "ObjectExpression") {
      return {};
    }
    return {
      Program(ast) {
        contextIdentifiers = getContextIdentifiers(scopeManager, ast);
      },
      CallExpression(node) {
        const scope = context.sourceCode.getScope(node);
        if (node.callee.type === "MemberExpression" && contextIdentifiers.has(node.callee.object) && node.callee.property.type === "Identifier" && node.callee.property.name === "report") {
          const reportInfo = getReportInfo(node, context);
          if (!reportInfo) {
            return;
          }
          const reportMessagesAndDataArray = collectReportViolationAndSuggestionData(reportInfo);
          for (const messageId of reportMessagesAndDataArray.map((obj) => obj.messageId).filter((messageId2) => !!messageId2)) {
            const values = messageId.type === "Literal" ? [messageId] : findPossibleVariableValues(
              messageId,
              scopeManager
            );
            values.forEach((val) => {
              if (val.type === "Literal" && typeof val.value === "string" && val.value !== "" && !getMessageIdNodeById(val.value, ruleInfo, scopeManager, scope))
                context.report({
                  node: val,
                  messageId: "missingMessage",
                  data: {
                    messageId: val.value
                  }
                });
            });
          }
        }
      }
    };
  }
};
var no_missing_message_ids_default = rule;
export {
  no_missing_message_ids_default as default
};
