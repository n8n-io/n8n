import { F as isDecimalIntegerNumericToken, f as createRule, g as import_ast_utils } from "../utils.js";
var dot_location_default = createRule({
	name: "dot-location",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent newlines before and after dots" },
		fixable: "code",
		schema: [{
			type: "string",
			enum: ["object", "property"]
		}],
		defaultOptions: ["object"],
		messages: {
			expectedDotAfterObject: "Expected dot to be on same line as object.",
			expectedDotBeforeProperty: "Expected dot to be on same line as property."
		}
	},
	create(context, [config]) {
		const onObject = config === "object";
		const sourceCode = context.sourceCode;
		function getProperty(node) {
			if (node.type === "TSImportType") return node.qualifier;
			if (node.type === "TSQualifiedName") return node.right;
			return node.property;
		}
		function checkDotLocation(node) {
			const property = getProperty(node);
			if (!property) return;
			const dotToken = sourceCode.getTokenBefore(property);
			if (!dotToken) return;
			if (onObject) {
				const tokenBeforeDot = sourceCode.getTokenBefore(dotToken);
				if (tokenBeforeDot && !(0, import_ast_utils.isTokenOnSameLine)(tokenBeforeDot, dotToken)) context.report({
					node,
					loc: dotToken.loc,
					messageId: "expectedDotAfterObject",
					*fix(fixer) {
						if (dotToken.value.startsWith(".") && isDecimalIntegerNumericToken(tokenBeforeDot)) yield fixer.insertTextAfter(tokenBeforeDot, ` ${dotToken.value}`);
						else yield fixer.insertTextAfter(tokenBeforeDot, dotToken.value);
						yield fixer.remove(dotToken);
					}
				});
			} else if (!(0, import_ast_utils.isTokenOnSameLine)(dotToken, property)) context.report({
				node,
				loc: dotToken.loc,
				messageId: "expectedDotBeforeProperty",
				*fix(fixer) {
					yield fixer.remove(dotToken);
					yield fixer.insertTextBefore(property, dotToken.value);
				}
			});
		}
		return {
			MemberExpression(node) {
				if (node.computed) return;
				checkDotLocation(node);
			},
			MetaProperty: checkDotLocation,
			JSXMemberExpression: checkDotLocation,
			TSQualifiedName: checkDotLocation,
			TSImportType: checkDotLocation
		};
	}
});
export { dot_location_default as t };
