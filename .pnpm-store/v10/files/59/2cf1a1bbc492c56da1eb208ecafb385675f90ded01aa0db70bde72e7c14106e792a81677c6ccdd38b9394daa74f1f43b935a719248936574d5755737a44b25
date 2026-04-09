import { U as isParenthesised, f as createRule } from "../utils.js";
function isConditional(node) {
	return node.type === "ConditionalExpression";
}
var no_confusing_arrow_default = createRule({
	name: "no-confusing-arrow",
	meta: {
		type: "layout",
		docs: { description: "Disallow arrow functions where they could be confused with comparisons" },
		fixable: "code",
		schema: [{
			type: "object",
			properties: {
				allowParens: { type: "boolean" },
				onlyOneSimpleParam: { type: "boolean" }
			},
			additionalProperties: false
		}],
		defaultOptions: [{
			allowParens: true,
			onlyOneSimpleParam: false
		}],
		messages: { confusing: "Arrow function used ambiguously with a conditional expression." }
	},
	create(context, [options]) {
		const { allowParens, onlyOneSimpleParam } = options;
		const sourceCode = context.sourceCode;
		function checkArrowFunc(node) {
			const body = node.body;
			if (isConditional(body) && !(allowParens && isParenthesised(sourceCode, body)) && !(onlyOneSimpleParam && !(node.params.length === 1 && node.params[0].type === "Identifier"))) context.report({
				node,
				messageId: "confusing",
				fix(fixer) {
					return allowParens ? fixer.replaceText(node.body, `(${sourceCode.getText(node.body)})`) : null;
				}
			});
		}
		return { ArrowFunctionExpression: checkArrowFunc };
	}
});
export { no_confusing_arrow_default as t };
