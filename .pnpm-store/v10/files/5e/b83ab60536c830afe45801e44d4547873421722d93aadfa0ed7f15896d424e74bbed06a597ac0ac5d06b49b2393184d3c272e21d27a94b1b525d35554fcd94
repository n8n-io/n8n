import { d as safeReplaceTextBetween, f as createRule, g as import_ast_utils } from "../utils.js";
var function_call_spacing_default = createRule({
	name: "function-call-spacing",
	meta: {
		type: "layout",
		docs: { description: "Require or disallow spacing between function identifiers and their invocations" },
		fixable: "whitespace",
		schema: { anyOf: [{
			type: "array",
			items: [{
				type: "string",
				enum: ["never"]
			}],
			minItems: 0,
			maxItems: 1
		}, {
			type: "array",
			items: [{
				type: "string",
				enum: ["always"]
			}, {
				type: "object",
				properties: {
					allowNewlines: { type: "boolean" },
					optionalChain: {
						type: "object",
						properties: {
							before: { type: "boolean" },
							after: { type: "boolean" }
						},
						additionalProperties: false
					}
				},
				additionalProperties: false
			}],
			minItems: 0,
			maxItems: 2
		}] },
		defaultOptions: ["never"],
		messages: {
			unexpectedWhitespace: "Unexpected whitespace between function name and paren.",
			unexpectedNewline: "Unexpected newline between function name and paren.",
			missing: "Missing space between function name and paren."
		}
	},
	create(context, [option, config]) {
		const sourceCode = context.sourceCode;
		const text = sourceCode.getText();
		const { allowNewlines = false, optionalChain = {
			before: true,
			after: true
		} } = config ?? {};
		function checkSpacing(node, leftToken, rightToken) {
			const isOptionalCall = (0, import_ast_utils.isOptionalCallExpression)(node);
			const textBetweenTokens = text.slice(leftToken.range[1], rightToken.range[0]).replace(/\/\*.*?\*\//gu, "");
			const hasWhitespace = /\s/u.test(textBetweenTokens);
			const hasNewline = hasWhitespace && import_ast_utils.LINEBREAK_MATCHER.test(textBetweenTokens);
			if (option === "never") {
				if (hasWhitespace) return context.report({
					node,
					loc: {
						start: leftToken.loc.end,
						end: rightToken.loc.start
					},
					messageId: "unexpectedWhitespace",
					fix: safeReplaceTextBetween(sourceCode, leftToken, rightToken, isOptionalCall ? "?." : "")
				});
			} else if (isOptionalCall) {
				const { before: beforeOptionChain = true, after: afterOptionChain = true } = optionalChain;
				const hasPrefixSpace = /^\s/u.test(textBetweenTokens);
				const hasSuffixSpace = /\s$/u.test(textBetweenTokens);
				const hasCorrectPrefixSpace = beforeOptionChain ? hasPrefixSpace : !hasPrefixSpace;
				const hasCorrectSuffixSpace = afterOptionChain ? hasSuffixSpace : !hasSuffixSpace;
				const hasCorrectNewline = allowNewlines || !hasNewline;
				if (!hasCorrectPrefixSpace || !hasCorrectSuffixSpace || !hasCorrectNewline) {
					const messageId = !hasCorrectNewline ? "unexpectedNewline" : !beforeOptionChain && hasPrefixSpace || !afterOptionChain && hasSuffixSpace ? "unexpectedWhitespace" : "missing";
					context.report({
						node,
						loc: {
							start: leftToken.loc.end,
							end: rightToken.loc.start
						},
						messageId,
						fix: safeReplaceTextBetween(sourceCode, leftToken, rightToken, () => {
							let text = textBetweenTokens;
							if (!allowNewlines) {
								const GLOBAL_LINEBREAK_MATCHER = new RegExp(import_ast_utils.LINEBREAK_MATCHER.source, "g");
								text = text.replaceAll(GLOBAL_LINEBREAK_MATCHER, " ");
							}
							if (!hasCorrectPrefixSpace) text = beforeOptionChain ? ` ${text}` : text.trimStart();
							if (!hasCorrectSuffixSpace) text = afterOptionChain ? `${text} ` : text.trimEnd();
							return text;
						})
					});
				}
			} else if (!hasWhitespace) context.report({
				node,
				loc: {
					start: leftToken.loc.end,
					end: rightToken.loc.start
				},
				messageId: "missing",
				fix(fixer) {
					return fixer.insertTextBefore(rightToken, " ");
				}
			});
			else if (!allowNewlines && hasNewline) context.report({
				node,
				loc: {
					start: leftToken.loc.end,
					end: rightToken.loc.start
				},
				messageId: "unexpectedNewline",
				fix: safeReplaceTextBetween(sourceCode, leftToken, rightToken, " ")
			});
		}
		return {
			"CallExpression, NewExpression": function(node) {
				const closingParenToken = sourceCode.getLastToken(node);
				const lastCalleeTokenWithoutPossibleParens = sourceCode.getLastToken(node.typeArguments ?? node.callee);
				const openingParenToken = sourceCode.getFirstTokenBetween(lastCalleeTokenWithoutPossibleParens, closingParenToken, import_ast_utils.isOpeningParenToken);
				if (!openingParenToken || openingParenToken.range[1] >= node.range[1]) return;
				checkSpacing(node, sourceCode.getTokenBefore(openingParenToken, import_ast_utils.isNotOptionalChainPunctuator), openingParenToken);
			},
			ImportExpression(node) {
				const leftToken = sourceCode.getFirstToken(node);
				checkSpacing(node, leftToken, sourceCode.getTokenAfter(leftToken));
			}
		};
	}
});
export { function_call_spacing_default as t };
