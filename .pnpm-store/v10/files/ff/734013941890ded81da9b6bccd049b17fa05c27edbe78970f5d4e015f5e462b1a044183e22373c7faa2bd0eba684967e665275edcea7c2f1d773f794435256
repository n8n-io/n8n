import { f as createRule, w as canTokensBeAdjacent } from "../utils.js";
var no_floating_decimal_default = createRule({
	name: "no-floating-decimal",
	meta: {
		type: "layout",
		docs: { description: "Disallow leading or trailing decimal points in numeric literals" },
		fixable: "code",
		schema: [],
		messages: {
			leading: "A leading decimal point can be confused with a dot.",
			trailing: "A trailing decimal point can be confused with a dot."
		}
	},
	create(context) {
		const sourceCode = context.sourceCode;
		return { Literal(node) {
			if (typeof node.value === "number") {
				if (node.raw.startsWith(".")) context.report({
					node,
					messageId: "leading",
					fix(fixer) {
						const tokenBefore = sourceCode.getTokenBefore(node);
						const needsSpaceBefore = tokenBefore && tokenBefore.range[1] === node.range[0] && !canTokensBeAdjacent(tokenBefore, `0${node.raw}`);
						return fixer.insertTextBefore(node, needsSpaceBefore ? " 0" : "0");
					}
				});
				if (node.raw.indexOf(".") === node.raw.length - 1) context.report({
					node,
					messageId: "trailing",
					fix: (fixer) => fixer.insertTextAfter(node, "0")
				});
			}
		} };
	}
});
export { no_floating_decimal_default as t };
