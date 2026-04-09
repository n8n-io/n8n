import { f as createRule, g as import_ast_utils } from "../utils.js";
var arrow_spacing_default = createRule({
	name: "arrow-spacing",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent spacing before and after the arrow in arrow functions" },
		fixable: "whitespace",
		schema: [{
			type: "object",
			properties: {
				before: { type: "boolean" },
				after: { type: "boolean" }
			},
			additionalProperties: false
		}],
		defaultOptions: [{
			before: true,
			after: true
		}],
		messages: {
			expectedBefore: "Missing space before =>.",
			unexpectedBefore: "Unexpected space before =>.",
			expectedAfter: "Missing space after =>.",
			unexpectedAfter: "Unexpected space after =>."
		}
	},
	create(context, [option]) {
		const sourceCode = context.sourceCode;
		function getArrow(node) {
			if (node.type === "ArrowFunctionExpression") return sourceCode.getTokenBefore(node.body, import_ast_utils.isArrowToken);
			else return sourceCode.getFirstToken(node.returnType, import_ast_utils.isArrowToken);
		}
		function spaces(node) {
			const arrowToken = getArrow(node);
			const beforeToken = sourceCode.getTokenBefore(arrowToken, { includeComments: true });
			const isSpacedBefore = sourceCode.isSpaceBetween(beforeToken, arrowToken);
			if (option.before) {
				if (!isSpacedBefore) context.report({
					node: beforeToken,
					messageId: "expectedBefore",
					fix(fixer) {
						return fixer.insertTextBefore(arrowToken, " ");
					}
				});
			} else if (isSpacedBefore) context.report({
				node: beforeToken,
				messageId: "unexpectedBefore",
				fix(fixer) {
					return fixer.removeRange([beforeToken.range[1], arrowToken.range[0]]);
				}
			});
			const afterToken = sourceCode.getTokenAfter(arrowToken, { includeComments: true });
			const isSpacedAfter = sourceCode.isSpaceBetween(arrowToken, afterToken);
			if (option.after) {
				if (!isSpacedAfter) context.report({
					node: afterToken,
					messageId: "expectedAfter",
					fix(fixer) {
						return fixer.insertTextAfter(arrowToken, " ");
					}
				});
			} else if (isSpacedAfter) context.report({
				node: afterToken,
				messageId: "unexpectedAfter",
				fix(fixer) {
					return fixer.removeRange([arrowToken.range[1], afterToken.range[0]]);
				}
			});
		}
		return {
			ArrowFunctionExpression: spaces,
			TSFunctionType: spaces,
			TSConstructorType: spaces
		};
	}
});
export { arrow_spacing_default as t };
