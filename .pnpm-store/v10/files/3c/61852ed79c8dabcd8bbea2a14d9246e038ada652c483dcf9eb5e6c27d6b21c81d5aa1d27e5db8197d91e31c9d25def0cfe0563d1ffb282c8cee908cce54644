const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_constants = require('../constants.cjs');
const require_state = require('../graph/state.cjs');
const require_tool_executor = require('./tool_executor.cjs');
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_utils_function_calling = require_rolldown_runtime.__toESM(require("@langchain/core/utils/function_calling"));

//#region src/prebuilt/chat_agent_executor.ts
/** @deprecated Use {@link createReactAgent} instead with tool calling. */
function createFunctionCallingExecutor({ model, tools }) {
	let toolExecutor;
	let toolClasses;
	if (!Array.isArray(tools)) {
		toolExecutor = tools;
		toolClasses = tools.tools;
	} else {
		toolExecutor = new require_tool_executor.ToolExecutor({ tools });
		toolClasses = tools;
	}
	if (!("bind" in model) || typeof model.bind !== "function") throw new Error("Model must be bindable");
	const toolsAsOpenAIFunctions = toolClasses.map((tool) => (0, __langchain_core_utils_function_calling.convertToOpenAIFunction)(tool));
	const newModel = model.bind({ functions: toolsAsOpenAIFunctions });
	const shouldContinue = (state) => {
		const { messages } = state;
		const lastMessage = messages[messages.length - 1];
		if (!("function_call" in lastMessage.additional_kwargs) || !lastMessage.additional_kwargs.function_call) return "end";
		return "continue";
	};
	const callModel = async (state, config) => {
		const { messages } = state;
		const response = await newModel.invoke(messages, config);
		return { messages: [response] };
	};
	const _getAction = (state) => {
		const { messages } = state;
		const lastMessage = messages[messages.length - 1];
		if (!lastMessage) throw new Error("No messages found.");
		if (!lastMessage.additional_kwargs.function_call) throw new Error("No function call found in message.");
		return {
			tool: lastMessage.additional_kwargs.function_call.name,
			toolInput: JSON.stringify(lastMessage.additional_kwargs.function_call.arguments),
			log: ""
		};
	};
	const callTool = async (state, config) => {
		const action = _getAction(state);
		const response = await toolExecutor.invoke(action, config);
		const functionMessage = new __langchain_core_messages.FunctionMessage({
			content: response,
			name: action.tool
		});
		return { messages: [functionMessage] };
	};
	const schema = { messages: {
		value: (x, y) => x.concat(y),
		default: () => []
	} };
	const workflow = new require_state.StateGraph({ channels: schema }).addNode("agent", new __langchain_core_runnables.RunnableLambda({ func: callModel })).addNode("action", new __langchain_core_runnables.RunnableLambda({ func: callTool })).addEdge(require_constants.START, "agent").addConditionalEdges("agent", shouldContinue, {
		continue: "action",
		end: require_constants.END
	}).addEdge("action", "agent");
	return workflow.compile();
}

//#endregion
exports.createFunctionCallingExecutor = createFunctionCallingExecutor;
//# sourceMappingURL=chat_agent_executor.cjs.map