import { f as createRule, g as import_ast_utils } from "../utils.js";
var computed_property_spacing_default = createRule({
	name: "computed-property-spacing",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent spacing inside computed property brackets" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: ["always", "never"]
		}, {
			type: "object",
			properties: { enforceForClassMembers: { type: "boolean" } },
			additionalProperties: false
		}],
		defaultOptions: ["never", { enforceForClassMembers: true }],
		messages: {
			unexpectedSpaceBefore: "There should be no space before '{{tokenValue}}'.",
			unexpectedSpaceAfter: "There should be no space after '{{tokenValue}}'.",
			missingSpaceBefore: "A space is required before '{{tokenValue}}'.",
			missingSpaceAfter: "A space is required after '{{tokenValue}}'."
		}
	},
	create(context, [style, options]) {
		const sourceCode = context.sourceCode;
		const propertyNameMustBeSpaced = style === "always";
		const { enforceForClassMembers } = options;
		function reportNoBeginningSpace(node, token, tokenAfter) {
			context.report({
				node,
				loc: {
					start: token.loc.end,
					end: tokenAfter.loc.start
				},
				messageId: "unexpectedSpaceAfter",
				data: { tokenValue: token.value },
				fix(fixer) {
					return fixer.removeRange([token.range[1], tokenAfter.range[0]]);
				}
			});
		}
		function reportNoEndingSpace(node, token, tokenBefore) {
			context.report({
				node,
				loc: {
					start: tokenBefore.loc.end,
					end: token.loc.start
				},
				messageId: "unexpectedSpaceBefore",
				data: { tokenValue: token.value },
				fix(fixer) {
					return fixer.removeRange([tokenBefore.range[1], token.range[0]]);
				}
			});
		}
		function reportRequiredBeginningSpace(node, token) {
			context.report({
				node,
				loc: token.loc,
				messageId: "missingSpaceAfter",
				data: { tokenValue: token.value },
				fix(fixer) {
					return fixer.insertTextAfter(token, " ");
				}
			});
		}
		function reportRequiredEndingSpace(node, token) {
			context.report({
				node,
				loc: token.loc,
				messageId: "missingSpaceBefore",
				data: { tokenValue: token.value },
				fix(fixer) {
					return fixer.insertTextBefore(token, " ");
				}
			});
		}
		function checkSpacing(propertyName) {
			return function(node) {
				if (node.type !== "TSIndexedAccessType" && !node.computed) return;
				const property = node[propertyName];
				const before = sourceCode.getTokenBefore(property, import_ast_utils.isOpeningBracketToken);
				const first = sourceCode.getTokenAfter(before, { includeComments: true });
				const after = sourceCode.getTokenAfter(property, import_ast_utils.isClosingBracketToken);
				const last = sourceCode.getTokenBefore(after, { includeComments: true });
				if ((0, import_ast_utils.isTokenOnSameLine)(before, first)) {
					if (propertyNameMustBeSpaced) {
						if (!sourceCode.isSpaceBetween(before, first) && (0, import_ast_utils.isTokenOnSameLine)(before, first)) reportRequiredBeginningSpace(node, before);
					} else if (sourceCode.isSpaceBetween(before, first)) reportNoBeginningSpace(node, before, first);
				}
				if ((0, import_ast_utils.isTokenOnSameLine)(last, after)) {
					if (propertyNameMustBeSpaced) {
						if (!sourceCode.isSpaceBetween(last, after) && (0, import_ast_utils.isTokenOnSameLine)(last, after)) reportRequiredEndingSpace(node, after);
					} else if (sourceCode.isSpaceBetween(last, after)) reportNoEndingSpace(node, after, last);
				}
			};
		}
		const listeners = {
			Property: checkSpacing("key"),
			MemberExpression: checkSpacing("property"),
			TSIndexedAccessType: checkSpacing("indexType")
		};
		if (enforceForClassMembers) {
			listeners.MethodDefinition = checkSpacing("key");
			listeners.PropertyDefinition = checkSpacing("key");
			listeners.AccessorProperty = checkSpacing("key");
		}
		return listeners;
	}
});
export { computed_property_spacing_default as t };
