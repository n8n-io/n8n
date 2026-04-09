import { K as isSingleLine, f as createRule, g as import_ast_utils, o as isJSX } from "../utils.js";
function endWithComma(context, node) {
	const nextToken = context.sourceCode.getTokenAfter(node);
	return !!nextToken && nextToken.value === "," && nextToken.range[0] >= node.range[1];
}
var jsx_function_call_newline_default = createRule({
	name: "jsx-function-call-newline",
	meta: {
		type: "layout",
		docs: { description: "Enforce line breaks before and after JSX elements when they are used as arguments to a function." },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: ["always", "multiline"]
		}],
		defaultOptions: ["multiline"],
		messages: { missingLineBreak: "Missing line break around JSX" }
	},
	create(context, [option]) {
		function needsOpeningNewLine(node) {
			if ((0, import_ast_utils.isTokenOnSameLine)(context.sourceCode.getTokenBefore(node), node)) return true;
			return false;
		}
		function needsClosingNewLine(node) {
			const nextToken = context.sourceCode.getTokenAfter(node);
			if (endWithComma(context, node)) return false;
			if (node.loc.end.line === nextToken.loc.end.line) return true;
			return false;
		}
		function check(node) {
			if (!node || !isJSX(node)) return;
			const sourceCode = context.sourceCode;
			if (option === "always" || !isSingleLine(node)) {
				const needsOpening = needsOpeningNewLine(node);
				const needsClosing = needsClosingNewLine(node);
				if (needsOpening || needsClosing) context.report({
					node,
					messageId: "missingLineBreak",
					fix: (fixer) => {
						let fixed = sourceCode.getText(node);
						if (needsOpening) fixed = `\n${fixed}`;
						if (needsClosing) fixed = `${fixed}\n`;
						return fixer.replaceText(node, fixed);
					}
				});
			}
		}
		function handleCallExpression(node) {
			if (node.arguments.length === 0) return;
			node.arguments.forEach(check);
		}
		return {
			CallExpression(node) {
				handleCallExpression(node);
			},
			NewExpression(node) {
				handleCallExpression(node);
			}
		};
	}
});
export { jsx_function_call_newline_default as t };
