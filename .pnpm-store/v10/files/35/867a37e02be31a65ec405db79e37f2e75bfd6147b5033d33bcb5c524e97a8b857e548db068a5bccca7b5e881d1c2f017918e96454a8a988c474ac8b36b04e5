const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_structured = require('./structured.cjs');
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/output_parsers/router.ts
/**
* A type of output parser that extends the
* JsonMarkdownStructuredOutputParser. It is used to parse the output of a
* router in LangChain. The class takes a schema and an optional
* RouterOutputParserInput object as parameters.
*/
var RouterOutputParser = class extends require_structured.JsonMarkdownStructuredOutputParser {
	defaultDestination = "DEFAULT";
	constructor(schema, options) {
		super(schema);
		this.defaultDestination = options?.defaultDestination ?? this.defaultDestination;
	}
	/**
	* Overrides the parse method from JsonMarkdownStructuredOutputParser.
	* This method takes a string as input, attempts to parse it, and returns
	* the parsed text. If the destination of the parsed text matches the
	* defaultDestination, the destination is set to null. If the parsing
	* fails, an OutputParserException is thrown.
	* @param text The text to be parsed.
	* @returns The parsed text as a Promise.
	*/
	async parse(text) {
		try {
			const parsedText = await super.parse(text);
			if (parsedText.destination?.toLowerCase() === this.defaultDestination.toLowerCase()) parsedText.destination = null;
			return parsedText;
		} catch (e) {
			throw new __langchain_core_output_parsers.OutputParserException(`Failed to parse. Text: "${text}". Error: ${e}`, text);
		}
	}
};

//#endregion
exports.RouterOutputParser = RouterOutputParser;
//# sourceMappingURL=router.cjs.map