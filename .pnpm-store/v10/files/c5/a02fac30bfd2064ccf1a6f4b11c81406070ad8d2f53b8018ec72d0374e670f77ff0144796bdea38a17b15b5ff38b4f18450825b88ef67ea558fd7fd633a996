import { isInteropZodSchema } from "@langchain/core/utils/types";
import { toJsonSchema } from "@langchain/core/utils/json_schema";
import { isOpenAITool } from "@langchain/core/language_models/base";
import { isLangChainTool } from "@langchain/core/utils/function_calling";

//#region src/utils/tools.ts
function isBedrockTool(tool) {
	if (typeof tool === "object" && tool && "toolSpec" in tool) return true;
	return false;
}
function convertToConverseTools(tools) {
	return tools.map((tool, index) => {
		if (isOpenAITool(tool)) return { toolSpec: {
			name: tool.function.name,
			description: tool.function.description,
			inputSchema: { json: tool.function.parameters }
		} };
		else if (isLangChainTool(tool)) return { toolSpec: {
			name: tool.name,
			description: tool.description,
			inputSchema: { json: isInteropZodSchema(tool.schema) ? toJsonSchema(tool.schema) : tool.schema }
		} };
		else if (isBedrockTool(tool)) return tool;
		const toolInfo = typeof tool === "object" && tool !== null ? `Tool at index ${index}: ${JSON.stringify(tool, null, 2)}` : `Tool at index ${index}: ${String(tool)}`;
		throw new Error(`Invalid tool passed at index ${index}. Must be a StructuredToolInterface, ToolDefinition, or BedrockTool. ${toolInfo}`);
	});
}
function convertToBedrockToolChoice(toolChoice, tools, fields) {
	const supportsToolChoiceValues = fields.supportsToolChoiceValues ?? [];
	let bedrockToolChoice;
	if (typeof toolChoice === "string") switch (toolChoice) {
		case "any":
			bedrockToolChoice = { any: {} };
			break;
		case "auto":
			bedrockToolChoice = { auto: {} };
			break;
		default: {
			const foundTool = tools.find((tool) => tool.toolSpec?.name === toolChoice);
			if (!foundTool) throw new Error(`Tool with name ${toolChoice} not found in tools list.`);
			bedrockToolChoice = { tool: { name: toolChoice } };
		}
	}
	else bedrockToolChoice = toolChoice;
	const toolChoiceType = Object.keys(bedrockToolChoice)[0];
	if (!supportsToolChoiceValues.includes(toolChoiceType)) {
		let supportedTxt = "";
		if (supportsToolChoiceValues.length) supportedTxt = `Model ${fields.model} does not currently support 'tool_choice' of type ${toolChoiceType}. The following 'tool_choice' types are supported: ${supportsToolChoiceValues.join(", ")}.`;
		else supportedTxt = `Model ${fields.model} does not currently support 'tool_choice'.`;
		throw new Error(`${supportedTxt} Please seehttps://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ToolChoice.htmlfor the latest documentation on models that support tool choice.`);
	}
	return bedrockToolChoice;
}
function supportedToolChoiceValuesForModel(model) {
	if (model.includes("claude-3") || model.includes("claude-4") || model.includes("claude-opus-4") || model.includes("claude-sonnet-4")) return [
		"auto",
		"any",
		"tool"
	];
	if (model.includes("mistral-large")) return ["auto", "any"];
	return void 0;
}

//#endregion
export { convertToBedrockToolChoice, convertToConverseTools, supportedToolChoiceValuesForModel };
//# sourceMappingURL=tools.js.map