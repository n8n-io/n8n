import {
  collectReportViolationAndSuggestionData,
  findPossibleVariableValues,
  getContextIdentifiers,
  getKeyName,
  getMessageIdNodes,
  getReportInfo,
  getRuleInfo,
  isVariableFromParameter
} from "../utils.js";
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow unused `messageId`s in `meta.messages`",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-unused-message-ids.md"
    },
    fixable: void 0,
    schema: [],
    messages: {
      unusedMessage: 'The messageId "{{messageId}}" is never used.'
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const { scopeManager } = sourceCode;
    const ruleInfo = getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }
    const messageIdsUsed = /* @__PURE__ */ new Set();
    let contextIdentifiers;
    let hasSeenUnknownMessageId = false;
    let hasSeenViolationReport = false;
    const messageIdNodes = getMessageIdNodes(ruleInfo, scopeManager);
    if (!messageIdNodes) {
      return {};
    }
    return {
      Program(ast) {
        contextIdentifiers = getContextIdentifiers(scopeManager, ast);
      },
      "Program:exit"() {
        if (hasSeenUnknownMessageId || !hasSeenViolationReport) {
          return;
        }
        const scope = sourceCode.getScope(sourceCode.ast);
        const messageIdNodesUnused = messageIdNodes.filter(
          (node) => !messageIdsUsed.has(getKeyName(node, scope))
        );
        for (const messageIdNode of messageIdNodesUnused) {
          context.report({
            node: messageIdNode,
            messageId: "unusedMessage",
            data: {
              messageId: getKeyName(messageIdNode, scope)
            }
          });
        }
      },
      CallExpression(node) {
        if (node.callee.type === "MemberExpression" && contextIdentifiers.has(node.callee.object) && node.callee.property.type === "Identifier" && node.callee.property.name === "report") {
          const reportInfo = getReportInfo(node, context);
          if (!reportInfo) {
            return;
          }
          hasSeenViolationReport = true;
          const reportMessagesAndDataArray = collectReportViolationAndSuggestionData(reportInfo);
          for (const messageId of reportMessagesAndDataArray.map((obj) => obj.messageId).filter((messageId2) => !!messageId2)) {
            const values = messageId.type === "Literal" ? [messageId] : messageId.type === "Identifier" ? findPossibleVariableValues(messageId, scopeManager) : [];
            if (values.length === 0 || values.some((val) => val.type !== "Literal")) {
              hasSeenUnknownMessageId = true;
            }
            values.filter((value) => value.type === "Literal").map((value) => value.value).filter((value) => typeof value === "string").forEach((value) => messageIdsUsed.add(value));
          }
        }
      },
      Property(node) {
        if (node.key.type === "Identifier" && node.key.name === "messageId") {
          hasSeenViolationReport = true;
          const values = node.value.type === "Literal" ? [node.value] : findPossibleVariableValues(
            node.value,
            scopeManager
          );
          if (values.length === 0 || values.some((val) => val.type !== "Literal") || node.value.type === "Identifier" && isVariableFromParameter(node.value, scopeManager)) {
            hasSeenUnknownMessageId = true;
          }
          values.filter((val) => val.type === "Literal").map((val) => val.value).filter((val) => typeof val === "string").forEach((val) => messageIdsUsed.add(val));
        }
      }
    };
  }
};
var no_unused_message_ids_default = rule;
export {
  no_unused_message_ids_default as default
};
