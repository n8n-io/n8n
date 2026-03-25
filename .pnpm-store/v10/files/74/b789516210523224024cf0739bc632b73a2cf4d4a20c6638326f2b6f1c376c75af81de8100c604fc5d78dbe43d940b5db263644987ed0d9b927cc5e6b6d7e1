import { getStaticValue } from "@eslint-community/eslint-utils";
import {
  collectReportViolationAndSuggestionData,
  getContextIdentifiers,
  getKeyName,
  getReportInfo,
  getRuleInfo
} from "../utils.js";
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "require using `messageId` instead of `message` or `desc` to report rule violations",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/prefer-message-ids.md"
    },
    fixable: void 0,
    schema: [],
    messages: {
      messagesMissing: "`meta.messages` must contain at least one violation message.",
      foundMessage: "Use `messageId` instead of `message` (for violations) or `desc` (for suggestions)."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const ruleInfo = getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }
    let contextIdentifiers;
    return {
      Program(ast) {
        const scope = sourceCode.getScope(ast);
        contextIdentifiers = getContextIdentifiers(
          sourceCode.scopeManager,
          ast
        );
        const metaNode = ruleInfo.meta;
        const messagesNode = metaNode && metaNode.type === "ObjectExpression" && metaNode.properties && metaNode.properties.filter((p) => p.type === "Property").find((p) => getKeyName(p) === "messages");
        if (!messagesNode) {
          context.report({
            node: metaNode || ruleInfo.create,
            messageId: "messagesMissing"
          });
          return;
        }
        const staticValue = getStaticValue(messagesNode.value, scope);
        if (!staticValue) {
          return;
        }
        if (staticValue.value && typeof staticValue.value === "object" && staticValue.value.constructor === Object && Object.keys(staticValue.value).length === 0) {
          context.report({
            node: messagesNode.value,
            messageId: "messagesMissing"
          });
        }
      },
      CallExpression(node) {
        if (node.callee.type === "MemberExpression" && contextIdentifiers.has(node.callee.object) && node.callee.property.type === "Identifier" && node.callee.property.name === "report") {
          const reportInfo = getReportInfo(node, context);
          if (!reportInfo) {
            return;
          }
          const reportMessages = collectReportViolationAndSuggestionData(
            reportInfo
          ).map((obj) => obj.message).filter((message) => !!message);
          for (const message of reportMessages) {
            context.report({
              node: message.parent,
              messageId: "foundMessage"
            });
          }
        }
      }
    };
  }
};
var prefer_message_ids_default = rule;
export {
  prefer_message_ids_default as default
};
