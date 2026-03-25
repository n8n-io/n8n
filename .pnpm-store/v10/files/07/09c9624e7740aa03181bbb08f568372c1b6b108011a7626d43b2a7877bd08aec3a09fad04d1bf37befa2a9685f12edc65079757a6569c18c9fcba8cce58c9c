const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/experimental/autogpt/output_parser.ts
/**
* Utility function used to preprocess a string to be parsed as JSON.
* It replaces single backslashes with double backslashes, while leaving
* already escaped ones intact.
* It also extracts the json code if it is inside a code block
*/
function preprocessJsonInput(inputStr) {
	const correctedStr = inputStr.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");
	const match = correctedStr.match(/```(.*)(\r\n|\r|\n)(?<code>[\w\W\n]+)(\r\n|\r|\n)```/);
	if (match?.groups?.code) return match.groups.code.trim();
	else return correctedStr;
}
/**
* Class responsible for parsing the output of AutoGPT. It extends the
* BaseOutputParser class.
*/
var AutoGPTOutputParser = class extends __langchain_core_output_parsers.BaseOutputParser {
	lc_namespace = [
		"langchain",
		"experimental",
		"autogpt"
	];
	/**
	* Method not implemented in the class and will throw an error if called.
	* It is likely meant to be overridden in subclasses to provide specific
	* format instructions.
	* @returns Throws an error.
	*/
	getFormatInstructions() {
		throw new Error("Method not implemented.");
	}
	/**
	* Asynchronous method that takes a string as input and attempts to parse
	* it into an AutoGPTAction object. If the input string cannot be parsed
	* directly, the method tries to preprocess the string using the
	* preprocessJsonInput function and parse it again. If parsing fails
	* again, it returns an AutoGPTAction object with an error message.
	* @param text The string to be parsed.
	* @returns A Promise that resolves to an AutoGPTAction object.
	*/
	async parse(text) {
		let parsed;
		try {
			parsed = JSON.parse(text);
		} catch {
			const preprocessedText = preprocessJsonInput(text);
			try {
				parsed = JSON.parse(preprocessedText);
			} catch {
				return {
					name: "ERROR",
					args: { error: `Could not parse invalid json: ${text}` }
				};
			}
		}
		try {
			return {
				name: parsed.command.name,
				args: parsed.command.args
			};
		} catch {
			return {
				name: "ERROR",
				args: { error: `Incomplete command args: ${parsed}` }
			};
		}
	}
};

//#endregion
exports.AutoGPTOutputParser = AutoGPTOutputParser;
exports.preprocessJsonInput = preprocessJsonInput;
//# sourceMappingURL=output_parser.cjs.map