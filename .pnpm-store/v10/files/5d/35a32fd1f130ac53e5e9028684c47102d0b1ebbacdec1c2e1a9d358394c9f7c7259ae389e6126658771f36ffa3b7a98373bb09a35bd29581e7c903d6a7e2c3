import { BaseLLMOutputParser, OutputParserException } from "@langchain/core/output_parsers";
import { interopSafeParseAsync } from "@langchain/core/utils/types";

//#region src/output_parsers.ts
var AnthropicToolsOutputParser = class extends BaseLLMOutputParser {
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
			throw new OutputParserException(`Failed to parse. Text: "${JSON.stringify(result, null, 2)}". Error: ${JSON.stringify(e.message)}`, result);
		}
		else parsedResult = result;
		if (this.zodSchema === void 0) return parsedResult;
		const zodParsedResult = await interopSafeParseAsync(this.zodSchema, parsedResult);
		if (zodParsedResult.success) return zodParsedResult.data;
		else throw new OutputParserException(`Failed to parse. Text: "${JSON.stringify(result, null, 2)}". Error: ${JSON.stringify(zodParsedResult.error.issues)}`, JSON.stringify(parsedResult, null, 2));
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
export { AnthropicToolsOutputParser, extractToolCalls };
//# sourceMappingURL=output_parsers.js.map