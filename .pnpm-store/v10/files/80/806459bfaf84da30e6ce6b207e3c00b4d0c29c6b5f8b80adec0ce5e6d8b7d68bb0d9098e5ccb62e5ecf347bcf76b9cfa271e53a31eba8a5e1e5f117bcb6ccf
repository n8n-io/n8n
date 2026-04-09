import { f as createRule } from "../utils.js";
const INLINE_ELEMENTS = new Set([
	"a",
	"abbr",
	"acronym",
	"b",
	"bdo",
	"big",
	"button",
	"cite",
	"code",
	"dfn",
	"em",
	"i",
	"img",
	"input",
	"kbd",
	"label",
	"map",
	"object",
	"q",
	"samp",
	"script",
	"select",
	"small",
	"span",
	"strong",
	"sub",
	"sup",
	"textarea",
	"tt",
	"var"
]);
var jsx_child_element_spacing_default = createRule({
	name: "jsx-child-element-spacing",
	meta: {
		type: "layout",
		docs: { description: "Enforce or disallow spaces inside of curly braces in JSX attributes and expressions" },
		schema: [],
		messages: {
			spacingAfterPrev: "Ambiguous spacing after previous element {{element}}",
			spacingBeforeNext: "Ambiguous spacing before next element {{element}}"
		}
	},
	create(context) {
		const TEXT_FOLLOWING_ELEMENT_PATTERN = /^[\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*\S/;
		const TEXT_PRECEDING_ELEMENT_PATTERN = /\S[\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*$/;
		const elementName = (node) => node.openingElement && node.openingElement.name && node.openingElement.name.type === "JSXIdentifier" && node.openingElement.name.name || "";
		const isInlineElement = (node) => node.type === "JSXElement" && INLINE_ELEMENTS.has(elementName(node));
		const handleJSX = (node) => {
			let lastChild = null;
			let child = null;
			[...node.children, null].forEach((nextChild) => {
				if ((lastChild || nextChild) && (!lastChild || isInlineElement(lastChild)) && child && (child.type === "Literal" || child.type === "JSXText") && (!nextChild || isInlineElement(nextChild)) && true) {
					if (lastChild && String(child.value).match(TEXT_FOLLOWING_ELEMENT_PATTERN)) context.report({
						messageId: "spacingAfterPrev",
						node: lastChild,
						loc: lastChild.loc.end,
						data: { element: elementName(lastChild) }
					});
					else if (nextChild && String(child.value).match(TEXT_PRECEDING_ELEMENT_PATTERN)) context.report({
						messageId: "spacingBeforeNext",
						node: nextChild,
						loc: nextChild.loc.start,
						data: { element: elementName(nextChild) }
					});
				}
				lastChild = child;
				child = nextChild;
			});
		};
		return {
			JSXElement: handleJSX,
			JSXFragment: handleJSX
		};
	}
});
export { jsx_child_element_spacing_default as t };
