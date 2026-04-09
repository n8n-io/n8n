import { f as createRule, g as import_ast_utils } from "../utils.js";
var no_multi_spaces_default = createRule({
	name: "no-multi-spaces",
	meta: {
		type: "layout",
		docs: { description: "Disallow multiple spaces" },
		fixable: "whitespace",
		schema: [{
			type: "object",
			properties: {
				exceptions: {
					type: "object",
					patternProperties: { "^([A-Z][a-z]*)+$": { type: "boolean" } },
					additionalProperties: false
				},
				ignoreEOLComments: { type: "boolean" },
				includeTabs: { type: "boolean" }
			},
			additionalProperties: false
		}],
		defaultOptions: [{
			exceptions: {
				Property: true,
				ImportAttribute: true
			},
			ignoreEOLComments: false,
			includeTabs: true
		}],
		messages: { multipleSpaces: "Multiple spaces found before '{{displayValue}}'." }
	},
	create(context, [options]) {
		const { ignoreEOLComments, exceptions, includeTabs } = options;
		const sourceCode = context.sourceCode;
		const hasExceptions = Object.keys(exceptions).some((key) => exceptions[key]);
		const spacesRe = includeTabs ? /[ \t]{2}/ : / {2}/;
		function formatReportedCommentValue(token) {
			const valueLines = token.value.split("\n");
			const value = valueLines[0];
			const formattedValue = `${value.slice(0, 12)}...`;
			return valueLines.length === 1 && value.length <= 12 ? value : formattedValue;
		}
		return { Program() {
			sourceCode.tokensAndComments.forEach((leftToken, leftIndex, tokensAndComments) => {
				if (leftIndex === tokensAndComments.length - 1) return;
				const rightToken = tokensAndComments[leftIndex + 1];
				if (!spacesRe.test(sourceCode.text.slice(leftToken.range[1], rightToken.range[0])) || leftToken.loc.end.line < rightToken.loc.start.line) return;
				if (ignoreEOLComments && (0, import_ast_utils.isCommentToken)(rightToken) && (leftIndex === tokensAndComments.length - 2 || rightToken.loc.end.line < tokensAndComments[leftIndex + 2].loc.start.line)) return;
				if (hasExceptions) {
					const parentNode = sourceCode.getNodeByRangeIndex(rightToken.range[0] - 1);
					if (parentNode && exceptions[parentNode.type]) return;
				}
				let displayValue;
				if (rightToken.type === "Block") displayValue = `/*${formatReportedCommentValue(rightToken)}*/`;
				else if (rightToken.type === "Line") displayValue = `//${formatReportedCommentValue(rightToken)}`;
				else displayValue = rightToken.value;
				context.report({
					node: rightToken,
					loc: {
						start: leftToken.loc.end,
						end: rightToken.loc.start
					},
					messageId: "multipleSpaces",
					data: { displayValue },
					fix: (fixer) => fixer.replaceTextRange([leftToken.range[1], rightToken.range[0]], " ")
				});
			});
		} };
	}
});
export { no_multi_spaces_default as t };
