import { f as createRule, g as import_ast_utils, h as AST_TOKEN_TYPES } from "../utils.js";
var comma_spacing_default = createRule({
	name: "comma-spacing",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent spacing before and after commas" },
		fixable: "whitespace",
		schema: [{
			type: "object",
			properties: {
				before: { type: "boolean" },
				after: { type: "boolean" }
			},
			additionalProperties: false
		}],
		defaultOptions: [{
			before: false,
			after: true
		}],
		messages: {
			unexpected: `There should be no space {{loc}} ','.`,
			missing: `A space is required {{loc}} ','.`
		}
	},
	create(context, [options]) {
		const { before: spaceBefore, after: spaceAfter } = options;
		const sourceCode = context.sourceCode;
		const tokensAndComments = sourceCode.tokensAndComments;
		const ignoredTokens = /* @__PURE__ */ new Set();
		function addNullElementsToIgnoreList(node) {
			let previousToken = sourceCode.getFirstToken(node);
			for (const element of node.elements) {
				let token;
				if (element == null) {
					token = sourceCode.getTokenAfter(previousToken);
					if (token && (0, import_ast_utils.isCommaToken)(token)) ignoredTokens.add(token);
				} else token = sourceCode.getTokenAfter(element);
				previousToken = token;
			}
		}
		function addTypeParametersTrailingCommaToIgnoreList(node) {
			const paramLength = node.params.length;
			if (paramLength) {
				const param = node.params[paramLength - 1];
				const afterToken = sourceCode.getTokenAfter(param);
				if (afterToken && (0, import_ast_utils.isCommaToken)(afterToken)) ignoredTokens.add(afterToken);
			}
		}
		function validateCommaSpacing(commaToken, prevToken, nextToken) {
			if (prevToken && (0, import_ast_utils.isTokenOnSameLine)(prevToken, commaToken) && spaceBefore !== sourceCode.isSpaceBetween(prevToken, commaToken)) context.report({
				node: commaToken,
				data: { loc: "before" },
				messageId: spaceBefore ? "missing" : "unexpected",
				fix: (fixer) => spaceBefore ? fixer.insertTextBefore(commaToken, " ") : fixer.replaceTextRange([prevToken.range[1], commaToken.range[0]], "")
			});
			if (nextToken && (0, import_ast_utils.isTokenOnSameLine)(commaToken, nextToken) && !(0, import_ast_utils.isClosingParenToken)(nextToken) && !(0, import_ast_utils.isClosingBracketToken)(nextToken) && !(0, import_ast_utils.isClosingBraceToken)(nextToken) && !(!spaceAfter && nextToken.type === AST_TOKEN_TYPES.Line) && spaceAfter !== sourceCode.isSpaceBetween(commaToken, nextToken)) context.report({
				node: commaToken,
				data: { loc: "after" },
				messageId: spaceAfter ? "missing" : "unexpected",
				fix: (fixer) => spaceAfter ? fixer.insertTextAfter(commaToken, " ") : fixer.replaceTextRange([commaToken.range[1], nextToken.range[0]], "")
			});
		}
		return {
			"ArrayExpression": addNullElementsToIgnoreList,
			"ArrayPattern": addNullElementsToIgnoreList,
			"TSTypeParameterDeclaration": addTypeParametersTrailingCommaToIgnoreList,
			"Program:exit": function() {
				tokensAndComments.forEach((token, i) => {
					if (!(0, import_ast_utils.isCommaToken)(token)) return;
					const prevToken = tokensAndComments[i - 1];
					const nextToken = tokensAndComments[i + 1];
					validateCommaSpacing(token, (0, import_ast_utils.isCommaToken)(prevToken) || ignoredTokens.has(token) ? null : prevToken, nextToken && (0, import_ast_utils.isCommaToken)(nextToken) || ignoredTokens.has(token) ? null : nextToken);
				});
			}
		};
	}
});
export { comma_spacing_default as t };
