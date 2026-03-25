import { AgentMultiActionOutputParser } from "../types.js";
import { OutputParserException } from "@langchain/core/output_parsers";
import { isBaseMessage } from "@langchain/core/messages";

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
				throw new OutputParserException(`Failed to parse tool arguments from chat model response. Text: "${JSON.stringify(toolCalls)}". ${e}`);
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
var ToolCallingAgentOutputParser = class extends AgentMultiActionOutputParser {
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
		if ("message" in generations[0] && isBaseMessage(generations[0].message)) return parseAIMessageToToolAction(generations[0].message);
		throw new Error("parseResult on ToolCallingAgentOutputParser only works on ChatGeneration output");
	}
	getFormatInstructions() {
		throw new Error("getFormatInstructions not implemented inside ToolCallingAgentOutputParser.");
	}
};

//#endregion
export { ToolCallingAgentOutputParser };
//# sourceMappingURL=output_parser.js.map