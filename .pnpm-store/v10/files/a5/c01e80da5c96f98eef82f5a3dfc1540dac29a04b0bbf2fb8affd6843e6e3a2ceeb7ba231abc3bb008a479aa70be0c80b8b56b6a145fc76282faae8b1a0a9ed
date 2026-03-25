import { LLMChain } from "../chains/llm_chain.js";
import { NAIVE_FIX_PROMPT } from "./prompts.js";
import { BaseOutputParser, OutputParserException } from "@langchain/core/output_parsers";

//#region src/output_parsers/fix.ts
function isLLMChain(x) {
	return x.prompt !== void 0 && x.llm !== void 0;
}
/**
* Class that extends the BaseOutputParser to handle situations where the
* initial parsing attempt fails. It contains a retryChain for retrying
* the parsing process in case of a failure.
*/
var OutputFixingParser = class OutputFixingParser extends BaseOutputParser {
	static lc_name() {
		return "OutputFixingParser";
	}
	lc_namespace = [
		"langchain",
		"output_parsers",
		"fix"
	];
	lc_serializable = true;
	parser;
	retryChain;
	/**
	* Static method to create a new instance of OutputFixingParser using a
	* given language model, parser, and optional fields.
	* @param llm The language model to be used.
	* @param parser The parser to be used.
	* @param fields Optional fields which may contain a prompt.
	* @returns A new instance of OutputFixingParser.
	*/
	static fromLLM(llm, parser, fields) {
		const prompt = fields?.prompt ?? NAIVE_FIX_PROMPT;
		const chain = new LLMChain({
			llm,
			prompt
		});
		return new OutputFixingParser({
			parser,
			retryChain: chain
		});
	}
	constructor({ parser, retryChain }) {
		super(...arguments);
		this.parser = parser;
		this.retryChain = retryChain;
	}
	/**
	* Method to parse the completion using the parser. If the initial parsing
	* fails, it uses the retryChain to attempt to fix the output and retry
	* the parsing process.
	* @param completion The completion to be parsed.
	* @param callbacks Optional callbacks to be used during parsing.
	* @returns The parsed output.
	*/
	async parse(completion, callbacks) {
		try {
			return await this.parser.parse(completion, callbacks);
		} catch (e) {
			if (e instanceof OutputParserException) {
				const retryInput = {
					instructions: this.parser.getFormatInstructions(),
					completion,
					error: e
				};
				if (isLLMChain(this.retryChain)) {
					const result = await this.retryChain.call(retryInput, callbacks);
					const newCompletion = result[this.retryChain.outputKey];
					return this.parser.parse(newCompletion, callbacks);
				} else {
					const result = await this.retryChain.invoke(retryInput, { callbacks });
					return result;
				}
			}
			throw e;
		}
	}
	/**
	* Method to get the format instructions for the parser.
	* @returns The format instructions for the parser.
	*/
	getFormatInstructions() {
		return this.parser.getFormatInstructions();
	}
};

//#endregion
export { OutputFixingParser };
//# sourceMappingURL=fix.js.map