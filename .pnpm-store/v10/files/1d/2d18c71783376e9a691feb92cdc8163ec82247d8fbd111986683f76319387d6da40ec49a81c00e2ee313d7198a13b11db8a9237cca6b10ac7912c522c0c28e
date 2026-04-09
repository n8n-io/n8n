import { f as createRule } from "../utils.js";
var yield_star_spacing_default = createRule({
	name: "yield-star-spacing",
	meta: {
		type: "layout",
		docs: { description: "Require or disallow spacing around the `*` in `yield*` expressions" },
		fixable: "whitespace",
		schema: [{ oneOf: [{
			type: "string",
			enum: [
				"before",
				"after",
				"both",
				"neither"
			]
		}, {
			type: "object",
			properties: {
				before: { type: "boolean" },
				after: { type: "boolean" }
			},
			additionalProperties: false
		}] }],
		defaultOptions: ["after"],
		messages: {
			missingBefore: "Missing space before *.",
			missingAfter: "Missing space after *.",
			unexpectedBefore: "Unexpected space before *.",
			unexpectedAfter: "Unexpected space after *."
		}
	},
	create(context, [options]) {
		const sourceCode = context.sourceCode;
		const mode = (() => {
			if (typeof options === "string") return {
				before: {
					before: true,
					after: false
				},
				after: {
					before: false,
					after: true
				},
				both: {
					before: true,
					after: true
				},
				neither: {
					before: false,
					after: false
				}
			}[options];
			return options;
		})();
		function checkSpacing(side, leftToken, rightToken) {
			if (sourceCode.isSpaceBetween(leftToken, rightToken) !== mode[side]) {
				const after = leftToken.value === "*";
				const spaceRequired = mode[side];
				const node = after ? leftToken : rightToken;
				const messageId = spaceRequired ? side === "before" ? "missingBefore" : "missingAfter" : side === "before" ? "unexpectedBefore" : "unexpectedAfter";
				context.report({
					node,
					messageId,
					fix(fixer) {
						if (spaceRequired) {
							if (after) return fixer.insertTextAfter(node, " ");
							return fixer.insertTextBefore(node, " ");
						}
						return fixer.removeRange([leftToken.range[1], rightToken.range[0]]);
					}
				});
			}
		}
		function checkExpression(node) {
			if (!("delegate" in node && node.delegate)) return;
			const tokens = sourceCode.getFirstTokens(node, 3);
			const yieldToken = tokens[0];
			const starToken = tokens[1];
			const nextToken = tokens[2];
			checkSpacing("before", yieldToken, starToken);
			checkSpacing("after", starToken, nextToken);
		}
		return { YieldExpression: checkExpression };
	}
});
export { yield_star_spacing_default as t };
