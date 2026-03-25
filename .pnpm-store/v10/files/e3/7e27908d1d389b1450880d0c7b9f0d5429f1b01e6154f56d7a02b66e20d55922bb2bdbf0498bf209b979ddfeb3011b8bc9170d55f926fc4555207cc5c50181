const require_base = require("./base.cjs");
const require_transform = require("./transform.cjs");
//#region src/output_parsers/list.ts
/**
* Class to parse the output of an LLM call to a list.
* @augments BaseOutputParser
*/
var ListOutputParser = class extends require_transform.BaseTransformOutputParser {
	re;
	async *_transform(inputGenerator) {
		let buffer = "";
		for await (const input of inputGenerator) {
			if (typeof input === "string") buffer += input;
			else buffer += input.content;
			if (!this.re) {
				const parts = await this.parse(buffer);
				if (parts.length > 1) {
					for (const part of parts.slice(0, -1)) yield [part];
					buffer = parts[parts.length - 1];
				}
			} else {
				const matches = [...buffer.matchAll(this.re)];
				if (matches.length > 1) {
					let doneIdx = 0;
					for (const match of matches.slice(0, -1)) {
						yield [match[1]];
						doneIdx += (match.index ?? 0) + match[0].length;
					}
					buffer = buffer.slice(doneIdx);
				}
			}
		}
		for (const part of await this.parse(buffer)) yield [part];
	}
};
/**
* Class to parse the output of an LLM call as a comma-separated list.
* @augments ListOutputParser
*/
var CommaSeparatedListOutputParser = class extends ListOutputParser {
	static lc_name() {
		return "CommaSeparatedListOutputParser";
	}
	lc_namespace = [
		"langchain_core",
		"output_parsers",
		"list"
	];
	lc_serializable = true;
	/**
	* Parses the given text into an array of strings, using a comma as the
	* separator. If the parsing fails, throws an OutputParserException.
	* @param text The text to parse.
	* @returns An array of strings obtained by splitting the input text at each comma.
	*/
	async parse(text) {
		try {
			return text.trim().split(",").map((s) => s.trim());
		} catch {
			throw new require_base.OutputParserException(`Could not parse output: ${text}`, text);
		}
	}
	/**
	* Provides instructions on the expected format of the response for the
	* CommaSeparatedListOutputParser.
	* @returns A string containing instructions on the expected format of the response.
	*/
	getFormatInstructions() {
		return `Your response should be a list of comma separated values, eg: \`foo, bar, baz\``;
	}
};
/**
* Class to parse the output of an LLM call to a list with a specific length and separator.
* @augments ListOutputParser
*/
var CustomListOutputParser = class extends ListOutputParser {
	lc_namespace = [
		"langchain_core",
		"output_parsers",
		"list"
	];
	length;
	separator;
	constructor({ length, separator }) {
		super(...arguments);
		this.length = length;
		this.separator = separator || ",";
	}
	/**
	* Parses the given text into an array of strings, using the specified
	* separator. If the parsing fails or the number of items in the list
	* doesn't match the expected length, throws an OutputParserException.
	* @param text The text to parse.
	* @returns An array of strings obtained by splitting the input text at each occurrence of the specified separator.
	*/
	async parse(text) {
		try {
			const items = text.trim().split(this.separator).map((s) => s.trim());
			if (this.length !== void 0 && items.length !== this.length) throw new require_base.OutputParserException(`Incorrect number of items. Expected ${this.length}, got ${items.length}.`);
			return items;
		} catch (e) {
			if (Object.getPrototypeOf(e) === require_base.OutputParserException.prototype) throw e;
			throw new require_base.OutputParserException(`Could not parse output: ${text}`);
		}
	}
	/**
	* Provides instructions on the expected format of the response for the
	* CustomListOutputParser, including the number of items and the
	* separator.
	* @returns A string containing instructions on the expected format of the response.
	*/
	getFormatInstructions() {
		return `Your response should be a list of ${this.length === void 0 ? "" : `${this.length} `}items separated by "${this.separator}" (eg: \`foo${this.separator} bar${this.separator} baz\`)`;
	}
};
var NumberedListOutputParser = class extends ListOutputParser {
	static lc_name() {
		return "NumberedListOutputParser";
	}
	lc_namespace = [
		"langchain_core",
		"output_parsers",
		"list"
	];
	lc_serializable = true;
	getFormatInstructions() {
		return `Your response should be a numbered list with each item on a new line. For example: \n\n1. foo\n\n2. bar\n\n3. baz`;
	}
	re = /\d+\.\s([^\n]+)/g;
	async parse(text) {
		return [...text.matchAll(this.re) ?? []].map((m) => m[1]);
	}
};
var MarkdownListOutputParser = class extends ListOutputParser {
	static lc_name() {
		return "NumberedListOutputParser";
	}
	lc_namespace = [
		"langchain_core",
		"output_parsers",
		"list"
	];
	lc_serializable = true;
	getFormatInstructions() {
		return `Your response should be a numbered list with each item on a new line. For example: \n\n1. foo\n\n2. bar\n\n3. baz`;
	}
	re = /^\s*[-*]\s([^\n]+)$/gm;
	async parse(text) {
		return [...text.matchAll(this.re) ?? []].map((m) => m[1]);
	}
};
//#endregion
exports.CommaSeparatedListOutputParser = CommaSeparatedListOutputParser;
exports.CustomListOutputParser = CustomListOutputParser;
exports.ListOutputParser = ListOutputParser;
exports.MarkdownListOutputParser = MarkdownListOutputParser;
exports.NumberedListOutputParser = NumberedListOutputParser;

//# sourceMappingURL=list.cjs.map