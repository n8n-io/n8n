import { K as isSingleLine, d as safeReplaceTextBetween, f as createRule, g as import_ast_utils } from "../utils.js";
var jsx_curly_newline_default = createRule({
	name: "jsx-curly-newline",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent linebreaks in curly braces in JSX attributes and expressions" },
		fixable: "whitespace",
		schema: [{ anyOf: [{
			type: "string",
			enum: ["consistent", "never"]
		}, {
			type: "object",
			properties: {
				singleline: {
					type: "string",
					enum: [
						"consistent",
						"require",
						"forbid"
					]
				},
				multiline: {
					type: "string",
					enum: [
						"consistent",
						"require",
						"forbid"
					]
				}
			},
			additionalProperties: false
		}] }],
		defaultOptions: ["consistent"],
		messages: {
			expectedBefore: "Expected newline before '}'.",
			expectedAfter: "Expected newline after '{'.",
			unexpectedBefore: "Unexpected newline before '}'.",
			unexpectedAfter: "Unexpected newline after '{'."
		}
	},
	create(context, [options]) {
		const sourceCode = context.sourceCode;
		const { multiline = "consistent", singleline = "consistent" } = options === "never" ? {
			multiline: "forbid",
			singleline: "forbid"
		} : typeof options === "string" ? {
			multiline: options,
			singleline: options
		} : options;
		function shouldHaveNewlines(expression, hasLeftNewline) {
			switch (!isSingleLine(expression) ? multiline : singleline) {
				case "forbid": return false;
				case "require": return true;
				default: return hasLeftNewline;
			}
		}
		function validateCurlys(curlys, expression) {
			const leftCurly = curlys.leftCurly;
			const rightCurly = curlys.rightCurly;
			const tokenAfterLeftCurly = sourceCode.getTokenAfter(leftCurly);
			const tokenBeforeRightCurly = sourceCode.getTokenBefore(rightCurly);
			const hasLeftNewline = !(0, import_ast_utils.isTokenOnSameLine)(leftCurly, tokenAfterLeftCurly);
			const hasRightNewline = !(0, import_ast_utils.isTokenOnSameLine)(tokenBeforeRightCurly, rightCurly);
			const needsNewlines = shouldHaveNewlines(expression, hasLeftNewline);
			if (hasLeftNewline && !needsNewlines) context.report({
				node: leftCurly,
				messageId: "unexpectedAfter",
				fix: safeReplaceTextBetween(sourceCode, leftCurly, tokenAfterLeftCurly, "")
			});
			else if (!hasLeftNewline && needsNewlines) context.report({
				node: leftCurly,
				messageId: "expectedAfter",
				fix: (fixer) => fixer.insertTextAfter(leftCurly, "\n")
			});
			if (hasRightNewline && !needsNewlines) context.report({
				node: rightCurly,
				messageId: "unexpectedBefore",
				fix: safeReplaceTextBetween(sourceCode, tokenBeforeRightCurly, rightCurly, "")
			});
			else if (!hasRightNewline && needsNewlines) context.report({
				node: rightCurly,
				messageId: "expectedBefore",
				fix: (fixer) => fixer.insertTextBefore(rightCurly, "\n")
			});
		}
		return { JSXExpressionContainer(node) {
			validateCurlys({
				leftCurly: sourceCode.getFirstToken(node),
				rightCurly: sourceCode.getLastToken(node)
			}, node.expression);
		} };
	}
});
export { jsx_curly_newline_default as t };
