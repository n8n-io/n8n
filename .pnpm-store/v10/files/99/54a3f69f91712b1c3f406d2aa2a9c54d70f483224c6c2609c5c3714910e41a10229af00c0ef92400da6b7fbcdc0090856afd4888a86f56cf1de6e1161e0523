import { collectReportViolationAndSuggestionData, findPossibleVariableValues, getContextIdentifiers, getReportInfo, getRuleInfo, isStringLiteral } from "../utils.js";

//#region lib/rules/no-matching-violation-suggest-message-ids.ts
const rule = {
	meta: {
		type: "suggestion",
		docs: {
			recommended: false,
			description: "require suggestions to have different `messageId` than their parent report",
			category: "Rules",
			url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-matching-violation-suggest-message-ids.md"
		},
		schema: [],
		messages: { matchingMessageId: "Suggestion messageId \"{{messageId}}\" should not match its parent report messageId." }
	},
	create(context) {
		const sourceCode = context.sourceCode;
		const { scopeManager } = sourceCode;
		if (!getRuleInfo(sourceCode)) return {};
		const contextIdentifiers = getContextIdentifiers(scopeManager, sourceCode.ast);
		return { "CallExpression:has(>MemberExpression[property.name=\"report\"])"(_node) {
			const node = _node;
			if (!contextIdentifiers.has(node.callee.object)) return;
			const reportInfo = getReportInfo(node, context);
			if (!reportInfo) return;
			const [report, ...suggestions] = collectReportViolationAndSuggestionData(reportInfo).map((obj) => ({
				...obj,
				literalMessageIds: messageIdToLiteralValues(obj.messageId, scopeManager)
			}));
			if (report.literalMessageIds.length === 0 || suggestions.length === 0) return;
			const reportContainsMessageId = (messageId) => {
				return report.literalMessageIds.some((reportMessageId) => messageId.value === reportMessageId.value);
			};
			suggestions.forEach((suggestion) => {
				const matchingMessageId = suggestion.literalMessageIds.find(reportContainsMessageId);
				if (matchingMessageId) context.report({
					messageId: "matchingMessageId",
					node: matchingMessageId,
					data: { messageId: matchingMessageId.value }
				});
			});
		} };
	}
};
function messageIdToLiteralValues(messageId, scopeManager) {
	if (!messageId) return [];
	if (isStringLiteral(messageId)) return [messageId];
	if (messageId.type === "ConditionalExpression") return [...messageIdToLiteralValues(messageId.consequent, scopeManager), ...messageIdToLiteralValues(messageId.alternate, scopeManager)];
	if (messageId.type === "Identifier") return findPossibleVariableValues(messageId, scopeManager).filter(isStringLiteral);
	return [];
}

//#endregion
export { rule as default };