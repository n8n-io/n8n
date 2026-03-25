const require_transform = require("./transform.cjs");
//#region src/output_parsers/bytes.ts
/**
* OutputParser that parses LLMResult into the top likely string and
* encodes it into bytes.
*/
var BytesOutputParser = class extends require_transform.BaseTransformOutputParser {
	static lc_name() {
		return "BytesOutputParser";
	}
	lc_namespace = [
		"langchain_core",
		"output_parsers",
		"bytes"
	];
	lc_serializable = true;
	textEncoder = new TextEncoder();
	parse(text) {
		return Promise.resolve(this.textEncoder.encode(text));
	}
	getFormatInstructions() {
		return "";
	}
};
//#endregion
exports.BytesOutputParser = BytesOutputParser;

//# sourceMappingURL=bytes.cjs.map