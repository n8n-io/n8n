const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));
const __langchain_core_utils_json_patch = require_rolldown_runtime.__toESM(require("@langchain/core/utils/json_patch"));

//#region src/output_parsers/openai_functions.ts
/**
* Class for parsing the output of an LLM. Can be configured to return
* only the arguments of the function call in the output.
*/
var OutputFunctionsParser = class extends __langchain_core_output_parsers.BaseLLMOutputParser {
	static lc_name() {
		return "OutputFunctionsParser";
	}
	lc_namespace = [
		"langchain",
		"output_parsers",
		"openai_functions"
	];
	lc_serializable = true;
	argsOnly = true;
	constructor(config) {
		super();
		this.argsOnly = config?.argsOnly ?? this.argsOnly;
	}
	/**
	* Parses the output and returns a string representation of the function
	* call or its arguments.
	* @param generations The output of the LLM to parse.
	* @returns A string representation of the function call or its arguments.
	*/
	async parseResult(generations) {
		if ("message" in generations[0]) {
			const gen = generations[0];
			const functionCall = gen.message.additional_kwargs.function_call;
			if (!functionCall) throw new Error(`No function_call in message ${JSON.stringify(generations)}`);
			if (!functionCall.arguments) throw new Error(`No arguments in function_call ${JSON.stringify(generations)}`);
			if (this.argsOnly) return functionCall.arguments;
			return JSON.stringify(functionCall);
		} else throw new Error(`No message in generations ${JSON.stringify(generations)}`);
	}
};
/**
* Class for parsing the output of an LLM into a JSON object. Uses an
* instance of `OutputFunctionsParser` to parse the output.
*/
var JsonOutputFunctionsParser = class extends __langchain_core_output_parsers.BaseCumulativeTransformOutputParser {
	static lc_name() {
		return "JsonOutputFunctionsParser";
	}
	lc_namespace = [
		"langchain",
		"output_parsers",
		"openai_functions"
	];
	lc_serializable = true;
	outputParser;
	argsOnly = true;
	constructor(config) {
		super(config);
		this.argsOnly = config?.argsOnly ?? this.argsOnly;
		this.outputParser = new OutputFunctionsParser(config);
	}
	_diff(prev, next) {
		if (!next) return void 0;
		const ops = (0, __langchain_core_utils_json_patch.compare)(prev ?? {}, next);
		return ops;
	}
	async parsePartialResult(generations) {
		const generation = generations[0];
		if (!generation.message) return void 0;
		const { message } = generation;
		const functionCall = message.additional_kwargs.function_call;
		if (!functionCall) return void 0;
		if (this.argsOnly) return (0, __langchain_core_output_parsers.parsePartialJson)(functionCall.arguments);
		return {
			...functionCall,
			arguments: (0, __langchain_core_output_parsers.parsePartialJson)(functionCall.arguments)
		};
	}
	/**
	* Parses the output and returns a JSON object. If `argsOnly` is true,
	* only the arguments of the function call are returned.
	* @param generations The output of the LLM to parse.
	* @returns A JSON object representation of the function call or its arguments.
	*/
	async parseResult(generations) {
		const result = await this.outputParser.parseResult(generations);
		if (!result) throw new Error(`No result from "OutputFunctionsParser" ${JSON.stringify(generations)}`);
		return this.parse(result);
	}
	async parse(text) {
		try {
			const parsedResult = JSON.parse(text);
			if (this.argsOnly) return parsedResult;
			parsedResult.arguments = JSON.parse(parsedResult.arguments);
			return parsedResult;
		} catch (e) {
			throw new __langchain_core_output_parsers.OutputParserException(`Failed to parse. Text: "${text}". Error: ${e}`);
		}
	}
	getFormatInstructions() {
		return "";
	}
};
/**
* Class for parsing the output of an LLM into a JSON object and returning
* a specific attribute. Uses an instance of `JsonOutputFunctionsParser`
* to parse the output.
*/
var JsonKeyOutputFunctionsParser = class extends __langchain_core_output_parsers.BaseLLMOutputParser {
	static lc_name() {
		return "JsonKeyOutputFunctionsParser";
	}
	lc_namespace = [
		"langchain",
		"output_parsers",
		"openai_functions"
	];
	lc_serializable = true;
	outputParser = new JsonOutputFunctionsParser();
	attrName;
	get lc_aliases() {
		return { attrName: "key_name" };
	}
	constructor(fields) {
		super(fields);
		this.attrName = fields.attrName;
	}
	/**
	* Parses the output and returns a specific attribute of the parsed JSON
	* object.
	* @param generations The output of the LLM to parse.
	* @returns The value of a specific attribute of the parsed JSON object.
	*/
	async parseResult(generations) {
		const result = await this.outputParser.parseResult(generations);
		return result[this.attrName];
	}
};

//#endregion
exports.JsonKeyOutputFunctionsParser = JsonKeyOutputFunctionsParser;
exports.JsonOutputFunctionsParser = JsonOutputFunctionsParser;
exports.OutputFunctionsParser = OutputFunctionsParser;
//# sourceMappingURL=openai_functions.cjs.map