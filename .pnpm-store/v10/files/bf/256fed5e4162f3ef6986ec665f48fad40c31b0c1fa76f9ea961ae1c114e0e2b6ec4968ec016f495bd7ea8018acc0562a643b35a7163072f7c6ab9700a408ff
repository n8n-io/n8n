const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));
const __langchain_core_utils_types = require_rolldown_runtime.__toESM(require("@langchain/core/utils/types"));

//#region src/output_parsers.ts
var AnthropicToolsOutputParser = class extends __langchain_core_output_parsers.BaseLLMOutputParser {
	static lc_name() {
		return "AnthropicToolsOutputParser";
	}
	lc_namespace = [
		"langchain",
		"anthropic",
		"output_parsers"
	];
	returnId = false;
	/** The type of tool calls to return. */
	keyName;
	/** Whether to return only the first tool call. */
	returnSingle = false;
	zodSchema;
	constructor(params) {
		super(params);
		this.keyName = params.keyName;
		this.returnSingle = params.returnSingle ?? this.returnSingle;
		this.zodSchema = params.zodSchema;
	}
	async _validateResult(result) {
		let parsedResult = result;
		if (typeof result === "string") try {
			parsedResult = JSON.parse(result);
		} catch (e) {
			throw new __langchain_core_output_parsers.OutputParserException(`Failed to parse. Text: "${JSON.stringify(result, null, 2)}". Error: ${JSON.stringify(e.message)}`, result);
		}
		else parsedResult = result;
		if (this.zodSchema === void 0) return parsedResult;
		const zodParsedResult = await (0, __langchain_core_utils_types.interopSafeParseAsync)(this.zodSchema, parsedResult);
		if (zodParsedResult.success) return zodParsedResult.data;
		else throw new __langchain_core_output_parsers.OutputParserException(`Failed to parse. Text: "${JSON.stringify(result, null, 2)}". Error: ${JSON.stringify(zodParsedResult.error.issues)}`, JSON.stringify(parsedResult, null, 2));
	}
	async parseResult(generations) {
		const tools = generations.flatMap((generation) => {
			const { message } = generation;
			if (!Array.isArray(message.content)) return [];
			const tool$1 = extractToolCalls(message.content)[0];
			return tool$1;
		});
		if (tools[0] === void 0) throw new Error("No parseable tool calls provided to AnthropicToolsOutputParser.");
		const [tool] = tools;
		const validatedResult = await this._validateResult(tool.args);
		return validatedResult;
	}
};
function extractToolCalls(content) {
	const toolCalls = [];
	for (const block of content) if (block.type === "tool_use") toolCalls.push({
		name: block.name,
		args: block.input,
		id: block.id,
		type: "tool_call"
	});
	return toolCalls;
}

//#endregion
exports.AnthropicToolsOutputParser = AnthropicToolsOutputParser;
exports.extractToolCalls = extractToolCalls;
//# sourceMappingURL=output_parsers.cjs.map