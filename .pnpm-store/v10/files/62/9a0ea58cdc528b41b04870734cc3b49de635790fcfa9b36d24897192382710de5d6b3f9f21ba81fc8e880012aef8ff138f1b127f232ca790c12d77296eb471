const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/output_parsers/combining.ts
/**
* Class to combine multiple output parsers
* @augments BaseOutputParser
*/
var CombiningOutputParser = class extends __langchain_core_output_parsers.BaseOutputParser {
	static lc_name() {
		return "CombiningOutputParser";
	}
	lc_namespace = [
		"langchain",
		"output_parsers",
		"combining"
	];
	lc_serializable = true;
	parsers;
	outputDelimiter = "-----";
	constructor(fields, ...parsers) {
		if (parsers.length > 0 || !("parsers" in fields)) fields = { parsers: [fields, ...parsers] };
		super(fields);
		this.parsers = fields.parsers;
	}
	/**
	* Method to parse an input string using the parsers in the parsers array.
	* The parsed outputs are combined into a single object and returned.
	* @param input The input string to parse.
	* @param callbacks Optional Callbacks object.
	* @returns A Promise that resolves to a CombinedOutput object.
	*/
	async parse(input, callbacks) {
		const inputs = input.trim().split(/* @__PURE__ */ new RegExp(`${this.outputDelimiter}Output \\d+${this.outputDelimiter}`)).slice(1);
		const ret = {};
		for (const [i, p] of this.parsers.entries()) {
			let parsed;
			try {
				let extracted = inputs[i].includes("```") ? inputs[i].trim().split(/```/)[1] : inputs[i].trim();
				if (extracted.endsWith(this.outputDelimiter)) extracted = extracted.slice(0, -this.outputDelimiter.length);
				parsed = await p.parse(extracted, callbacks);
			} catch {
				parsed = await p.parse(input.trim(), callbacks);
			}
			Object.assign(ret, parsed);
		}
		return ret;
	}
	/**
	* Method to get instructions on how to format the LLM output. The
	* instructions are based on the parsers array and the outputDelimiter.
	* @returns A string with format instructions.
	*/
	getFormatInstructions() {
		return `${[`Return the following ${this.parsers.length} outputs, each formatted as described below. Include the delimiter characters "${this.outputDelimiter}" in your response:`, ...this.parsers.map((p, i) => `${this.outputDelimiter}Output ${i + 1}${this.outputDelimiter}\n${p.getFormatInstructions().trim()}\n${this.outputDelimiter}`)].join("\n\n")}\n`;
	}
};

//#endregion
exports.CombiningOutputParser = CombiningOutputParser;
//# sourceMappingURL=combining.cjs.map