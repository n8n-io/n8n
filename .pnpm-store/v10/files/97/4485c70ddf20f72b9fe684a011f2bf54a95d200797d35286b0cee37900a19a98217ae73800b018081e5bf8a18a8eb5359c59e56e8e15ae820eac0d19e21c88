const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/output_parsers/datetime.ts
/**
* Class to parse the output of an LLM call to a date.
* @augments BaseOutputParser
*/
var DatetimeOutputParser = class extends __langchain_core_output_parsers.BaseOutputParser {
	static lc_name() {
		return "DatetimeOutputParser";
	}
	lc_namespace = ["langchain", "output_parsers"];
	lc_serializable = true;
	/**
	* ISO 8601 date time standard.
	*/
	format = "YYYY-MM-DDTHH:mm:ssZ";
	/**
	* Parses the given text into a Date.
	* If the parsing fails, throws an OutputParserException.
	* @param text The text to parse.
	* @returns A date object.
	*/
	async parse(text) {
		const parsedDate = new Date(text.trim());
		if (Number.isNaN(parsedDate.getTime())) throw new __langchain_core_output_parsers.OutputParserException(`Could not parse output: ${text}`, text);
		return parsedDate;
	}
	/**
	* Provides instructions on the expected format of the response for the
	* CommaSeparatedListOutputParser.
	* @returns A string containing instructions on the expected format of the response.
	*/
	getFormatInstructions() {
		return [
			`Your response should be a datetime string that matches the following pattern: "${this.format}".`,
			`Examples: 2011-10-05T14:48:00Z, 2019-01-01T00:00:00Z, 1932-04-21T04:42:23Z`,
			`Return ONLY this string, no other words!`
		].join("\n\n");
	}
};

//#endregion
exports.DatetimeOutputParser = DatetimeOutputParser;
//# sourceMappingURL=datetime.cjs.map