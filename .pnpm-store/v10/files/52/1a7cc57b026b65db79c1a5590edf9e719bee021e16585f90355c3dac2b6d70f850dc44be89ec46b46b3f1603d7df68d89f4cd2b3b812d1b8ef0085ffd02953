const require_constants = require('../constants.cjs');
const require_state = require('../graph/state.cjs');
const require_tool_executor = require('./tool_executor.cjs');
let _langchain_core_runnables = require("@langchain/core/runnables");
let _langchain_core_messages = require("@langchain/core/messages");
let _langchain_core_utils_function_calling = require("@langchain/core/utils/function_calling");

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
	const toolsAsOpenAIFunctions = toolClasses.map((tool) => (0, _langchain_core_utils_function_calling.convertToOpenAIFunction)(tool));
	const newModel = model.bind({ functions: toolsAsOpenAIFunctions });
	const shouldContinue = (state) => {
		const { messages } = state;
		const lastMessage = messages[messages.length - 1];
		if (!("function_call" in lastMessage.additional_kwargs) || !lastMessage.additional_kwargs.function_call) return "end";
		return "continue";
	};
	const callModel = async (state, config) => {
		const { messages } = state;
		return { messages: [await newModel.invoke(messages, config)] };
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
		return { messages: [new _langchain_core_messages.FunctionMessage({
			content: await toolExecutor.invoke(action, config),
			name: action.tool
		})] };
	};
	return new require_state.StateGraph({ channels: { messages: {
		value: (x, y) => x.concat(y),
		default: () => []
	} } }).addNode("agent", new _langchain_core_runnables.RunnableLambda({ func: callModel })).addNode("action", new _langchain_core_runnables.RunnableLambda({ func: callTool })).addEdge(require_constants.START, "agent").addConditionalEdges("agent", shouldContinue, {
		continue: "action",
		end: require_constants.END
	}).addEdge("action", "agent").compile();
}

//#endregion
exports.createFunctionCallingExecutor = createFunctionCallingExecutor;
//# sourceMappingURL=chat_agent_executor.cjs.map