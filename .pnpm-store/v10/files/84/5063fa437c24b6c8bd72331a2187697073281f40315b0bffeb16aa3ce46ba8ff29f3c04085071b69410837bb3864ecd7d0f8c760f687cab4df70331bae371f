import { f as createRule } from "../utils.js";
var no_mixed_spaces_and_tabs_default = createRule({
	name: "no-mixed-spaces-and-tabs",
	meta: {
		type: "layout",
		docs: { description: "Disallow mixed spaces and tabs for indentation" },
		schema: [{ oneOf: [{
			type: "string",
			enum: ["smart-tabs"]
		}, { type: "boolean" }] }],
		defaultOptions: [false],
		messages: { mixedSpacesAndTabs: "Mixed spaces and tabs." }
	},
	create(context, [style]) {
		const sourceCode = context.sourceCode;
		const smartTabs = typeof style === "boolean" ? style : style === "smart-tabs";
		return { "Program:exit": function(node) {
			const lines = sourceCode.lines;
			const comments = sourceCode.getAllComments();
			const ignoredCommentLines = /* @__PURE__ */ new Set();
			comments.forEach((comment) => {
				for (let i = comment.loc.start.line + 1; i <= comment.loc.end.line; i++) ignoredCommentLines.add(i);
			});
			let regex = /^(?=( +|\t+))\1(?:\t| )/u;
			if (smartTabs) regex = /^(?=(\t*))\1(?=( +))\2\t/u;
			lines.forEach((line, i) => {
				const match = regex.exec(line);
				if (match) {
					const lineNumber = i + 1;
					const loc = {
						start: {
							line: lineNumber,
							column: match[0].length - 2
						},
						end: {
							line: lineNumber,
							column: match[0].length
						}
					};
					if (!ignoredCommentLines.has(lineNumber)) {
						const containingNode = sourceCode.getNodeByRangeIndex(sourceCode.getIndexFromLoc(loc.start));
						if (!(containingNode && ["Literal", "TemplateElement"].includes(containingNode.type))) context.report({
							node,
							loc,
							messageId: "mixedSpacesAndTabs"
						});
					}
				}
			});
		} };
	}
});
export { no_mixed_spaces_and_tabs_default as t };
