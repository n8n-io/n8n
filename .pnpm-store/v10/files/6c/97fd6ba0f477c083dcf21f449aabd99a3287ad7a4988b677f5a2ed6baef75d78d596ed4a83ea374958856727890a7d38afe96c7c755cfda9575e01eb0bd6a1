import { d as safeReplaceTextBetween, f as createRule, g as import_ast_utils } from "../utils.js";
var implicit_arrow_linebreak_default = createRule({
	name: "implicit-arrow-linebreak",
	meta: {
		type: "layout",
		docs: { description: "Enforce the location of arrow function bodies" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: ["beside", "below"]
		}],
		defaultOptions: ["beside"],
		messages: {
			expected: "Expected a linebreak before this expression.",
			unexpected: "Expected no linebreak before this expression."
		}
	},
	create(context, [option]) {
		const sourceCode = context.sourceCode;
		function validateExpression(node) {
			if (node.body.type === "BlockStatement") return;
			const arrowToken = sourceCode.getTokenBefore(node.body, import_ast_utils.isNotOpeningParenToken);
			const firstTokenOfBody = sourceCode.getTokenAfter(arrowToken);
			const onSameLine = (0, import_ast_utils.isTokenOnSameLine)(arrowToken, firstTokenOfBody);
			if (onSameLine && option === "below") context.report({
				node: firstTokenOfBody,
				messageId: "expected",
				fix: (fixer) => fixer.insertTextBefore(firstTokenOfBody, "\n")
			});
			else if (!onSameLine && option === "beside") context.report({
				node: firstTokenOfBody,
				messageId: "unexpected",
				fix: safeReplaceTextBetween(sourceCode, arrowToken, firstTokenOfBody, " ")
			});
		}
		return { ArrowFunctionExpression: (node) => validateExpression(node) };
	}
});
export { implicit_arrow_linebreak_default as t };
