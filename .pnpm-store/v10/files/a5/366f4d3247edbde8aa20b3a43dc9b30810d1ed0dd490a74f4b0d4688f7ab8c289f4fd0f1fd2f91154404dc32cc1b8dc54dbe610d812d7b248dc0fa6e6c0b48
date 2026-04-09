import { f as createRule, g as import_ast_utils } from "../utils.js";
var space_in_parens_default = createRule({
	name: "space-in-parens",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent spacing inside parentheses" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: ["always", "never"]
		}, {
			type: "object",
			properties: { exceptions: {
				type: "array",
				items: {
					type: "string",
					enum: [
						"{}",
						"[]",
						"()",
						"empty"
					]
				},
				uniqueItems: true
			} },
			additionalProperties: false
		}],
		defaultOptions: ["never"],
		messages: {
			missingOpeningSpace: "There must be a space after this paren.",
			missingClosingSpace: "There must be a space before this paren.",
			rejectedOpeningSpace: "There should be no space after this paren.",
			rejectedClosingSpace: "There should be no space before this paren."
		}
	},
	create(context, [style, { exceptions: exceptionsArrayOptions = [] } = {}]) {
		const ALWAYS = style === "always";
		const options = {
			braceException: false,
			bracketException: false,
			parenException: false,
			empty: false
		};
		let exceptions = {
			openers: [],
			closers: []
		};
		if (exceptionsArrayOptions.length) {
			options.braceException = exceptionsArrayOptions.includes("{}");
			options.bracketException = exceptionsArrayOptions.includes("[]");
			options.parenException = exceptionsArrayOptions.includes("()");
			options.empty = exceptionsArrayOptions.includes("empty");
		}
		function getExceptions() {
			const openers = [];
			const closers = [];
			if (options.braceException) {
				openers.push("{");
				closers.push("}");
			}
			if (options.bracketException) {
				openers.push("[");
				closers.push("]");
			}
			if (options.parenException) {
				openers.push("(");
				closers.push(")");
			}
			if (options.empty) {
				openers.push(")");
				closers.push("(");
			}
			return {
				openers,
				closers
			};
		}
		const sourceCode = context.sourceCode;
		function isOpenerException(token) {
			return exceptions.openers.includes(token.value);
		}
		function isCloserException(token) {
			return exceptions.closers.includes(token.value);
		}
		function openerMissingSpace(openingParenToken, tokenAfterOpeningParen) {
			if (sourceCode.isSpaceBetween(openingParenToken, tokenAfterOpeningParen)) return false;
			if (!options.empty && (0, import_ast_utils.isClosingParenToken)(tokenAfterOpeningParen)) return false;
			if (ALWAYS) return !isOpenerException(tokenAfterOpeningParen);
			return isOpenerException(tokenAfterOpeningParen);
		}
		function openerRejectsSpace(openingParenToken, tokenAfterOpeningParen) {
			if (!(0, import_ast_utils.isTokenOnSameLine)(openingParenToken, tokenAfterOpeningParen)) return false;
			if (tokenAfterOpeningParen.type === "Line") return false;
			if (!sourceCode.isSpaceBetween(openingParenToken, tokenAfterOpeningParen)) return false;
			if (ALWAYS) return isOpenerException(tokenAfterOpeningParen);
			return !isOpenerException(tokenAfterOpeningParen);
		}
		function closerMissingSpace(tokenBeforeClosingParen, closingParenToken) {
			if (sourceCode.isSpaceBetween(tokenBeforeClosingParen, closingParenToken)) return false;
			if (!options.empty && (0, import_ast_utils.isOpeningParenToken)(tokenBeforeClosingParen)) return false;
			if (ALWAYS) return !isCloserException(tokenBeforeClosingParen);
			return isCloserException(tokenBeforeClosingParen);
		}
		function closerRejectsSpace(tokenBeforeClosingParen, closingParenToken) {
			if (!(0, import_ast_utils.isTokenOnSameLine)(tokenBeforeClosingParen, closingParenToken)) return false;
			if (!sourceCode.isSpaceBetween(tokenBeforeClosingParen, closingParenToken)) return false;
			if (ALWAYS) return isCloserException(tokenBeforeClosingParen);
			return !isCloserException(tokenBeforeClosingParen);
		}
		return { Program: function checkParenSpaces(node) {
			exceptions = getExceptions();
			const tokens = sourceCode.tokensAndComments;
			tokens.forEach((token, i) => {
				const prevToken = tokens[i - 1];
				const nextToken = tokens[i + 1];
				if (!(0, import_ast_utils.isOpeningParenToken)(token) && !(0, import_ast_utils.isClosingParenToken)(token)) return;
				if (token.value === "(" && openerMissingSpace(token, nextToken)) context.report({
					node,
					loc: token.loc,
					messageId: "missingOpeningSpace",
					fix(fixer) {
						return fixer.insertTextAfter(token, " ");
					}
				});
				if (token.value === "(" && openerRejectsSpace(token, nextToken)) context.report({
					node,
					loc: {
						start: token.loc.end,
						end: nextToken.loc.start
					},
					messageId: "rejectedOpeningSpace",
					fix(fixer) {
						return fixer.removeRange([token.range[1], nextToken.range[0]]);
					}
				});
				if (token.value === ")" && closerMissingSpace(prevToken, token)) context.report({
					node,
					loc: token.loc,
					messageId: "missingClosingSpace",
					fix(fixer) {
						return fixer.insertTextBefore(token, " ");
					}
				});
				if (token.value === ")" && closerRejectsSpace(prevToken, token)) context.report({
					node,
					loc: {
						start: prevToken.loc.end,
						end: token.loc.start
					},
					messageId: "rejectedClosingSpace",
					fix(fixer) {
						return fixer.removeRange([prevToken.range[1], token.range[0]]);
					}
				});
			});
		} };
	}
});
export { space_in_parens_default as t };
