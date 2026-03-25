import { BaseOutputParser, OutputParserException } from "@langchain/core/output_parsers";

//#region src/output_parsers/regex.ts
/**
* Class to parse the output of an LLM call into a dictionary.
* @augments BaseOutputParser
*/
var RegexParser = class extends BaseOutputParser {
	static lc_name() {
		return "RegexParser";
	}
	lc_namespace = [
		"langchain",
		"output_parsers",
		"regex"
	];
	lc_serializable = true;
	get lc_attributes() {
		return { regex: this.lc_kwargs.regex };
	}
	regex;
	outputKeys;
	defaultOutputKey;
	constructor(fields, outputKeys, defaultOutputKey) {
		if (typeof fields === "string" || fields instanceof RegExp) fields = {
			regex: fields,
			outputKeys,
			defaultOutputKey
		};
		if (fields.regex instanceof RegExp) fields.regex = {
			pattern: fields.regex.source,
			flags: fields.regex.flags
		};
		super(fields);
		this.regex = typeof fields.regex === "string" ? new RegExp(fields.regex) : "pattern" in fields.regex ? new RegExp(fields.regex.pattern, fields.regex.flags) : fields.regex;
		this.outputKeys = fields.outputKeys;
		this.defaultOutputKey = fields.defaultOutputKey;
	}
	_type() {
		return "regex_parser";
	}
	/**
	* Parses the given text using the regex pattern and returns a dictionary
	* with the parsed output. If the regex pattern does not match the text
	* and no defaultOutputKey is provided, throws an OutputParserException.
	* @param text The text to be parsed.
	* @returns A dictionary with the parsed output.
	*/
	async parse(text) {
		const match = text.match(this.regex);
		if (match) return this.outputKeys.reduce((acc, key, index) => {
			acc[key] = match[index + 1];
			return acc;
		}, {});
		if (this.defaultOutputKey === void 0) throw new OutputParserException(`Could not parse output: ${text}`, text);
		return this.outputKeys.reduce((acc, key) => {
			acc[key] = key === this.defaultOutputKey ? text : "";
			return acc;
		}, {});
	}
	/**
	* Returns a string with instructions on how the LLM output should be
	* formatted to match the regex pattern.
	* @returns A string with formatting instructions.
	*/
	getFormatInstructions() {
		return `Your response should match the following regex: ${this.regex}`;
	}
};

//#endregion
export { RegexParser };
//# sourceMappingURL=regex.js.map