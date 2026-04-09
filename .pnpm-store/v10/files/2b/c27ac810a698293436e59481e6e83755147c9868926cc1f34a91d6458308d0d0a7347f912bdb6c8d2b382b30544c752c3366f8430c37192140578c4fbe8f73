import { f as createRule, g as import_ast_utils, m as AST_NODE_TYPES } from "../utils.js";
var semi_spacing_default = createRule({
	name: "semi-spacing",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent spacing before and after semicolons" },
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
			before: false,
			after: true
		}],
		messages: {
			unexpectedWhitespaceBefore: "Unexpected whitespace before semicolon.",
			unexpectedWhitespaceAfter: "Unexpected whitespace after semicolon.",
			missingWhitespaceBefore: "Missing whitespace before semicolon.",
			missingWhitespaceAfter: "Missing whitespace after semicolon."
		}
	},
	create(context, [config]) {
		const { before: requireSpaceBefore, after: requireSpaceAfter } = config;
		const sourceCode = context.sourceCode;
		function hasLeadingSpace(token) {
			const tokenBefore = sourceCode.getTokenBefore(token);
			return tokenBefore && (0, import_ast_utils.isTokenOnSameLine)(tokenBefore, token) && sourceCode.isSpaceBetween(tokenBefore, token);
		}
		function hasTrailingSpace(token) {
			const tokenAfter = sourceCode.getTokenAfter(token);
			return tokenAfter && (0, import_ast_utils.isTokenOnSameLine)(token, tokenAfter) && sourceCode.isSpaceBetween(token, tokenAfter);
		}
		function isLastTokenInCurrentLine(token) {
			const tokenAfter = sourceCode.getTokenAfter(token);
			return !(tokenAfter && (0, import_ast_utils.isTokenOnSameLine)(token, tokenAfter));
		}
		function isFirstTokenInCurrentLine(token) {
			const tokenBefore = sourceCode.getTokenBefore(token);
			return !(tokenBefore && (0, import_ast_utils.isTokenOnSameLine)(token, tokenBefore));
		}
		function isBeforeClosingParen(token) {
			const nextToken = sourceCode.getTokenAfter(token);
			return nextToken && (0, import_ast_utils.isClosingBraceToken)(nextToken) || (0, import_ast_utils.isClosingParenToken)(nextToken);
		}
		function checkSemicolonSpacing(token, node) {
			if ((0, import_ast_utils.isSemicolonToken)(token)) {
				if (hasLeadingSpace(token)) {
					if (!requireSpaceBefore) {
						const tokenBefore = sourceCode.getTokenBefore(token);
						const loc = {
							start: tokenBefore.loc.end,
							end: token.loc.start
						};
						context.report({
							node,
							loc,
							messageId: "unexpectedWhitespaceBefore",
							fix(fixer) {
								return fixer.removeRange([tokenBefore.range[1], token.range[0]]);
							}
						});
					}
				} else if (requireSpaceBefore) {
					const loc = token.loc;
					context.report({
						node,
						loc,
						messageId: "missingWhitespaceBefore",
						fix(fixer) {
							return fixer.insertTextBefore(token, " ");
						}
					});
				}
				if (!isFirstTokenInCurrentLine(token) && !isLastTokenInCurrentLine(token) && !isBeforeClosingParen(token)) {
					if (hasTrailingSpace(token)) {
						if (!requireSpaceAfter) {
							const tokenAfter = sourceCode.getTokenAfter(token);
							const loc = {
								start: token.loc.end,
								end: tokenAfter.loc.start
							};
							context.report({
								node,
								loc,
								messageId: "unexpectedWhitespaceAfter",
								fix(fixer) {
									return fixer.removeRange([token.range[1], tokenAfter.range[0]]);
								}
							});
						}
					} else if (requireSpaceAfter) {
						const loc = token.loc;
						context.report({
							node,
							loc,
							messageId: "missingWhitespaceAfter",
							fix(fixer) {
								return fixer.insertTextAfter(token, " ");
							}
						});
					}
				}
			}
		}
		function checkNode(node) {
			checkSemicolonSpacing(sourceCode.getLastToken(node), node);
		}
		return {
			VariableDeclaration: checkNode,
			ExpressionStatement: checkNode,
			BreakStatement: checkNode,
			ContinueStatement: checkNode,
			DebuggerStatement: checkNode,
			DoWhileStatement: checkNode,
			ReturnStatement: checkNode,
			ThrowStatement: checkNode,
			ImportDeclaration: checkNode,
			ExportNamedDeclaration: checkNode,
			ExportAllDeclaration: checkNode,
			ExportDefaultDeclaration: checkNode,
			ForStatement(node) {
				if (node.init) checkSemicolonSpacing(sourceCode.getTokenAfter(node.init), node);
				if (node.test) checkSemicolonSpacing(sourceCode.getTokenAfter(node.test), node);
			},
			PropertyDefinition: checkNode,
			AccessorProperty: checkNode,
			TSDeclareFunction: checkNode,
			TSTypeAliasDeclaration: checkNode,
			TSTypeAnnotation(node) {
				const excludeNodeTypes = new Set([AST_NODE_TYPES.TSDeclareFunction]);
				if (node.parent && !excludeNodeTypes.has(node.parent.type)) checkNode(node.parent);
			}
		};
	}
});
export { semi_spacing_default as t };
