import { T as createGlobalLinebreakMatcher, f as createRule } from "../utils.js";
var no_trailing_spaces_default = createRule({
	name: "no-trailing-spaces",
	meta: {
		type: "layout",
		docs: { description: "Disallow trailing whitespace at the end of lines" },
		fixable: "whitespace",
		schema: [{
			type: "object",
			properties: {
				skipBlankLines: { type: "boolean" },
				ignoreComments: { type: "boolean" }
			},
			additionalProperties: false
		}],
		defaultOptions: [{
			skipBlankLines: false,
			ignoreComments: false
		}],
		messages: { trailingSpace: "Trailing spaces not allowed." }
	},
	create(context, [options]) {
		const sourceCode = context.sourceCode;
		const BLANK_CLASS = "[ 	\xA0 -​　]";
		const SKIP_BLANK = `^${BLANK_CLASS}*$`;
		const NONBLANK = `${BLANK_CLASS}+$`;
		const { skipBlankLines, ignoreComments } = options;
		function report(node, location, fixRange) {
			context.report({
				node,
				loc: location,
				messageId: "trailingSpace",
				fix(fixer) {
					return fixer.removeRange(fixRange);
				}
			});
		}
		function getCommentLineNumbers(comments) {
			const lines = /* @__PURE__ */ new Set();
			comments.forEach((comment) => {
				const endLine = comment.type === "Block" ? comment.loc.end.line - 1 : comment.loc.end.line;
				for (let i = comment.loc.start.line; i <= endLine; i++) lines.add(i);
			});
			return lines;
		}
		return { [context.sourceCode.ast.type || "Program"]: function checkTrailingSpaces(node) {
			const re = new RegExp(NONBLANK, "u");
			const skipMatch = new RegExp(SKIP_BLANK, "u");
			const lines = sourceCode.lines;
			const linebreaks = sourceCode.getText().match(createGlobalLinebreakMatcher());
			const commentLineNumbers = getCommentLineNumbers("getAllComments" in sourceCode ? sourceCode.getAllComments() : []);
			let totalLength = 0;
			for (let i = 0, ii = lines.length; i < ii; i++) {
				const lineNumber = i + 1;
				const linebreakLength = linebreaks && linebreaks[i] ? linebreaks[i].length : 1;
				const lineLength = lines[i].length + linebreakLength;
				const matches = re.exec(lines[i]);
				if (matches) {
					const location = {
						start: {
							line: lineNumber,
							column: matches.index
						},
						end: {
							line: lineNumber,
							column: lineLength - linebreakLength
						}
					};
					const rangeStart = totalLength + location.start.column;
					const rangeEnd = totalLength + location.end.column;
					const containingNode = "getNodeByRangeIndex" in sourceCode ? sourceCode.getNodeByRangeIndex(rangeStart) : null;
					if (containingNode && containingNode.type === "TemplateElement" && rangeStart > containingNode.parent.range[0] && rangeEnd < containingNode.parent.range[1]) {
						totalLength += lineLength;
						continue;
					}
					if (skipBlankLines && skipMatch.test(lines[i])) {
						totalLength += lineLength;
						continue;
					}
					const fixRange = [rangeStart, rangeEnd];
					if (!ignoreComments || !commentLineNumbers.has(lineNumber)) report(node, location, fixRange);
				}
				totalLength += lineLength;
			}
		} };
	}
});
export { no_trailing_spaces_default as t };
