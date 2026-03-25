import { BaseLLMOutputParser } from "@langchain/core/output_parsers";

//#region src/output_parsers/openai_tools.ts
/**
* @deprecated Import from "@langchain/core/output_parsers/openai_tools"
*/
var JsonOutputToolsParser = class extends BaseLLMOutputParser {
	static lc_name() {
		return "JsonOutputToolsParser";
	}
	returnId = false;
	lc_namespace = [
		"langchain",
		"output_parsers",
		"openai_tools"
	];
	lc_serializable = true;
	constructor(fields) {
		super(fields);
		this.returnId = fields?.returnId ?? this.returnId;
	}
	/**
	* Parses the output and returns a JSON object. If `argsOnly` is true,
	* only the arguments of the function call are returned.
	* @param generations The output of the LLM to parse.
	* @returns A JSON object representation of the function call or its arguments.
	*/
	async parseResult(generations) {
		const toolCalls = generations[0].message.additional_kwargs.tool_calls;
		if (!toolCalls) throw new Error(`No tools_call in message ${JSON.stringify(generations)}`);
		const clonedToolCalls = JSON.parse(JSON.stringify(toolCalls));
		const parsedToolCalls = [];
		for (const toolCall of clonedToolCalls) if (toolCall.function !== void 0) {
			const parsedToolCall = {
				type: toolCall.function.name,
				args: JSON.parse(toolCall.function.arguments)
			};
			if (this.returnId) parsedToolCall.id = toolCall.id;
			Object.defineProperty(parsedToolCall, "name", { get() {
				return this.type;
			} });
			Object.defineProperty(parsedToolCall, "arguments", { get() {
				return this.args;
			} });
			parsedToolCalls.push(parsedToolCall);
		}
		return parsedToolCalls;
	}
};
/**
* @deprecated Import from "@langchain/core/output_parsers/openai_tools"
*/
var JsonOutputKeyToolsParser = class extends BaseLLMOutputParser {
	static lc_name() {
		return "JsonOutputKeyToolsParser";
	}
	lc_namespace = [
		"langchain",
		"output_parsers",
		"openai_tools"
	];
	lc_serializable = true;
	returnId = false;
	/** The type of tool calls to return. */
	keyName;
	/** Whether to return only the first tool call. */
	returnSingle = false;
	initialParser;
	constructor(params) {
		super(params);
		this.keyName = params.keyName;
		this.returnSingle = params.returnSingle ?? this.returnSingle;
		this.initialParser = new JsonOutputToolsParser(params);
	}
	async parseResult(generations) {
		const results = await this.initialParser.parseResult(generations);
		const matchingResults = results.filter((result) => result.type === this.keyName);
		let returnedValues = matchingResults;
		if (!this.returnId) returnedValues = matchingResults.map((result) => result.args);
		if (this.returnSingle) return returnedValues[0];
		return returnedValues;
	}
};

//#endregion
export { JsonOutputKeyToolsParser, JsonOutputToolsParser };
//# sourceMappingURL=openai_tools.js.map