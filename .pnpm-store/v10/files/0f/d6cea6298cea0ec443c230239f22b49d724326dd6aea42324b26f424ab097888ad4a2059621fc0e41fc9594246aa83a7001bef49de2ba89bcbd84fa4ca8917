const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/utils/output_parsers.ts
const stripThinkTags = (text) => {
	return text.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
};
var ReasoningStructuredOutputParser = class extends __langchain_core_output_parsers.StructuredOutputParser {
	constructor(schema) {
		super(schema);
	}
	async parse(text) {
		const cleanedText = stripThinkTags(text);
		return super.parse(cleanedText);
	}
};
var ReasoningJsonOutputParser = class extends __langchain_core_output_parsers.JsonOutputParser {
	async parse(text) {
		const cleanedText = stripThinkTags(text);
		return super.parse(cleanedText);
	}
};

//#endregion
exports.ReasoningJsonOutputParser = ReasoningJsonOutputParser;
exports.ReasoningStructuredOutputParser = ReasoningStructuredOutputParser;
//# sourceMappingURL=output_parsers.cjs.map