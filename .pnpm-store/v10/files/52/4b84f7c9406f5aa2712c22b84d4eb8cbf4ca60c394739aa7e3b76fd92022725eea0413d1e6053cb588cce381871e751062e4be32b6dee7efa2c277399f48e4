const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/output_parsers/http_response.ts
/**
* OutputParser that formats chunks emitted from an LLM for different HTTP content types.
*/
var HttpResponseOutputParser = class extends __langchain_core_output_parsers.BaseTransformOutputParser {
	static lc_name() {
		return "HttpResponseOutputParser";
	}
	lc_namespace = ["langchain", "output_parser"];
	lc_serializable = true;
	outputParser = new __langchain_core_output_parsers.StringOutputParser();
	contentType = "text/plain";
	constructor(fields) {
		super(fields);
		this.outputParser = fields?.outputParser ?? this.outputParser;
		this.contentType = fields?.contentType ?? this.contentType;
	}
	async *_transform(inputGenerator) {
		for await (const chunk of this.outputParser._transform(inputGenerator)) if (typeof chunk === "string") yield this.parse(chunk);
		else yield this.parse(JSON.stringify(chunk));
		if (this.contentType === "text/event-stream") {
			const encoder = new TextEncoder();
			yield encoder.encode(`event: end\n\n`);
		}
	}
	/**
	* Parses a string output from an LLM call. This method is meant to be
	* implemented by subclasses to define how a string output from an LLM
	* should be parsed.
	* @param text The string output from an LLM call.
	* @param callbacks Optional callbacks.
	* @returns A promise of the parsed output.
	*/
	async parse(text) {
		const chunk = await this.outputParser.parse(text);
		const encoder = new TextEncoder();
		if (this.contentType === "text/event-stream") return encoder.encode(`event: data\ndata: ${JSON.stringify(chunk)}\n\n`);
		let parsedChunk;
		if (typeof chunk === "string") parsedChunk = chunk;
		else parsedChunk = JSON.stringify(chunk);
		return encoder.encode(parsedChunk);
	}
	getFormatInstructions() {
		return "";
	}
};

//#endregion
exports.HttpResponseOutputParser = HttpResponseOutputParser;
//# sourceMappingURL=http_response.cjs.map