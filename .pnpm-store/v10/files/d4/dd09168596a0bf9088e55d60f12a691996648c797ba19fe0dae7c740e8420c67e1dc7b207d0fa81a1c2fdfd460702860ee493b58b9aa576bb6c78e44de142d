import { BaseOutputParser } from "@langchain/core/output_parsers";

//#region src/output_parsers/noop.ts
/**
* The NoOpOutputParser class is a type of output parser that does not
* perform any operations on the output. It extends the BaseOutputParser
* class and is part of the LangChain's output parsers module. This class
* is useful in scenarios where the raw output of the Large Language
* Models (LLMs) is required.
*/
var NoOpOutputParser = class extends BaseOutputParser {
	static lc_name() {
		return "NoOpOutputParser";
	}
	lc_namespace = [
		"langchain",
		"output_parsers",
		"default"
	];
	lc_serializable = true;
	/**
	* This method takes a string as input and returns the same string as
	* output. It does not perform any operations on the input string.
	* @param text The input string to be parsed.
	* @returns The same input string without any operations performed on it.
	*/
	parse(text) {
		return Promise.resolve(text);
	}
	/**
	* This method returns an empty string. It does not provide any formatting
	* instructions.
	* @returns An empty string, indicating no formatting instructions.
	*/
	getFormatInstructions() {
		return "";
	}
};

//#endregion
export { NoOpOutputParser };
//# sourceMappingURL=noop.js.map