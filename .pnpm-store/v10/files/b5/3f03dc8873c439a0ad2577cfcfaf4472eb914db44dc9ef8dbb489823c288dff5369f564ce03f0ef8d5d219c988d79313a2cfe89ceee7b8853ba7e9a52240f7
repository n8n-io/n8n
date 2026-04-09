import { c as hasLinesAndGetLocFromIndex, f as createRule, u as isTextSourceCode } from "../utils.js";
var linebreak_style_default = createRule({
	name: "linebreak-style",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent linebreak style" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: ["unix", "windows"]
		}],
		defaultOptions: ["unix"],
		messages: {
			expectedLF: "Expected linebreaks to be 'LF' but found 'CRLF'.",
			expectedCRLF: "Expected linebreaks to be 'CRLF' but found 'LF'."
		}
	},
	create(context, [linebreakStyle]) {
		const sourceCode = context.sourceCode;
		if (!isTextSourceCode(sourceCode) || !hasLinesAndGetLocFromIndex(sourceCode)) return {};
		const source = sourceCode.text;
		const lines = sourceCode.lines;
		const expectedLF = linebreakStyle === "unix";
		const expectedLFChars = expectedLF ? "\n" : "\r\n";
		let currentIndex = 0;
		for (const line of lines.slice(0, -1)) {
			const startIndex = currentIndex + line.length;
			const startLoc = sourceCode.getLocFromIndex(startIndex);
			let endIndex = startIndex + 1;
			let endLoc = sourceCode.getLocFromIndex(endIndex);
			while (endLoc.line === startLoc.line && endIndex < source.length) {
				endIndex++;
				endLoc = sourceCode.getLocFromIndex(endIndex);
			}
			if (source.slice(startIndex, endIndex) !== expectedLFChars) context.report({
				loc: {
					start: startLoc,
					end: endLoc
				},
				messageId: expectedLF ? "expectedLF" : "expectedCRLF",
				fix: (fixer) => fixer.replaceTextRange([startIndex, endIndex], expectedLFChars)
			});
			currentIndex = endIndex;
		}
		return {};
	}
});
export { linebreak_style_default as t };
