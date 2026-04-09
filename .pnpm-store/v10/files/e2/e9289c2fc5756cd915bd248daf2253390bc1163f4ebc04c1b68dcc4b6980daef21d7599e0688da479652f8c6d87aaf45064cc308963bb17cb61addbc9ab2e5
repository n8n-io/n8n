import { f as createRule, g as import_ast_utils } from "../utils.js";
var function_call_argument_newline_default = createRule({
	name: "function-call-argument-newline",
	meta: {
		type: "layout",
		docs: { description: "Enforce line breaks between arguments of a function call" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: [
				"always",
				"never",
				"consistent"
			]
		}],
		defaultOptions: ["always"],
		messages: {
			unexpectedLineBreak: "There should be no line break here.",
			missingLineBreak: "There should be a line break after this argument."
		}
	},
	create(context, [option]) {
		const sourceCode = context.sourceCode;
		const checkers = {
			unexpected: {
				messageId: "unexpectedLineBreak",
				check: (prevToken, currentToken) => !(0, import_ast_utils.isTokenOnSameLine)(prevToken, currentToken),
				createFix: (token, tokenBefore) => (fixer) => fixer.replaceTextRange([tokenBefore.range[1], token.range[0]], " ")
			},
			missing: {
				messageId: "missingLineBreak",
				check: (prevToken, currentToken) => (0, import_ast_utils.isTokenOnSameLine)(prevToken, currentToken),
				createFix: (token, tokenBefore) => (fixer) => fixer.replaceTextRange([tokenBefore.range[1], token.range[0]], "\n")
			}
		};
		function checkArguments(argumentNodes, checker) {
			for (let i = 1; i < argumentNodes.length; i++) {
				const argumentNode = argumentNodes[i - 1];
				const prevArgToken = sourceCode.getLastToken(argumentNode);
				const currentArgToken = sourceCode.getFirstToken(argumentNodes[i]);
				if (checker.check(prevArgToken, currentArgToken)) {
					const tokenBefore = sourceCode.getTokenBefore(currentArgToken, { includeComments: true });
					const hasLineCommentBefore = tokenBefore.type === "Line";
					context.report({
						node: argumentNodes[i - 1],
						loc: {
							start: tokenBefore.loc.end,
							end: currentArgToken.loc.start
						},
						messageId: checker.messageId,
						fix: hasLineCommentBefore ? null : checker.createFix(currentArgToken, tokenBefore)
					});
				}
			}
		}
		function check(argumentNodes) {
			if (argumentNodes.length < 2) return;
			if (option === "never") checkArguments(argumentNodes, checkers.unexpected);
			else if (option === "always") checkArguments(argumentNodes, checkers.missing);
			else if (option === "consistent") if ((0, import_ast_utils.isTokenOnSameLine)(sourceCode.getLastToken(argumentNodes[0]), sourceCode.getFirstToken(argumentNodes[1]))) checkArguments(argumentNodes, checkers.unexpected);
			else checkArguments(argumentNodes, checkers.missing);
		}
		return {
			CallExpression: (node) => check(node.arguments),
			NewExpression: (node) => check(node.arguments),
			ImportExpression: (node) => {
				if (node.options) check([node.source, node.options]);
			}
		};
	}
});
export { function_call_argument_newline_default as t };
