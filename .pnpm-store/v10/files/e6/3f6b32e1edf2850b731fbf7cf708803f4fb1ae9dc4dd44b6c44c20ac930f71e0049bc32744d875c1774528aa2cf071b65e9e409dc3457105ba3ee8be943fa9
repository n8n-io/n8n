Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region src/utils/context.ts
var context_exports = /* @__PURE__ */ require("../_virtual/_rolldown/runtime.cjs").__exportAll({ context: () => context });
/**
* A tagged template function for creating formatted strings.
*
* This utility provides a clean, template literal-based API for string formatting
* that can be used for prompts, descriptions, and other text formatting needs.
*
* It automatically handles whitespace normalization and indentation, making it
* ideal for multi-line strings in code.
*
* When using this utility, it will:
* - Strip common leading indentation from all lines
* - Trim leading/trailing whitespace
* - Align multi-line interpolated values to match indentation
* - Support escape sequences: `\\n` (newline), `\\`` (backtick), `\\$` (dollar), `\\{` (brace)
*
* @example
* ```typescript
* import { context } from "@langchain/core/utils/context";
*
* const role = "agent";
* const prompt = context`
*   You are an ${role}.
*   Your task is to help users.
* `;
* // Returns: "You are an agent.\nYour task is to help users."
* ```
*
* @example
* ```typescript
* // Multi-line interpolated values are aligned
* const items = "- Item 1\n- Item 2\n- Item 3";
* const message = context`
*   Shopping list:
*     ${items}
*   End of list.
* `;
* // The items will be indented to match "    " (4 spaces)
* ```
*/
function context(strings, ...values) {
	const raw = strings.raw;
	let result = "";
	for (let i = 0; i < raw.length; i++) {
		const next = raw[i].replace(/\\\n[ \t]*/g, "").replace(/\\`/g, "`").replace(/\\\$/g, "$").replace(/\\\{/g, "{");
		result += next;
		if (i < values.length) {
			const value = alignValue(values[i], result);
			result += typeof value === "string" ? value : JSON.stringify(value);
		}
	}
	result = stripIndent(result);
	result = result.trim();
	result = result.replace(/\\n/g, "\n");
	return result;
}
/**
* Adjusts the indentation of a multi-line interpolated value to match the current line.
*
* @param value - The interpolated value
* @param precedingText - The text that comes before this value
* @returns The value with adjusted indentation
*/
function alignValue(value, precedingText) {
	if (typeof value !== "string" || !value.includes("\n")) return value;
	const indentMatch = precedingText.slice(precedingText.lastIndexOf("\n") + 1).match(/^(\s+)/);
	if (indentMatch) {
		const indent = indentMatch[1];
		return value.replace(/\n/g, `\n${indent}`);
	}
	return value;
}
/**
* Strips common leading indentation from all lines.
*
* @param text - The text to process
* @returns The text with common indentation removed
*/
function stripIndent(text) {
	const lines = text.split("\n");
	let minIndent = null;
	for (const line of lines) {
		const match = line.match(/^(\s+)\S+/);
		if (match) {
			const indent = match[1].length;
			if (minIndent === null) minIndent = indent;
			else minIndent = Math.min(minIndent, indent);
		}
	}
	if (minIndent === null) return text;
	return lines.map((line) => line[0] === " " || line[0] === "	" ? line.slice(minIndent) : line).join("\n");
}
//#endregion
exports.context = context;
Object.defineProperty(exports, "context_exports", {
	enumerable: true,
	get: function() {
		return context_exports;
	}
});

//# sourceMappingURL=context.cjs.map