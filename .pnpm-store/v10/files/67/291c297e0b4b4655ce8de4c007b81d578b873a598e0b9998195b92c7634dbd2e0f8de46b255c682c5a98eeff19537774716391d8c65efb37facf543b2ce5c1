const require_errors_index = require("../errors/index.cjs");
const require_base = require("../runnables/base.cjs");
require("../runnables/index.cjs");
//#region src/output_parsers/base.ts
/**
* Abstract base class for parsing the output of a Large Language Model
* (LLM) call. It provides methods for parsing the result of an LLM call
* and invoking the parser with a given input.
*/
var BaseLLMOutputParser = class extends require_base.Runnable {
	/**
	* Parses the result of an LLM call with a given prompt. By default, it
	* simply calls `parseResult`.
	* @param generations The generations from an LLM call.
	* @param _prompt The prompt used in the LLM call.
	* @param callbacks Optional callbacks.
	* @returns A promise of the parsed output.
	*/
	parseResultWithPrompt(generations, _prompt, callbacks) {
		return this.parseResult(generations, callbacks);
	}
	_baseMessageToString(message) {
		return typeof message.content === "string" ? message.content : this._baseMessageContentToString(message.content);
	}
	_baseMessageContentToString(content) {
		return JSON.stringify(content);
	}
	/**
	* Calls the parser with a given input and optional configuration options.
	* If the input is a string, it creates a generation with the input as
	* text and calls `parseResult`. If the input is a `BaseMessage`, it
	* creates a generation with the input as a message and the content of the
	* input as text, and then calls `parseResult`.
	* @param input The input to the parser, which can be a string or a `BaseMessage`.
	* @param options Optional configuration options.
	* @returns A promise of the parsed output.
	*/
	async invoke(input, options) {
		if (typeof input === "string") return this._callWithConfig(async (input, options) => this.parseResult([{ text: input }], options?.callbacks), input, {
			...options,
			runType: "parser"
		});
		else return this._callWithConfig(async (input, options) => this.parseResult([{
			message: input,
			text: this._baseMessageToString(input)
		}], options?.callbacks), input, {
			...options,
			runType: "parser"
		});
	}
};
/**
* Class to parse the output of an LLM call.
*/
var BaseOutputParser = class extends BaseLLMOutputParser {
	parseResult(generations, callbacks) {
		return this.parse(generations[0].text, callbacks);
	}
	async parseWithPrompt(text, _prompt, callbacks) {
		return this.parse(text, callbacks);
	}
	/**
	* Return the string type key uniquely identifying this class of parser
	*/
	_type() {
		throw new Error("_type not implemented");
	}
};
/**
* Exception that output parsers should raise to signify a parsing error.
*
* This exists to differentiate parsing errors from other code or execution errors
* that also may arise inside the output parser. OutputParserExceptions will be
* available to catch and handle in ways to fix the parsing error, while other
* errors will be raised.
*
* @param message - The error that's being re-raised or an error message.
* @param llmOutput - String model output which is error-ing.
* @param observation - String explanation of error which can be passed to a
*     model to try and remediate the issue.
* @param sendToLLM - Whether to send the observation and llm_output back to an Agent
*     after an OutputParserException has been raised. This gives the underlying
*     model driving the agent the context that the previous output was improperly
*     structured, in the hopes that it will update the output to the correct
*     format.
*/
var OutputParserException = class extends Error {
	llmOutput;
	observation;
	sendToLLM;
	constructor(message, llmOutput, observation, sendToLLM = false) {
		super(message);
		this.llmOutput = llmOutput;
		this.observation = observation;
		this.sendToLLM = sendToLLM;
		if (sendToLLM) {
			if (observation === void 0 || llmOutput === void 0) throw new Error("Arguments 'observation' & 'llmOutput' are required if 'sendToLlm' is true");
		}
		require_errors_index.addLangChainErrorFields(this, "OUTPUT_PARSING_FAILURE");
	}
};
//#endregion
exports.BaseLLMOutputParser = BaseLLMOutputParser;
exports.BaseOutputParser = BaseOutputParser;
exports.OutputParserException = OutputParserException;

//# sourceMappingURL=base.cjs.map