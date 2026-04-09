import { K as isSingleLine, f as createRule } from "../utils.js";
var jsx_newline_default = createRule({
	name: "jsx-newline",
	package: "jsx",
	meta: {
		type: "layout",
		docs: { description: "Require or prevent a new line after jsx elements and expressions." },
		fixable: "code",
		schema: [{
			type: "object",
			properties: {
				prevent: { type: "boolean" },
				allowMultilines: { type: "boolean" }
			},
			additionalProperties: false,
			if: { properties: { allowMultilines: { const: true } } },
			then: {
				properties: { prevent: { const: true } },
				required: ["prevent"]
			}
		}],
		defaultOptions: [{
			prevent: false,
			allowMultilines: false
		}],
		messages: {
			require: "JSX element should start in a new line",
			prevent: "JSX element should not start in a new line",
			allowMultilines: "Multiline JSX elements should start in a new line"
		}
	},
	create(context, [configuration]) {
		const { prevent, allowMultilines } = configuration;
		const jsxElementParents = /* @__PURE__ */ new Set();
		const sourceCode = context.sourceCode;
		function isBlockCommentInCurlyBraces(element) {
			const elementRawValue = sourceCode.getText(element);
			return /^\s*\{\/\*/.test(elementRawValue);
		}
		function isNonBlockComment(element) {
			return !isBlockCommentInCurlyBraces(element) && (element.type === "JSXElement" || element.type === "JSXExpressionContainer");
		}
		return {
			"Program:exit": function() {
				jsxElementParents.forEach((parent) => {
					parent.children.forEach((element, index, elements) => {
						if (element.type === "JSXElement" || element.type === "JSXExpressionContainer") {
							const firstAdjacentSibling = elements[index + 1];
							const secondAdjacentSibling = elements[index + 2];
							if (!(firstAdjacentSibling && secondAdjacentSibling && (firstAdjacentSibling.type === "Literal" || firstAdjacentSibling.type === "JSXText"))) return;
							const isWithoutNewLine = !/\n\s*\n/.test(firstAdjacentSibling.value);
							if (isBlockCommentInCurlyBraces(element)) return;
							const nextNonBlockComment = elements.slice(index + 2).find(isNonBlockComment);
							if (allowMultilines && (!isSingleLine(element) || nextNonBlockComment && !isSingleLine(nextNonBlockComment))) {
								if (!isWithoutNewLine) return;
								const regex = /(\n)(?!.*\1)/g;
								const replacement = "\n\n";
								context.report({
									messageId: "allowMultilines",
									node: secondAdjacentSibling,
									fix(fixer) {
										return fixer.replaceText(firstAdjacentSibling, sourceCode.getText(firstAdjacentSibling).replace(regex, replacement));
									}
								});
								return;
							}
							if (isWithoutNewLine === prevent) return;
							const messageId = prevent ? "prevent" : "require";
							const regex = prevent ? /(\n\n)(?!.*\1)/g : /(\n)(?!.*\1)/g;
							const replacement = prevent ? "\n" : "\n\n";
							context.report({
								messageId,
								node: secondAdjacentSibling,
								fix(fixer) {
									return fixer.replaceText(firstAdjacentSibling, sourceCode.getText(firstAdjacentSibling).replace(regex, replacement));
								}
							});
						}
					});
				});
			},
			":matches(JSXElement, JSXFragment) > :matches(JSXElement, JSXExpressionContainer)": (node) => {
				jsxElementParents.add(node.parent);
			}
		};
	}
});
export { jsx_newline_default as t };
