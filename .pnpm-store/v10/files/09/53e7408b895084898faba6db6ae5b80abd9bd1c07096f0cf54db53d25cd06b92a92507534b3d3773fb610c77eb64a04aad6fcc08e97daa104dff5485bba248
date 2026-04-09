import { f as createRule, g as import_ast_utils, m as AST_NODE_TYPES } from "../utils.js";
var space_before_function_paren_default = createRule({
	name: "space-before-function-paren",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent spacing before function parenthesis" },
		fixable: "whitespace",
		schema: [{ oneOf: [{
			type: "string",
			enum: ["always", "never"]
		}, {
			type: "object",
			properties: {
				anonymous: {
					type: "string",
					enum: [
						"always",
						"never",
						"ignore"
					]
				},
				named: {
					type: "string",
					enum: [
						"always",
						"never",
						"ignore"
					]
				},
				asyncArrow: {
					type: "string",
					enum: [
						"always",
						"never",
						"ignore"
					]
				},
				catch: {
					type: "string",
					enum: [
						"always",
						"never",
						"ignore"
					]
				}
			},
			additionalProperties: false
		}] }],
		defaultOptions: ["always"],
		messages: {
			unexpectedSpace: "Unexpected space before function parentheses.",
			missingSpace: "Missing space before function parentheses."
		}
	},
	create(context, [options]) {
		const sourceCode = context.sourceCode;
		const { asyncArrow = "always", anonymous = "always", named = "always", catch: catchOption = "always" } = typeof options === "string" ? {
			asyncArrow: options,
			anonymous: options,
			named: options,
			catch: options
		} : options;
		function isNamedFunction(node) {
			if (node.id != null) return true;
			const parent = node.parent;
			return parent.type === AST_NODE_TYPES.MethodDefinition || parent.type === AST_NODE_TYPES.TSAbstractMethodDefinition || parent.type === AST_NODE_TYPES.Property && (parent.kind === "get" || parent.kind === "set" || parent.method);
		}
		function getConfigForFunction(node) {
			if (node.type === AST_NODE_TYPES.ArrowFunctionExpression) {
				if (node.async && (0, import_ast_utils.isOpeningParenToken)(sourceCode.getFirstToken(node, { skip: 1 }))) return asyncArrow;
			} else if (isNamedFunction(node)) return named;
			else if (!node.generator) return anonymous;
			return "ignore";
		}
		function checkFunction(node) {
			const functionConfig = getConfigForFunction(node);
			if (functionConfig === "ignore") return;
			if (functionConfig === "always" && node.typeParameters && !node.id) return;
			let leftToken;
			let rightToken;
			if (node.typeParameters) {
				leftToken = sourceCode.getLastToken(node.typeParameters);
				rightToken = sourceCode.getTokenAfter(leftToken);
			} else {
				rightToken = sourceCode.getFirstToken(node, import_ast_utils.isOpeningParenToken);
				leftToken = sourceCode.getTokenBefore(rightToken);
			}
			checkSpace(node, leftToken, rightToken, functionConfig);
		}
		function checkSpace(node, leftToken, rightToken, option) {
			const hasSpacing = sourceCode.isSpaceBetween(leftToken, rightToken);
			if (hasSpacing && option === "never") context.report({
				node,
				loc: {
					start: leftToken.loc.end,
					end: rightToken.loc.start
				},
				messageId: "unexpectedSpace",
				fix: (fixer) => {
					const comments = sourceCode.getCommentsBefore(rightToken);
					if (comments.some((comment) => comment.type === "Line")) return null;
					return fixer.replaceTextRange([leftToken.range[1], rightToken.range[0]], comments.reduce((text, comment) => text + sourceCode.getText(comment), ""));
				}
			});
			else if (!hasSpacing && option === "always") context.report({
				node,
				loc: rightToken.loc,
				messageId: "missingSpace",
				fix: (fixer) => fixer.insertTextAfter(leftToken, " ")
			});
		}
		return {
			ArrowFunctionExpression: checkFunction,
			FunctionDeclaration: checkFunction,
			FunctionExpression: checkFunction,
			TSEmptyBodyFunctionExpression: checkFunction,
			TSDeclareFunction: checkFunction,
			CatchClause(node) {
				if (!node.param) return;
				const option = catchOption;
				if (catchOption === "ignore") return;
				const rightToken = sourceCode.getFirstToken(node, import_ast_utils.isOpeningParenToken);
				checkSpace(node, sourceCode.getTokenBefore(rightToken), rightToken, option);
			}
		};
	}
});
export { space_before_function_paren_default as t };
