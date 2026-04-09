import { f as createRule } from "../utils.js";
const PRESERVE_PREFIX_SPACE_BEFORE_GENERIC = new Set([
	"TSCallSignatureDeclaration",
	"ArrowFunctionExpression",
	"TSFunctionType",
	"TSConstructorType",
	"FunctionExpression",
	"ClassExpression"
]);
var type_generic_spacing_default = createRule({
	name: "type-generic-spacing",
	meta: {
		type: "layout",
		docs: { description: "Enforces consistent spacing inside TypeScript type generics" },
		fixable: "whitespace",
		schema: [],
		messages: { genericSpacingMismatch: "Generic spaces mismatch" }
	},
	create: (context) => {
		const sourceCode = context.sourceCode;
		function removeSpaceBetween(left, right) {
			const textBetween = sourceCode.text.slice(left.range[1], right.range[0]);
			if (/\s/.test(textBetween) && !/^[\r\n]/.test(textBetween)) context.report({
				loc: {
					start: left.loc.end,
					end: right.loc.start
				},
				messageId: "genericSpacingMismatch",
				*fix(fixer) {
					yield fixer.replaceTextRange([left.range[1], right.range[0]], "");
				}
			});
		}
		function checkBracketSpacing(openToken, closeToken) {
			if (openToken) {
				const firstToken = sourceCode.getTokenAfter(openToken);
				if (firstToken) removeSpaceBetween(openToken, firstToken);
			}
			if (closeToken) {
				const lastToken = sourceCode.getTokenBefore(closeToken);
				if (lastToken) removeSpaceBetween(lastToken, closeToken);
			}
		}
		return {
			TSTypeParameterInstantiation: (node) => {
				const params = node.params;
				if (params.length === 0) return;
				checkBracketSpacing(sourceCode.getTokenBefore(params[0]), sourceCode.getTokenAfter(params[params.length - 1]));
			},
			TSTypeParameterDeclaration: (node) => {
				if (!PRESERVE_PREFIX_SPACE_BEFORE_GENERIC.has(node.parent.type)) {
					const preSpace = sourceCode.text.slice(0, node.range[0]).match(/(\s+)$/)?.[0];
					if (preSpace && preSpace.length) context.report({
						node,
						messageId: "genericSpacingMismatch",
						*fix(fixer) {
							yield fixer.replaceTextRange([node.range[0] - preSpace.length, node.range[0]], "");
						}
					});
				}
				const params = node.params;
				if (params.length === 0) return;
				checkBracketSpacing(sourceCode.getTokenBefore(params[0]), sourceCode.getTokenAfter(params[params.length - 1]));
			},
			TSTypeParameter: (node) => {
				if (!node.default) return;
				const endNode = node.constraint || node.name;
				const from = endNode.range[1];
				const to = node.default.range[0];
				const span = sourceCode.text.slice(from, to);
				if (!span.match(/(?:^|[^ ]) = (?:$|[^ ])/)) context.report({
					*fix(fixer) {
						yield fixer.replaceTextRange([from, to], span.replace(/\s*=\s*/, " = "));
					},
					loc: {
						start: endNode.loc.end,
						end: node.default.loc.start
					},
					messageId: "genericSpacingMismatch",
					node
				});
			}
		};
	}
});
export { type_generic_spacing_default as t };
