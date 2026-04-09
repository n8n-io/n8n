import { f as createRule, g as import_ast_utils, w as canTokensBeAdjacent } from "../utils.js";
function hasBlockBody(node) {
	return node.body.type === "BlockStatement";
}
var arrow_parens_default = createRule({
	name: "arrow-parens",
	meta: {
		type: "layout",
		docs: { description: "Require parentheses around arrow function arguments" },
		fixable: "code",
		schema: [{
			type: "string",
			enum: ["always", "as-needed"]
		}, {
			type: "object",
			properties: { requireForBlockBody: { type: "boolean" } },
			additionalProperties: false
		}],
		defaultOptions: ["always"],
		messages: {
			unexpectedParens: "Unexpected parentheses around single function argument.",
			expectedParens: "Expected parentheses around arrow function argument.",
			unexpectedParensInline: "Unexpected parentheses around single function argument having a body with no curly braces.",
			expectedParensBlock: "Expected parentheses around arrow function argument having a body with curly braces."
		}
	},
	create(context, [style, options]) {
		const asNeeded = style === "as-needed";
		const requireForBlockBody = asNeeded && options?.requireForBlockBody === true;
		const sourceCode = context.sourceCode;
		function findOpeningParenOfParams(node) {
			const tokenBeforeParams = sourceCode.getTokenBefore(node.params[0]);
			if (tokenBeforeParams && (0, import_ast_utils.isOpeningParenToken)(tokenBeforeParams) && node.range[0] <= tokenBeforeParams.range[0]) return tokenBeforeParams;
			return null;
		}
		function getClosingParenOfParams(node) {
			return sourceCode.getTokenAfter(node.params[0], import_ast_utils.isClosingParenToken);
		}
		function hasCommentsInParensOfParams(node, openingParen) {
			return sourceCode.commentsExistBetween(openingParen, getClosingParenOfParams(node));
		}
		function hasUnexpectedTokensBeforeOpeningParen(node, openingParen) {
			const expectedCount = node.async ? 1 : 0;
			return sourceCode.getFirstToken(node, { skip: expectedCount }) !== openingParen;
		}
		return { "ArrowFunctionExpression[params.length=1]": function(node) {
			const shouldHaveParens = !asNeeded || requireForBlockBody && hasBlockBody(node);
			const openingParen = findOpeningParenOfParams(node);
			const hasParens = openingParen !== null;
			const [param] = node.params;
			if (shouldHaveParens && !hasParens) context.report({
				node,
				messageId: requireForBlockBody ? "expectedParensBlock" : "expectedParens",
				loc: param.loc,
				*fix(fixer) {
					yield fixer.insertTextBefore(param, "(");
					yield fixer.insertTextAfter(param, ")");
				}
			});
			if (!shouldHaveParens && hasParens && param.type === "Identifier" && !param.optional && !param.typeAnnotation && !node.returnType && !hasCommentsInParensOfParams(node, openingParen) && !hasUnexpectedTokensBeforeOpeningParen(node, openingParen)) context.report({
				node,
				messageId: requireForBlockBody ? "unexpectedParensInline" : "unexpectedParens",
				loc: param.loc,
				*fix(fixer) {
					const tokenBeforeOpeningParen = sourceCode.getTokenBefore(openingParen);
					const closingParen = getClosingParenOfParams(node);
					if (tokenBeforeOpeningParen && tokenBeforeOpeningParen.range[1] === openingParen.range[0] && !canTokensBeAdjacent(tokenBeforeOpeningParen, sourceCode.getFirstToken(param))) yield fixer.insertTextBefore(openingParen, " ");
					yield fixer.removeRange([openingParen.range[0], param.range[0]]);
					yield fixer.removeRange([param.range[1], closingParen.range[1]]);
				}
			});
		} };
	}
});
export { arrow_parens_default as t };
