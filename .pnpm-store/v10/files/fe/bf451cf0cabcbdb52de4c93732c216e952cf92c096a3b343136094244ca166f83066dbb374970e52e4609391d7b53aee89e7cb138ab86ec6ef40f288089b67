import { isGraphInterrupt } from "../errors.js";
import { Command, END, _isSend, isCommand } from "../constants.js";
import { RunnableCallable } from "../utils.js";
import { ToolMessage, isAIMessage, isBaseMessage } from "@langchain/core/messages";

//#region src/prebuilt/tool_node.ts
const isBaseMessageArray = (input) => Array.isArray(input) && input.every(isBaseMessage);
const isMessagesState = (input) => typeof input === "object" && input != null && "messages" in input && isBaseMessageArray(input.messages);
const isSendInput = (input) => typeof input === "object" && input != null && "lg_tool_call" in input;
/**
* A node that runs the tools requested in the last AIMessage. It can be used
* either in StateGraph with a "messages" key or in MessageGraph. If multiple
* tool calls are requested, they will be run in parallel. The output will be
* a list of ToolMessages, one for each tool call.
*
* @example
* ```ts
* import { ToolNode } from "@langchain/langgraph/prebuilt";
* import { tool } from "@langchain/core/tools";
* import { z } from "zod";
* import { AIMessage } from "@langchain/core/messages";
*
* const getWeather = tool((input) => {
*   if (["sf", "san francisco"].includes(input.location.toLowerCase())) {
*     return "It's 60 degrees and foggy.";
*   } else {
*     return "It's 90 degrees and sunny.";
*   }
* }, {
*   name: "get_weather",
*   description: "Call to get the current weather.",
*   schema: z.object({
*     location: z.string().describe("Location to get the weather for."),
*   }),
* });
*
* const tools = [getWeather];
* const toolNode = new ToolNode(tools);
*
* const messageWithSingleToolCall = new AIMessage({
*   content: "",
*   tool_calls: [
*     {
*       name: "get_weather",
*       args: { location: "sf" },
*       id: "tool_call_id",
*       type: "tool_call",
*     }
*   ]
* })
*
* await toolNode.invoke({ messages: [messageWithSingleToolCall] });
* // Returns tool invocation responses as:
* // { messages: ToolMessage[] }
* ```
*
* @example
* ```ts
* import {
*   StateGraph,
*   MessagesAnnotation,
* } from "@langchain/langgraph";
* import { ToolNode } from "@langchain/langgraph/prebuilt";
* import { tool } from "@langchain/core/tools";
* import { z } from "zod";
* import { ChatAnthropic } from "@langchain/anthropic";
*
* const getWeather = tool((input) => {
*   if (["sf", "san francisco"].includes(input.location.toLowerCase())) {
*     return "It's 60 degrees and foggy.";
*   } else {
*     return "It's 90 degrees and sunny.";
*   }
* }, {
*   name: "get_weather",
*   description: "Call to get the current weather.",
*   schema: z.object({
*     location: z.string().describe("Location to get the weather for."),
*   }),
* });
*
* const tools = [getWeather];
* const modelWithTools = new ChatAnthropic({
*   model: "claude-3-haiku-20240307",
*   temperature: 0
* }).bindTools(tools);
*
* const toolNodeForGraph = new ToolNode(tools)
*
* const shouldContinue = (state: typeof MessagesAnnotation.State) => {
*   const { messages } = state;
*   const lastMessage = messages[messages.length - 1];
*   if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
*     return "tools";
*   }
*   return "__end__";
* }
*
* const callModel = async (state: typeof MessagesAnnotation.State) => {
*   const { messages } = state;
*   const response = await modelWithTools.invoke(messages);
*   return { messages: response };
* }
*
* const graph = new StateGraph(MessagesAnnotation)
*   .addNode("agent", callModel)
*   .addNode("tools", toolNodeForGraph)
*   .addEdge("__start__", "agent")
*   .addConditionalEdges("agent", shouldContinue)
*   .addEdge("tools", "agent")
*   .compile();
*
* const inputs = {
*   messages: [{ role: "user", content: "what is the weather in SF?" }],
* };
*
* const stream = await graph.stream(inputs, {
*   streamMode: "values",
* });
*
* for await (const { messages } of stream) {
*   console.log(messages);
* }
* // Returns the messages in the state at each step of execution
* ```
*/
var ToolNode = class extends RunnableCallable {
	tools;
	handleToolErrors = true;
	trace = false;
	constructor(tools, options) {
		const { name, tags, handleToolErrors } = options ?? {};
		super({
			name,
			tags,
			func: (input, config) => this.run(input, config)
		});
		this.tools = tools;
		this.handleToolErrors = handleToolErrors ?? this.handleToolErrors;
	}
	async runTool(call, config) {
		const tool = this.tools.find((tool$1) => tool$1.name === call.name);
		try {
			if (tool === void 0) throw new Error(`Tool "${call.name}" not found.`);
			const output = await tool.invoke({
				...call,
				type: "tool_call"
			}, config);
			if (isBaseMessage(output) && output.getType() === "tool" || isCommand(output)) return output;
			return new ToolMessage({
				status: "success",
				name: tool.name,
				content: typeof output === "string" ? output : JSON.stringify(output),
				tool_call_id: call.id
			});
		} catch (e) {
			if (!this.handleToolErrors) throw e;
			if (isGraphInterrupt(e)) throw e;
			return new ToolMessage({
				status: "error",
				content: `Error: ${e.message}\n Please fix your mistakes.`,
				name: call.name,
				tool_call_id: call.id ?? ""
			});
		}
	}
	async run(input, config) {
		let outputs;
		if (isSendInput(input)) outputs = [await this.runTool(input.lg_tool_call, config)];
		else {
			let messages;
			if (isBaseMessageArray(input)) messages = input;
			else if (isMessagesState(input)) messages = input.messages;
			else throw new Error("ToolNode only accepts BaseMessage[] or { messages: BaseMessage[] } as input.");
			const toolMessageIds = new Set(messages.filter((msg) => msg.getType() === "tool").map((msg) => msg.tool_call_id));
			let aiMessage;
			for (let i = messages.length - 1; i >= 0; i -= 1) {
				const message = messages[i];
				if (isAIMessage(message)) {
					aiMessage = message;
					break;
				}
			}
			if (aiMessage == null || !isAIMessage(aiMessage)) throw new Error("ToolNode only accepts AIMessages as input.");
			outputs = await Promise.all(aiMessage.tool_calls?.filter((call) => call.id == null || !toolMessageIds.has(call.id)).map((call) => this.runTool(call, config)) ?? []);
		}
		if (!outputs.some(isCommand)) return Array.isArray(input) ? outputs : { messages: outputs };
		const combinedOutputs = [];
		let parentCommand = null;
		for (const output of outputs) if (isCommand(output)) if (output.graph === Command.PARENT && Array.isArray(output.goto) && output.goto.every((send) => _isSend(send))) if (parentCommand) parentCommand.goto.push(...output.goto);
		else parentCommand = new Command({
			graph: Command.PARENT,
			goto: output.goto
		});
		else combinedOutputs.push(output);
		else combinedOutputs.push(Array.isArray(input) ? [output] : { messages: [output] });
		if (parentCommand) combinedOutputs.push(parentCommand);
		return combinedOutputs;
	}
};
/**
* @deprecated Use new `ToolNode` from {@link https://www.npmjs.com/package/langchain langchain} package instead.
*/
function toolsCondition(state) {
	const message = Array.isArray(state) ? state[state.length - 1] : state.messages[state.messages.length - 1];
	if (message !== void 0 && "tool_calls" in message && (message.tool_calls?.length ?? 0) > 0) return "tools";
	else return END;
}

//#endregion
export { ToolNode, toolsCondition };
//# sourceMappingURL=tool_node.js.map