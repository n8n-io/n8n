import { P as isDecimalInteger, d as safeReplaceTextBetween, f as createRule, g as import_ast_utils } from "../utils.js";
var no_whitespace_before_property_default = createRule({
	name: "no-whitespace-before-property",
	meta: {
		type: "layout",
		docs: { description: "Disallow whitespace before properties" },
		fixable: "whitespace",
		schema: [],
		messages: { unexpectedWhitespace: "Unexpected whitespace before property {{propName}}." }
	},
	create(context) {
		const sourceCode = context.sourceCode;
		function reportError(descriptor) {
			const { node, leftToken, rightToken, propName, replacementText = "", preventAutoFix } = descriptor;
			context.report({
				node,
				messageId: "unexpectedWhitespace",
				data: { propName },
				fix: preventAutoFix?.() ? null : safeReplaceTextBetween(sourceCode, leftToken, rightToken, replacementText)
			});
		}
		return {
			MemberExpression(node) {
				if (!(0, import_ast_utils.isTokenOnSameLine)(node.object, node.property)) return;
				let rightToken;
				let leftToken;
				if (node.computed) {
					rightToken = sourceCode.getTokenBefore(node.property, import_ast_utils.isOpeningBracketToken);
					leftToken = sourceCode.getTokenBefore(rightToken, node.optional ? 1 : 0);
				} else {
					rightToken = sourceCode.getFirstToken(node.property);
					leftToken = sourceCode.getTokenBefore(rightToken, 1);
				}
				if (!sourceCode.isSpaceBetween(leftToken, rightToken)) return;
				let replacementText = "";
				if (node.optional) replacementText = "?.";
				else if (!node.computed) replacementText = ".";
				reportError({
					node,
					leftToken,
					rightToken,
					propName: sourceCode.getText(node.property),
					replacementText,
					preventAutoFix: () => !node.computed && !node.optional && isDecimalInteger(node.object)
				});
			},
			TSIndexedAccessType(node) {
				const rightToken = sourceCode.getTokenBefore(node.indexType, import_ast_utils.isOpeningBracketToken);
				const leftToken = sourceCode.getTokenBefore(rightToken);
				if (!sourceCode.isSpaceBetween(leftToken, rightToken)) return;
				reportError({
					node,
					leftToken,
					rightToken,
					propName: sourceCode.getText(node.indexType)
				});
			},
			TSQualifiedName(node) {
				const leftToken = node.left;
				const rightToken = node.right;
				if (!sourceCode.isSpaceBetween(leftToken, rightToken)) return;
				reportError({
					node,
					leftToken,
					rightToken,
					replacementText: ".",
					propName: sourceCode.getText(node.right)
				});
			},
			TSImportType(node) {
				if (!node.qualifier) return;
				const rightToken = node.qualifier;
				const leftToken = sourceCode.getTokenBefore(rightToken, 1);
				if (!sourceCode.isSpaceBetween(leftToken, rightToken)) return;
				reportError({
					node,
					leftToken,
					rightToken,
					replacementText: ".",
					propName: sourceCode.getText(node.qualifier)
				});
			}
		};
	}
});
export { no_whitespace_before_property_default as t };
