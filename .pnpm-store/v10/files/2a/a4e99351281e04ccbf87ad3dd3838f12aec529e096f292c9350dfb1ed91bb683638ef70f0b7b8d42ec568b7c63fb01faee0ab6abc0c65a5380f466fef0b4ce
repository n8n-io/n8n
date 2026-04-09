import { V as isNodeFirstInLine, f as createRule } from "../utils.js";
const MESSAGE_LOCATION = {
	"tag-aligned": "matchIndent",
	"line-aligned": "alignWithOpening"
};
var jsx_closing_tag_location_default = createRule({
	name: "jsx-closing-tag-location",
	meta: {
		type: "layout",
		docs: { description: "Enforce closing tag location for multiline JSX" },
		fixable: "whitespace",
		schema: [{ anyOf: [{
			type: "string",
			enum: ["tag-aligned", "line-aligned"]
		}] }],
		defaultOptions: ["tag-aligned"],
		messages: {
			onOwnLine: "Closing tag of a multiline JSX expression must be on its own line.",
			matchIndent: "Expected closing tag to match indentation of opening.",
			alignWithOpening: "Expected closing tag to be aligned with the line containing the opening tag"
		}
	},
	create(context, [option]) {
		function getIndentation(openingStartOfLine, opening) {
			if (option === "line-aligned") return openingStartOfLine.column;
			else return opening.loc.start.column;
		}
		function handleClosingElement(node) {
			if (!node.parent) return;
			const sourceCode = context.sourceCode;
			const opening = "openingFragment" in node.parent ? node.parent.openingFragment : node.parent.openingElement;
			const openingLoc = sourceCode.getFirstToken(opening).loc.start;
			const openingLine = sourceCode.lines[openingLoc.line - 1];
			const openingStartOfLine = {
				column: /^\s*/.exec(openingLine)?.[0].length,
				line: openingLoc.line
			};
			if (opening.loc.start.line === node.loc.start.line) return;
			if (opening.loc.start.column === node.loc.start.column && option === "tag-aligned") return;
			if (openingStartOfLine.column === node.loc.start.column && option === "line-aligned") return;
			const messageId = isNodeFirstInLine(context, node) ? MESSAGE_LOCATION[option] : "onOwnLine";
			context.report({
				node,
				messageId,
				loc: node.loc,
				fix(fixer) {
					const indent = new Array((getIndentation(openingStartOfLine, opening) || 0) + 1).join(" ");
					if (isNodeFirstInLine(context, node)) return fixer.replaceTextRange([node.range[0] - node.loc.start.column, node.range[0]], indent);
					return fixer.insertTextBefore(node, `\n${indent}`);
				}
			});
		}
		return {
			JSXClosingElement: handleClosingElement,
			JSXClosingFragment: handleClosingElement
		};
	}
});
export { jsx_closing_tag_location_default as t };
