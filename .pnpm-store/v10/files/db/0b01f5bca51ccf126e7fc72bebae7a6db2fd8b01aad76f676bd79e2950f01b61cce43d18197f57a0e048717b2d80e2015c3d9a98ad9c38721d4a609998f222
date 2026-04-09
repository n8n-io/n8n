import { Z as skipChainExpression, f as createRule, g as import_ast_utils } from "../utils.js";
var newline_per_chained_call_default = createRule({
	name: "newline-per-chained-call",
	meta: {
		type: "layout",
		docs: { description: "Require a newline after each call in a method chain" },
		fixable: "whitespace",
		schema: [{
			type: "object",
			properties: { ignoreChainWithDepth: {
				type: "integer",
				minimum: 1,
				maximum: 10
			} },
			additionalProperties: false
		}],
		defaultOptions: [{ ignoreChainWithDepth: 2 }],
		messages: { expected: "Expected line break before `{{callee}}`." }
	},
	create(context, [options]) {
		const { ignoreChainWithDepth } = options;
		const sourceCode = context.sourceCode;
		function getPrefix(node) {
			if (node.computed) {
				if (node.optional) return "?.[";
				return "[";
			}
			if (node.optional) return "?.";
			return ".";
		}
		function getPropertyText(node) {
			const prefix = getPrefix(node);
			const lines = sourceCode.getText(node.property).split(import_ast_utils.LINEBREAK_MATCHER);
			const suffix = node.computed && lines.length === 1 ? "]" : "";
			return prefix + lines[0] + suffix;
		}
		return { "CallExpression:exit": function(node) {
			const callee = skipChainExpression(node.callee);
			if (callee.type !== "MemberExpression") return;
			let parent = skipChainExpression(callee.object);
			let depth = 1;
			while (parent && "callee" in parent && parent.callee) {
				depth += 1;
				const parentCallee = skipChainExpression(parent.callee);
				if (!("object" in parentCallee)) break;
				parent = skipChainExpression(parentCallee.object);
			}
			if (depth > ignoreChainWithDepth && (0, import_ast_utils.isTokenOnSameLine)(callee.object, callee.property)) {
				const firstTokenAfterObject = sourceCode.getTokenAfter(callee.object, import_ast_utils.isNotClosingParenToken);
				context.report({
					node: callee.property,
					loc: {
						start: firstTokenAfterObject.loc.start,
						end: callee.loc.end
					},
					messageId: "expected",
					data: { callee: getPropertyText(callee) },
					fix(fixer) {
						return fixer.insertTextBefore(firstTokenAfterObject, "\n");
					}
				});
			}
		} };
	}
});
export { newline_per_chained_call_default as t };
