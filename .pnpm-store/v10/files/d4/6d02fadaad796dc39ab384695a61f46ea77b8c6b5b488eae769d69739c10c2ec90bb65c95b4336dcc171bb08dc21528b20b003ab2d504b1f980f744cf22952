import { END, START } from "../constants.js";
import { StateGraph } from "../graph/state.js";
import { ToolExecutor } from "./tool_executor.js";
import { RunnableLambda } from "@langchain/core/runnables";
import { FunctionMessage } from "@langchain/core/messages";
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";

//#region src/prebuilt/chat_agent_executor.ts
/** @deprecated Use {@link createReactAgent} instead with tool calling. */
function createFunctionCallingExecutor({ model, tools }) {
	let toolExecutor;
	let toolClasses;
	if (!Array.isArray(tools)) {
		toolExecutor = tools;
		toolClasses = tools.tools;
	} else {
		toolExecutor = new ToolExecutor({ tools });
		toolClasses = tools;
	}
	if (!("bind" in model) || typeof model.bind !== "function") throw new Error("Model must be bindable");
	const toolsAsOpenAIFunctions = toolClasses.map((tool) => convertToOpenAIFunction(tool));
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
		return { messages: [new FunctionMessage({
			content: await toolExecutor.invoke(action, config),
			name: action.tool
		})] };
	};
	return new StateGraph({ channels: { messages: {
		value: (x, y) => x.concat(y),
		default: () => []
	} } }).addNode("agent", new RunnableLambda({ func: callModel })).addNode("action", new RunnableLambda({ func: callTool })).addEdge(START, "agent").addConditionalEdges("agent", shouldContinue, {
		continue: "action",
		end: END
	}).addEdge("action", "agent").compile();
}

//#endregion
export { createFunctionCallingExecutor };
//# sourceMappingURL=chat_agent_executor.js.map