import { f as createRule, g as import_ast_utils } from "../utils.js";
var one_var_declaration_per_line_default = createRule({
	name: "one-var-declaration-per-line",
	meta: {
		type: "layout",
		docs: { description: "Require or disallow newlines around variable declarations" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: ["always", "initializations"]
		}],
		defaultOptions: ["initializations"],
		messages: { expectVarOnNewline: "Expected variable declaration to be on a new line." }
	},
	create(context, [style]) {
		const { sourceCode } = context;
		const always = style === "always";
		function isForTypeSpecifier(keyword) {
			return keyword === "ForStatement" || keyword === "ForInStatement" || keyword === "ForOfStatement";
		}
		function checkForNewLine(node) {
			if (isForTypeSpecifier(node.parent.type)) return;
			const declarations = node.declarations;
			for (let i = 1; i < declarations.length; i++) {
				const prev = declarations[i - 1];
				const current = declarations[i];
				if ((0, import_ast_utils.isTokenOnSameLine)(prev, current)) {
					if (always || prev.init || current.init) context.report({
						node,
						messageId: "expectVarOnNewline",
						loc: current.loc,
						fix: (fixer) => {
							const tokenBefore = sourceCode.getTokenBefore(current);
							return fixer.insertTextAfterRange([tokenBefore.range[1], current.range[0]], "\n");
						}
					});
				}
			}
		}
		return { VariableDeclaration: checkForNewLine };
	}
});
export { one_var_declaration_per_line_default as t };
