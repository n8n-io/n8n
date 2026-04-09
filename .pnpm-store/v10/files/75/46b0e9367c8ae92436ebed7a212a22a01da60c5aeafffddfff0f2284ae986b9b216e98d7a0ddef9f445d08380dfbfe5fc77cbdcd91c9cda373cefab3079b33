import { f as createRule, g as import_ast_utils } from "../utils.js";
var array_bracket_spacing_default = createRule({
	name: "array-bracket-spacing",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent spacing inside array brackets" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: ["always", "never"]
		}, {
			type: "object",
			properties: {
				singleValue: { type: "boolean" },
				objectsInArrays: { type: "boolean" },
				arraysInArrays: { type: "boolean" }
			},
			additionalProperties: false
		}],
		defaultOptions: ["never"],
		messages: {
			unexpectedSpaceAfter: "There should be no space after '{{tokenValue}}'.",
			unexpectedSpaceBefore: "There should be no space before '{{tokenValue}}'.",
			missingSpaceAfter: "A space is required after '{{tokenValue}}'.",
			missingSpaceBefore: "A space is required before '{{tokenValue}}'."
		}
	},
	create(context, [style]) {
		const spaced = style === "always";
		const sourceCode = context.sourceCode;
		function isOptionSet(option) {
			return context.options[1] ? context.options[1][option] === !spaced : false;
		}
		const options = {
			spaced,
			singleElementException: isOptionSet("singleValue"),
			objectsInArraysException: isOptionSet("objectsInArrays"),
			arraysInArraysException: isOptionSet("arraysInArrays")
		};
		function reportNoBeginningSpace(node, token) {
			const nextToken = sourceCode.getTokenAfter(token);
			context.report({
				node,
				loc: {
					start: token.loc.end,
					end: nextToken.loc.start
				},
				messageId: "unexpectedSpaceAfter",
				data: { tokenValue: token.value },
				fix(fixer) {
					return fixer.removeRange([token.range[1], nextToken.range[0]]);
				}
			});
		}
		function reportNoEndingSpace(node, token) {
			const previousToken = sourceCode.getTokenBefore(token);
			context.report({
				node,
				loc: {
					start: previousToken.loc.end,
					end: token.loc.start
				},
				messageId: "unexpectedSpaceBefore",
				data: { tokenValue: token.value },
				fix(fixer) {
					return fixer.removeRange([previousToken.range[1], token.range[0]]);
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
		function isObjectType(node) {
			return node && (node.type === "ObjectExpression" || node.type === "ObjectPattern");
		}
		function isArrayType(node) {
			return node && (node.type === "ArrayExpression" || node.type === "ArrayPattern");
		}
		function validateArraySpacing(node) {
			if (options.spaced && node.elements.length === 0) return;
			const first = sourceCode.getFirstToken(node);
			const second = sourceCode.getFirstToken(node, 1);
			const last = node.type === "ArrayPattern" && node.typeAnnotation ? sourceCode.getTokenBefore(node.typeAnnotation) : sourceCode.getLastToken(node);
			const penultimate = sourceCode.getTokenBefore(last);
			const firstElement = node.elements[0];
			const lastElement = node.elements[node.elements.length - 1];
			const openingBracketMustBeSpaced = firstElement && options.objectsInArraysException && isObjectType(firstElement) || firstElement && options.arraysInArraysException && isArrayType(firstElement) || options.singleElementException && node.elements.length === 1 ? !options.spaced : options.spaced;
			const closingBracketMustBeSpaced = lastElement && options.objectsInArraysException && isObjectType(lastElement) || lastElement && options.arraysInArraysException && isArrayType(lastElement) || options.singleElementException && node.elements.length === 1 ? !options.spaced : options.spaced;
			if ((0, import_ast_utils.isTokenOnSameLine)(first, second)) {
				if (openingBracketMustBeSpaced && !sourceCode.isSpaceBetween(first, second)) reportRequiredBeginningSpace(node, first);
				if (!openingBracketMustBeSpaced && sourceCode.isSpaceBetween(first, second)) reportNoBeginningSpace(node, first);
			}
			if (first !== penultimate && (0, import_ast_utils.isTokenOnSameLine)(penultimate, last)) {
				if (closingBracketMustBeSpaced && !sourceCode.isSpaceBetween(penultimate, last)) reportRequiredEndingSpace(node, last);
				if (!closingBracketMustBeSpaced && sourceCode.isSpaceBetween(penultimate, last)) reportNoEndingSpace(node, last);
			}
		}
		return {
			ArrayPattern: validateArraySpacing,
			ArrayExpression: validateArraySpacing
		};
	}
});
export { array_bracket_spacing_default as t };
