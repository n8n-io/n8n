const require_runtime = require('../../_virtual/_rolldown/runtime.cjs');
const require_chat_models_universal = require('../../chat_models/universal.cjs');
const require_middleware = require('../middleware.cjs');
let _langchain_core_messages = require("@langchain/core/messages");

//#region src/agents/middleware/toolEmulator.ts
/**
* Middleware that emulates specified tools using an LLM instead of executing them.
*
* This middleware allows selective emulation of tools for testing purposes.
* By default (when `tools` is undefined), all tools are emulated. You can specify
* which tools to emulate by passing a list of tool names or tool instances.
*
* @param options - Configuration options for the middleware
* @param options.tools - List of tool names or tool instances to emulate. If undefined, all tools are emulated.
* @param options.model - Model to use for emulation. Defaults to "anthropic:claude-sonnet-4-5-20250929".
*
* @example Emulate all tools (default behavior)
* ```ts
* import { toolEmulatorMiddleware } from "@langchain/langchain/agents/middleware";
* import { createAgent } from "@langchain/langchain/agents";
*
* const middleware = toolEmulatorMiddleware();
*
* const agent = createAgent({
*   model: "openai:gpt-4o",
*   tools: [getWeather, getUserLocation, calculator],
*   middleware: [middleware],
* });
* ```
*
* @example Emulate specific tools by name
* ```ts
* const middleware = toolEmulatorMiddleware({
*   tools: ["get_weather", "get_user_location"]
* });
* ```
*
* @example Use a custom model for emulation
* ```ts
* const middleware = toolEmulatorMiddleware({
*   tools: ["get_weather"],
*   model: "anthropic:claude-sonnet-4-5-20250929"
* });
* ```
*
* @example Emulate specific tools by passing tool instances
* ```ts
* const middleware = toolEmulatorMiddleware({
*   tools: [getWeather, getUserLocation]
* });
* ```
*/
function toolEmulatorMiddleware(options = {}) {
	let agentModel;
	const { tools, model } = options;
	/**
	* Extract tool names from tools
	*/
	const emulateAll = !tools || tools.length === 0;
	const toolsToEmulate = /* @__PURE__ */ new Set();
	if (!emulateAll && tools) for (const tool of tools) if (typeof tool === "string") toolsToEmulate.add(tool);
	else {
		const toolName = typeof tool.name === "string" ? tool.name : String(tool.name);
		toolsToEmulate.add(toolName);
	}
	/**
	* Initialize emulator model
	* We'll initialize it lazily in wrapToolCall to handle async initChatModel
	*/
	let emulatorModel;
	const getEmulatorModel = async () => {
		if (typeof model === "object") return model;
		if (typeof model === "string") {
			emulatorModel = emulatorModel ?? await require_chat_models_universal.initChatModel(model, { temperature: 1 }).catch((err) => {
				console.error("Error initializing emulator model, using agent model:", err);
				return agentModel;
			});
			return emulatorModel;
		}
		return agentModel;
	};
	return require_middleware.createMiddleware({
		name: "ToolEmulatorMiddleware",
		wrapModelCall: async (request, handler) => {
			agentModel = request.model;
			return handler(request);
		},
		wrapToolCall: async (request, handler) => {
			const toolName = request.toolCall.name;
			if (!(emulateAll || toolsToEmulate.has(toolName))) return handler(request);
			const toolArgs = request.toolCall.args;
			const prompt = `You are emulating a tool call for testing purposes.

Tool: ${toolName}
Description: ${request.tool?.description || "No description available"}
Arguments: ${typeof toolArgs === "string" ? toolArgs : JSON.stringify(toolArgs)}

Generate a realistic response that this tool would return given these arguments.
Return ONLY the tool's output, no explanation or preamble. Introduce variation into your responses.`;
			const response = await (await getEmulatorModel()).invoke([new _langchain_core_messages.HumanMessage(prompt)]);
			return new _langchain_core_messages.ToolMessage({
				content: typeof response.content === "string" ? response.content : JSON.stringify(response.content),
				tool_call_id: request.toolCall.id ?? "",
				name: toolName
			});
		}
	});
}

//#endregion
exports.toolEmulatorMiddleware = toolEmulatorMiddleware;
//# sourceMappingURL=toolEmulator.cjs.map