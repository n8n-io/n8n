import { getContextIdentifiers, isAutoFixerFunction, isSuggestionFixerFunction } from "../utils.js";

//#region lib/rules/prefer-replace-text.ts
const DEFAULT_FUNC_INFO = {
	upper: null,
	codePath: null,
	shouldCheck: false,
	node: null
};
const rule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "require using `replaceText()` instead of `replaceTextRange()`",
			category: "Rules",
			recommended: false,
			url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/prefer-replace-text.md"
		},
		fixable: void 0,
		schema: [],
		messages: { useReplaceText: "Use replaceText instead of replaceTextRange." }
	},
	create(context) {
		const sourceCode = context.sourceCode;
		let funcInfo = DEFAULT_FUNC_INFO;
		let contextIdentifiers;
		return {
			Program(ast) {
				contextIdentifiers = getContextIdentifiers(sourceCode.scopeManager, ast);
			},
			onCodePathStart(codePath, node) {
				funcInfo = {
					upper: funcInfo,
					codePath,
					shouldCheck: isAutoFixerFunction(node, contextIdentifiers, context) || isSuggestionFixerFunction(node, contextIdentifiers, context),
					node
				};
			},
			onCodePathEnd() {
				funcInfo = funcInfo.upper ?? DEFAULT_FUNC_INFO;
			},
			"CallExpression[arguments.length=2]"(node) {
				if (funcInfo.shouldCheck && node.callee.type === "MemberExpression" && node.callee.property.type === "Identifier" && node.callee.property.name === "replaceTextRange") {
					const arg = node.arguments[0];
					if (arg.type === "ArrayExpression" && arg.elements[0]?.type === "MemberExpression" && arg.elements[1]?.type === "MemberExpression" && sourceCode.getText(arg.elements[0].object) === sourceCode.getText(arg.elements[1].object)) context.report({
						node,
						messageId: "useReplaceText"
					});
				}
			}
		};
	}
};

//#endregion
export { rule as default };