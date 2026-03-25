import { JsonOutputParser, StructuredOutputParser } from "@langchain/core/output_parsers";

//#region src/utils/output_parsers.ts
const stripThinkTags = (text) => {
	return text.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
};
var ReasoningStructuredOutputParser = class extends StructuredOutputParser {
	constructor(schema) {
		super(schema);
	}
	async parse(text) {
		const cleanedText = stripThinkTags(text);
		return super.parse(cleanedText);
	}
};
var ReasoningJsonOutputParser = class extends JsonOutputParser {
	async parse(text) {
		const cleanedText = stripThinkTags(text);
		return super.parse(cleanedText);
	}
};

//#endregion
export { ReasoningJsonOutputParser, ReasoningStructuredOutputParser };
//# sourceMappingURL=output_parsers.js.map