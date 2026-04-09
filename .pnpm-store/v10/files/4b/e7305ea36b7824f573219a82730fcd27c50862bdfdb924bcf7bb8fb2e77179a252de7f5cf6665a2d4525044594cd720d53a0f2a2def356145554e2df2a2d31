import { V as isNodeFirstInLine, f as createRule } from "../utils.js";
var jsx_indent_props_default = createRule({
	name: "jsx-indent-props",
	meta: {
		type: "layout",
		docs: { description: "Enforce props indentation in JSX" },
		fixable: "code",
		schema: [{ anyOf: [
			{
				type: "string",
				enum: ["tab", "first"]
			},
			{ type: "integer" },
			{
				type: "object",
				properties: {
					indentMode: { anyOf: [{
						type: "string",
						enum: ["tab", "first"]
					}, { type: "integer" }] },
					ignoreTernaryOperator: { type: "boolean" }
				},
				additionalProperties: false
			}
		] }],
		defaultOptions: [4],
		messages: { wrongIndent: "Expected indentation of {{needed}} {{type}} {{characters}} but found {{gotten}}." }
	},
	create(context, [options]) {
		const extraColumnStart = 0;
		const line = {
			isUsingOperator: false,
			currentOperator: false
		};
		const { indentMode = 4, ignoreTernaryOperator = false } = typeof options === "object" ? options : { indentMode: options };
		const indentType = indentMode === "tab" ? "tab" : "space";
		const indentSize = indentMode === "first" ? "first" : indentMode === "tab" ? 1 : indentMode;
		function getNodeIndent(node) {
			let src = context.sourceCode.getText(node, node.loc.start.column + extraColumnStart);
			src = src.split("\n")[0];
			let regExp;
			if (indentType === "space") regExp = /^ +/;
			else regExp = /^\t+/;
			const indent = regExp.exec(src);
			const useOperator = /^[ \t]*:/.test(src) || /^[ \t]*\?/.test(src);
			const useBracket = /</.test(src);
			line.currentOperator = false;
			if (useOperator) {
				line.isUsingOperator = true;
				line.currentOperator = true;
			} else if (useBracket) line.isUsingOperator = false;
			return indent ? indent[0].length : 0;
		}
		function checkNodesIndent(nodes, indent) {
			let nestedIndent = indent;
			nodes.forEach((node) => {
				const nodeIndent = getNodeIndent(node);
				if (line.isUsingOperator && !line.currentOperator && indentSize !== "first" && !ignoreTernaryOperator) {
					nestedIndent += indentSize;
					line.isUsingOperator = false;
				}
				if (node.type !== "ArrayExpression" && node.type !== "ObjectExpression" && nodeIndent !== nestedIndent && isNodeFirstInLine(context, node)) context.report({
					node,
					messageId: "wrongIndent",
					data: {
						needed: nestedIndent,
						type: indentType,
						characters: nestedIndent === 1 ? "character" : "characters",
						gotten: nodeIndent
					},
					fix(fixer) {
						return fixer.replaceTextRange([node.range[0] - node.loc.start.column, node.range[0]], new Array(nestedIndent + 1).join(indentType === "space" ? " " : "	"));
					}
				});
			});
		}
		return { JSXOpeningElement(node) {
			if (!node.attributes.length) return;
			let propIndent;
			if (indentSize === "first") propIndent = node.attributes[0].loc.start.column;
			else propIndent = getNodeIndent(node) + indentSize;
			checkNodesIndent(node.attributes, propIndent);
		} };
	}
});
export { jsx_indent_props_default as t };
