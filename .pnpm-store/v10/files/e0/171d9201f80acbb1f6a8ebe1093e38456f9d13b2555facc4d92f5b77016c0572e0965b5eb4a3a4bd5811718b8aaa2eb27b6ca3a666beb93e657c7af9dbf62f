const require_json = require("../utils/json.cjs");
const require_duplex = require("../utils/fast-json-patch/src/duplex.cjs");
const require_transform = require("./transform.cjs");
require("../utils/json_patch.cjs");
//#region src/output_parsers/json.ts
/**
* Class for parsing the output of an LLM into a JSON object.
*/
var JsonOutputParser = class extends require_transform.BaseCumulativeTransformOutputParser {
	static lc_name() {
		return "JsonOutputParser";
	}
	lc_namespace = ["langchain_core", "output_parsers"];
	lc_serializable = true;
	/** @internal */
	_concatOutputChunks(first, second) {
		if (this.diff) return super._concatOutputChunks(first, second);
		return second;
	}
	_diff(prev, next) {
		if (!next) return;
		if (!prev) return [{
			op: "replace",
			path: "",
			value: next
		}];
		return require_duplex.compare(prev, next);
	}
	async parsePartialResult(generations) {
		return require_json.parseJsonMarkdown(generations[0].text);
	}
	async parse(text) {
		return require_json.parseJsonMarkdown(text, JSON.parse);
	}
	getFormatInstructions() {
		return "";
	}
	/**
	* Extracts text content from a message for JSON parsing.
	* Uses the message's `.text` accessor which properly handles both
	* string content and ContentBlock[] arrays (extracting text from text blocks).
	* @param message The message to extract text from
	* @returns The text content of the message
	*/
	_baseMessageToString(message) {
		return message.text;
	}
};
//#endregion
exports.JsonOutputParser = JsonOutputParser;

//# sourceMappingURL=json.cjs.map