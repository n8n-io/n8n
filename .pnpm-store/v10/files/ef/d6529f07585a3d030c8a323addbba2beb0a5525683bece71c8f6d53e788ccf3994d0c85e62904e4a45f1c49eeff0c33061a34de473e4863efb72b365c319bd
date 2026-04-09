import { getRuleInfo } from "../utils.js";

//#region lib/rules/prefer-object-rule.ts
const rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "disallow function-style rules",
			category: "Rules",
			recommended: true,
			url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/prefer-object-rule.md"
		},
		fixable: "code",
		schema: [],
		messages: { preferObject: "Rules should be declared using the object style." }
	},
	create(context) {
		const sourceCode = context.sourceCode;
		const ruleInfo = getRuleInfo(sourceCode);
		if (!ruleInfo) return {};
		return { Program() {
			if (ruleInfo.isNewStyle) return;
			context.report({
				node: ruleInfo.create,
				messageId: "preferObject",
				*fix(fixer) {
					if (ruleInfo.create.type === "FunctionExpression" || ruleInfo.create.type === "FunctionDeclaration") {
						const openParenToken = sourceCode.getFirstToken(ruleInfo.create, (token) => token.type === "Punctuator" && token.value === "(");
						/* istanbul ignore if */
						if (!openParenToken || !ruleInfo.create.range) return null;
						yield fixer.replaceTextRange([ruleInfo.create.range[0], openParenToken.range[0]], "{create");
						yield fixer.insertTextAfter(ruleInfo.create, "}");
					} else if (ruleInfo.create.type === "ArrowFunctionExpression") {
						yield fixer.insertTextBefore(ruleInfo.create, "{create: ");
						yield fixer.insertTextAfter(ruleInfo.create, "}");
					}
				}
			});
		} };
	}
};

//#endregion
export { rule as default };