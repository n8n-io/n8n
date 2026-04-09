import { f as createRule, w as canTokensBeAdjacent, z as isKeywordToken } from "../utils.js";
var space_unary_ops_default = createRule({
	name: "space-unary-ops",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent spacing before or after unary operators" },
		fixable: "whitespace",
		schema: [{
			type: "object",
			properties: {
				words: { type: "boolean" },
				nonwords: { type: "boolean" },
				overrides: {
					type: "object",
					additionalProperties: { type: "boolean" }
				}
			},
			additionalProperties: false
		}],
		defaultOptions: [{
			words: true,
			nonwords: false
		}],
		messages: {
			unexpectedBefore: "Unexpected space before unary operator '{{operator}}'.",
			unexpectedAfter: "Unexpected space after unary operator '{{operator}}'.",
			unexpectedAfterWord: "Unexpected space after unary word operator '{{word}}'.",
			requireAfterWord: "Unary word operator '{{word}}' must be followed by whitespace.",
			requireAfter: "Unary operator '{{operator}}' must be followed by whitespace.",
			requireBefore: "Space is required before unary operator '{{operator}}'."
		}
	},
	create(context, [options]) {
		const { words, nonwords, overrides = {} } = options;
		const sourceCode = context.sourceCode;
		function isFirstBangInBangBangExpression(node) {
			return node && node.type === "UnaryExpression" && node.argument && node.argument.type === "UnaryExpression" && node.argument.operator === "!";
		}
		function verifyWordHasSpaces(node, firstToken, secondToken, word) {
			if (secondToken.range[0] === firstToken.range[1]) context.report({
				node,
				messageId: "requireAfterWord",
				data: { word },
				fix(fixer) {
					return fixer.insertTextAfter(firstToken, " ");
				}
			});
		}
		function verifyWordDoesntHaveSpaces(node, firstToken, secondToken, word) {
			if (canTokensBeAdjacent(firstToken, secondToken)) {
				if (secondToken.range[0] > firstToken.range[1]) context.report({
					node,
					messageId: "unexpectedAfterWord",
					data: { word },
					fix(fixer) {
						return fixer.removeRange([firstToken.range[1], secondToken.range[0]]);
					}
				});
			}
		}
		function checkUnaryWordOperatorForSpaces(node, firstToken, secondToken, word) {
			if (overrides[word] ?? words) verifyWordHasSpaces(node, firstToken, secondToken, word);
			else verifyWordDoesntHaveSpaces(node, firstToken, secondToken, word);
		}
		function checkForSpacesAroundNonNull(node) {
			const operator = "!";
			const operatorToken = sourceCode.getLastToken(node, (token) => token.value === operator);
			const prefixToken = sourceCode.getTokenBefore(operatorToken);
			if (overrides["ts-non-null"] ?? overrides[operator] ?? nonwords) verifyNonWordsHaveSpaces(node, prefixToken, operatorToken);
			else verifyNonWordsDontHaveSpaces(node, prefixToken, operatorToken);
		}
		function checkForSpacesAfterYield(node) {
			const tokens = sourceCode.getFirstTokens(node, 3);
			const word = "yield";
			if (!node.argument || node.delegate) return;
			checkUnaryWordOperatorForSpaces(node, tokens[0], tokens[1], word);
		}
		function checkForSpacesAfterAwait(node) {
			const tokens = sourceCode.getFirstTokens(node, 3);
			checkUnaryWordOperatorForSpaces(node, tokens[0], tokens[1], "await");
		}
		function verifyNonWordsHaveSpaces(node, firstToken, secondToken) {
			if ("prefix" in node && node.prefix) {
				if (isFirstBangInBangBangExpression(node)) return;
				if (firstToken.range[1] === secondToken.range[0]) context.report({
					node,
					messageId: "requireAfter",
					data: { operator: firstToken.value },
					fix(fixer) {
						return fixer.insertTextAfter(firstToken, " ");
					}
				});
			} else if (firstToken.range[1] === secondToken.range[0]) context.report({
				node,
				messageId: "requireBefore",
				data: { operator: secondToken.value },
				fix(fixer) {
					return fixer.insertTextBefore(secondToken, " ");
				}
			});
		}
		function verifyNonWordsDontHaveSpaces(node, firstToken, secondToken) {
			if ("prefix" in node && node.prefix) {
				if (secondToken.range[0] > firstToken.range[1]) context.report({
					node,
					messageId: "unexpectedAfter",
					data: { operator: firstToken.value },
					fix(fixer) {
						if (canTokensBeAdjacent(firstToken, secondToken)) return fixer.removeRange([firstToken.range[1], secondToken.range[0]]);
						return null;
					}
				});
			} else if (secondToken.range[0] > firstToken.range[1]) context.report({
				node,
				messageId: "unexpectedBefore",
				data: { operator: secondToken.value },
				fix(fixer) {
					return fixer.removeRange([firstToken.range[1], secondToken.range[0]]);
				}
			});
		}
		function checkForSpaces(node) {
			const tokens = node.type === "UpdateExpression" && !node.prefix ? sourceCode.getLastTokens(node, 2) : sourceCode.getFirstTokens(node, 2);
			const firstToken = tokens[0];
			const secondToken = tokens[1];
			if ((node.type === "NewExpression" || node.prefix) && isKeywordToken(firstToken)) {
				checkUnaryWordOperatorForSpaces(node, firstToken, secondToken, firstToken.value);
				return;
			}
			if (overrides["prefix" in node && node.prefix ? tokens[0].value : tokens[1].value] ?? nonwords) verifyNonWordsHaveSpaces(node, firstToken, secondToken);
			else verifyNonWordsDontHaveSpaces(node, firstToken, secondToken);
		}
		return {
			UnaryExpression: checkForSpaces,
			UpdateExpression: checkForSpaces,
			NewExpression: checkForSpaces,
			YieldExpression: checkForSpacesAfterYield,
			AwaitExpression: checkForSpacesAfterAwait,
			TSNonNullExpression: checkForSpacesAroundNonNull
		};
	}
});
export { space_unary_ops_default as t };
