const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_types = require('../types.cjs');
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/agents/tool_calling/output_parser.ts
function parseAIMessageToToolAction(message) {
	const stringifiedMessageContent = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
	let toolCalls = [];
	if (message.tool_calls !== void 0 && message.tool_calls.length > 0) toolCalls = message.tool_calls;
	else {
		if (!message.additional_kwargs.tool_calls || message.additional_kwargs.tool_calls.length === 0) return {
			returnValues: { output: message.content },
			log: stringifiedMessageContent
		};
		for (const toolCall of message.additional_kwargs.tool_calls ?? []) {
			const functionName = toolCall.function?.name;
			try {
				const args = JSON.parse(toolCall.function.arguments);
				toolCalls.push({
					name: functionName,
					args,
					id: toolCall.id
				});
			} catch (e) {
				throw new __langchain_core_output_parsers.OutputParserException(`Failed to parse tool arguments from chat model response. Text: "${JSON.stringify(toolCalls)}". ${e}`);
			}
		}
	}
	return toolCalls.map((toolCall, i) => {
		const messageLog = i === 0 ? [message] : [];
		const log = `Invoking "${toolCall.name}" with ${JSON.stringify(toolCall.args ?? {})}\n${stringifiedMessageContent}`;
		return {
			tool: toolCall.name,
			toolInput: toolCall.args,
			toolCallId: toolCall.id ?? "",
			log,
			messageLog
		};
	});
}
var ToolCallingAgentOutputParser = class extends require_types.AgentMultiActionOutputParser {
	lc_namespace = [
		"langchain",
		"agents",
		"tool_calling"
	];
	static lc_name() {
		return "ToolCallingAgentOutputParser";
	}
	async parse(text) {
		throw new Error(`ToolCallingAgentOutputParser can only parse messages.\nPassed input: ${text}`);
	}
	async parseResult(generations) {
		if ("message" in generations[0] && (0, __langchain_core_messages.isBaseMessage)(generations[0].message)) return parseAIMessageToToolAction(generations[0].message);
		throw new Error("parseResult on ToolCallingAgentOutputParser only works on ChatGeneration output");
	}
	getFormatInstructions() {
		throw new Error("getFormatInstructions not implemented inside ToolCallingAgentOutputParser.");
	}
};

//#endregion
exports.ToolCallingAgentOutputParser = ToolCallingAgentOutputParser;
//# sourceMappingURL=output_parser.cjs.map