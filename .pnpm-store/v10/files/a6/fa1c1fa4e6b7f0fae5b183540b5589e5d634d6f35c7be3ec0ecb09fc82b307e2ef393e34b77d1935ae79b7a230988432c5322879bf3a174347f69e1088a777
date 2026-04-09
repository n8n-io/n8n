import { $ as warnDeprecation, c as hasLinesAndGetLocFromIndex, f as createRule, u as isTextSourceCode } from "../utils.js";
var eol_last_default = createRule({
	name: "eol-last",
	meta: {
		type: "layout",
		docs: { description: "Require or disallow newline at the end of files" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: [
				"always",
				"never",
				"unix",
				"windows"
			]
		}],
		defaultOptions: ["always"],
		messages: {
			missing: "Newline required at end of file but not found.",
			unexpected: "Newline not allowed at end of file."
		}
	},
	create(context, [mode]) {
		const sourceCode = context.sourceCode;
		if (!isTextSourceCode(sourceCode) || !hasLinesAndGetLocFromIndex(sourceCode)) return {};
		const src = sourceCode.text;
		const LF = "\n";
		const CRLF = `\r${LF}`;
		const endsWithNewline = src.endsWith(LF);
		if (!src.length) return {};
		let appendCRLF = false;
		if (mode === "unix") {
			warnDeprecation("option(\"unix\")", "\"always\" and \"@stylistic/eslint-plugin/rules/linebreak-style\"", "eol-last");
			mode = "always";
		}
		if (mode === "windows") {
			warnDeprecation("option(\"windows\")", "\"always\" and \"@stylistic/eslint-plugin/rules/linebreak-style\"", "eol-last");
			mode = "always";
			appendCRLF = true;
		}
		if (mode === "always" && !endsWithNewline) context.report({
			loc: sourceCode.getLocFromIndex(src.length),
			messageId: "missing",
			fix(fixer) {
				return fixer.insertTextAfterRange([0, src.length], appendCRLF ? CRLF : LF);
			}
		});
		else if (mode === "never" && endsWithNewline) {
			const startLoc = sourceCode.getLocFromIndex(src.length - (src.endsWith(CRLF) ? 2 : 1));
			const endLoc = sourceCode.getLocFromIndex(src.length);
			context.report({
				loc: {
					start: startLoc,
					end: endLoc
				},
				messageId: "unexpected",
				fix(fixer) {
					const start = /(?:\r?\n)+$/u.exec(src).index;
					const end = src.length;
					return fixer.replaceTextRange([start, end], "");
				}
			});
		}
		return {};
	}
});
export { eol_last_default as t };
