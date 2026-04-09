import { S as STATEMENT_LIST_PARENTS, d as safeReplaceTextBetween, f as createRule, g as import_ast_utils } from "../utils.js";
var brace_style_default = createRule({
	name: "brace-style",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent brace style for blocks" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: [
				"1tbs",
				"stroustrup",
				"allman"
			]
		}, {
			type: "object",
			properties: { allowSingleLine: { type: "boolean" } },
			additionalProperties: false
		}],
		defaultOptions: ["1tbs", { allowSingleLine: false }],
		messages: {
			nextLineOpen: "Opening curly brace does not appear on the same line as controlling statement.",
			sameLineOpen: "Opening curly brace appears on the same line as controlling statement.",
			blockSameLine: "Statement inside of curly braces should be on next line.",
			nextLineClose: "Closing curly brace does not appear on the same line as the subsequent block.",
			singleLineClose: "Closing curly brace should be on the same line as opening curly brace or on the line after the previous block.",
			sameLineClose: "Closing curly brace appears on the same line as the subsequent block."
		}
	},
	create(context, [style, options]) {
		const sourceCode = context.sourceCode;
		const { allowSingleLine } = options;
		const isAllmanStyle = style === "allman";
		function validateCurlyPair(openingCurlyToken, closingCurlyToken) {
			const tokenBeforeOpeningCurly = sourceCode.getTokenBefore(openingCurlyToken);
			const tokenBeforeClosingCurly = sourceCode.getTokenBefore(closingCurlyToken);
			const tokenAfterOpeningCurly = sourceCode.getTokenAfter(openingCurlyToken);
			const singleLineException = allowSingleLine && (0, import_ast_utils.isTokenOnSameLine)(openingCurlyToken, closingCurlyToken);
			if (!isAllmanStyle && !(0, import_ast_utils.isTokenOnSameLine)(tokenBeforeOpeningCurly, openingCurlyToken)) context.report({
				node: openingCurlyToken,
				messageId: "nextLineOpen",
				fix: safeReplaceTextBetween(sourceCode, tokenBeforeOpeningCurly, openingCurlyToken, " ")
			});
			if (isAllmanStyle && (0, import_ast_utils.isTokenOnSameLine)(tokenBeforeOpeningCurly, openingCurlyToken) && !singleLineException) context.report({
				node: openingCurlyToken,
				messageId: "sameLineOpen",
				fix: (fixer) => fixer.insertTextBefore(openingCurlyToken, "\n")
			});
			if ((0, import_ast_utils.isTokenOnSameLine)(openingCurlyToken, tokenAfterOpeningCurly) && tokenAfterOpeningCurly !== closingCurlyToken && !singleLineException) context.report({
				node: openingCurlyToken,
				messageId: "blockSameLine",
				fix: (fixer) => fixer.insertTextAfter(openingCurlyToken, "\n")
			});
			if ((0, import_ast_utils.isTokenOnSameLine)(tokenBeforeClosingCurly, closingCurlyToken) && tokenBeforeClosingCurly !== openingCurlyToken && !singleLineException) context.report({
				node: closingCurlyToken,
				messageId: "singleLineClose",
				fix: (fixer) => fixer.insertTextBefore(closingCurlyToken, "\n")
			});
		}
		function validateCurlyBeforeKeyword(curlyToken) {
			const keywordToken = sourceCode.getTokenAfter(curlyToken);
			if (style === "1tbs" && !(0, import_ast_utils.isTokenOnSameLine)(curlyToken, keywordToken)) context.report({
				node: curlyToken,
				messageId: "nextLineClose",
				fix: safeReplaceTextBetween(sourceCode, curlyToken, keywordToken, " ")
			});
			if (style !== "1tbs" && (0, import_ast_utils.isTokenOnSameLine)(curlyToken, keywordToken)) context.report({
				node: curlyToken,
				messageId: "sameLineClose",
				fix: (fixer) => fixer.insertTextAfter(curlyToken, "\n")
			});
		}
		return {
			BlockStatement(node) {
				if (!STATEMENT_LIST_PARENTS.has(node.parent.type)) validateCurlyPair(sourceCode.getFirstToken(node), sourceCode.getLastToken(node));
			},
			StaticBlock(node) {
				validateCurlyPair(sourceCode.getFirstToken(node, { skip: 1 }), sourceCode.getLastToken(node));
			},
			ClassBody(node) {
				validateCurlyPair(sourceCode.getFirstToken(node), sourceCode.getLastToken(node));
			},
			SwitchStatement(node) {
				const closingCurly = sourceCode.getLastToken(node);
				validateCurlyPair(sourceCode.getTokenBefore(node.cases.length ? node.cases[0] : closingCurly), closingCurly);
			},
			IfStatement(node) {
				if (node.consequent.type === "BlockStatement" && node.alternate) validateCurlyBeforeKeyword(sourceCode.getLastToken(node.consequent));
			},
			TryStatement(node) {
				validateCurlyBeforeKeyword(sourceCode.getLastToken(node.block));
				if (node.handler && node.finalizer) validateCurlyBeforeKeyword(sourceCode.getLastToken(node.handler.body));
			},
			TSModuleBlock(node) {
				validateCurlyPair(sourceCode.getFirstToken(node), sourceCode.getLastToken(node));
			}
		};
	}
});
export { brace_style_default as t };
