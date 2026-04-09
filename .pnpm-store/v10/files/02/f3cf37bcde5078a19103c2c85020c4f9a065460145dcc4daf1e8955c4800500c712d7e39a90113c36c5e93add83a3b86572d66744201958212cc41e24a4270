import { f as createRule, g as import_ast_utils, h as AST_TOKEN_TYPES } from "../utils.js";
var block_spacing_default = createRule({
	name: "block-spacing",
	meta: {
		type: "layout",
		docs: { description: "Disallow or enforce spaces inside of blocks after opening block and before closing block" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: ["always", "never"]
		}],
		defaultOptions: ["always"],
		messages: {
			missing: "Requires a space {{location}} '{{token}}'.",
			extra: "Unexpected space(s) {{location}} '{{token}}'."
		}
	},
	create(context, [whenToApplyOption]) {
		const sourceCode = context.sourceCode;
		const always = whenToApplyOption !== "never";
		const messageId = always ? "missing" : "extra";
		function getOpenBrace(node) {
			return sourceCode.getFirstToken(node, { filter: (token) => (0, import_ast_utils.isOpeningBraceToken)(token) });
		}
		function isValid(left, right) {
			return !(0, import_ast_utils.isTokenOnSameLine)(left, right) || sourceCode.isSpaceBetween(left, right) === always;
		}
		function checkSpacingInsideBraces(node) {
			const openBrace = getOpenBrace(node);
			const closeBrace = sourceCode.getLastToken(node);
			const firstToken = sourceCode.getTokenAfter(openBrace, { includeComments: true });
			const lastToken = sourceCode.getTokenBefore(closeBrace, { includeComments: true });
			if (!(0, import_ast_utils.isOpeningBraceToken)(openBrace) || !(0, import_ast_utils.isClosingBraceToken)(closeBrace) || firstToken === closeBrace) return;
			if (!always && firstToken.type === AST_TOKEN_TYPES.Line) return;
			if (!isValid(openBrace, firstToken)) {
				let loc = openBrace.loc;
				if (messageId === "extra") loc = {
					start: openBrace.loc.end,
					end: firstToken.loc.start
				};
				context.report({
					node,
					loc,
					messageId,
					data: {
						location: "after",
						token: openBrace.value
					},
					fix(fixer) {
						if (always) return fixer.insertTextBefore(firstToken, " ");
						return fixer.removeRange([openBrace.range[1], firstToken.range[0]]);
					}
				});
			}
			if (!isValid(lastToken, closeBrace)) {
				let loc = closeBrace.loc;
				if (messageId === "extra") loc = {
					start: lastToken.loc.end,
					end: closeBrace.loc.start
				};
				context.report({
					node,
					loc,
					messageId,
					data: {
						location: "before",
						token: closeBrace.value
					},
					fix(fixer) {
						if (always) return fixer.insertTextAfter(lastToken, " ");
						return fixer.removeRange([lastToken.range[1], closeBrace.range[0]]);
					}
				});
			}
		}
		return {
			BlockStatement: checkSpacingInsideBraces,
			StaticBlock: checkSpacingInsideBraces,
			SwitchStatement: checkSpacingInsideBraces
		};
	}
});
export { block_spacing_default as t };
