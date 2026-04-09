import { f as createRule } from "../utils.js";
var wrap_regex_default = createRule({
	name: "wrap-regex",
	meta: {
		type: "layout",
		docs: { description: "Require parenthesis around regex literals" },
		fixable: "code",
		schema: [],
		messages: { requireParens: "Wrap the regexp literal in parens to disambiguate the slash." }
	},
	create(context) {
		const sourceCode = context.sourceCode;
		return { Literal(node) {
			if (sourceCode.getFirstToken(node).type === "RegularExpression") {
				const beforeToken = sourceCode.getTokenBefore(node);
				const afterToken = sourceCode.getTokenAfter(node);
				const { parent } = node;
				if (parent.type === "MemberExpression" && parent.object === node && !(beforeToken && beforeToken.value === "(" && afterToken && afterToken.value === ")")) context.report({
					node,
					messageId: "requireParens",
					fix: (fixer) => fixer.replaceText(node, `(${sourceCode.getText(node)})`)
				});
			}
		} };
	}
});
export { wrap_regex_default as t };
