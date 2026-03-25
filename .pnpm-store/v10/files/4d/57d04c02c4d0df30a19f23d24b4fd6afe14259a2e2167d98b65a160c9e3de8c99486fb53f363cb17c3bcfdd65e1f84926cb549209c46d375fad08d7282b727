import { ToolInvocationError } from "../errors.js";
import { RunnableCallable } from "../RunnableCallable.js";
import { mergeAbortSignals } from "./utils.js";
import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { ToolInputParsingException } from "@langchain/core/tools";
import { Command, Send, isCommand, isGraphInterrupt } from "@langchain/langgraph";

//#region src/agents/nodes/ToolNode.ts
/**
* Error message template for when middleware adds tools that can't be executed.
* This happens when middleware modifies tools in wrapModelCall but doesn't provide
* a wrapToolCall handler to execute them.
*/
const getInvalidToolError = (toolName, availableTools) => `Error: ${toolName} is not a valid tool, try one of [${availableTools.join(", ")}].`;
/**
* The name of the tool node in the state graph.
*/
const TOOLS_NODE_NAME = "tools";
const isBaseMessageArray = (input) => Array.isArray(input) && input.every(BaseMessage.isInstance);
const isMessagesState = (input) => typeof input === "object" && input != null && "messages" in input && isBaseMessageArray(input.messages);
const isSendInput = (input) => typeof input === "object" && input != null && "lg_tool_call" in input;
/**
* Default error handler for tool errors.
*
* This is applied to errors from baseHandler (tool execution).
* For errors from wrapToolCall middleware, those are handled separately
* and will bubble up by default.
*
* Catches all tool execution errors and converts them to ToolMessage.
* This allows the LLM to see the error and potentially retry with different arguments.
*/
function defaultHandleToolErrors(error, toolCall) {
	if (error instanceof ToolInvocationError) return new ToolMessage({
		content: error.message,
		tool_call_id: toolCall.id,
		name: toolCall.name
	});
	/**
	* Catch all other tool errors and convert to ToolMessage
	*/
	return new ToolMessage({
		content: `${error}\n Please fix your mistakes.`,
		tool_call_id: toolCall.id,
		name: toolCall.name
	});
}
/**
* `ToolNode` is a built-in LangGraph component that handles tool calls within an agent's workflow.
* It works seamlessly with `createAgent`, offering advanced tool execution control, built
* in parallelism, and error handling.
*
* @example
* ```ts
* import { ToolNode, tool, AIMessage } from "langchain";
* import { z } from "zod/v3";
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
*/
var ToolNode = class extends RunnableCallable {
	tools;
	trace = false;
	signal;
	handleToolErrors = defaultHandleToolErrors;
	wrapToolCall;
	constructor(tools, options) {
		const { name, tags, handleToolErrors, signal, wrapToolCall } = options ?? {};
		super({
			name,
			tags,
			func: (state, config) => this.run(state, config)
		});
		this.options = options;
		this.tools = tools;
		this.handleToolErrors = handleToolErrors ?? this.handleToolErrors;
		this.signal = signal;
		this.wrapToolCall = wrapToolCall;
	}
	/**
	* Handle errors from tool execution or middleware.
	* @param error - The error to handle
	* @param call - The tool call that caused the error
	* @param isMiddlewareError - Whether the error came from wrapToolCall middleware
	* @returns ToolMessage if error is handled, otherwise re-throws
	*/
	#handleError(error, call, isMiddlewareError) {
		/**
		* {@link NodeInterrupt} errors are a breakpoint to bring a human into the loop.
		* As such, they are not recoverable by the agent and shouldn't be fed
		* back. Instead, re-throw these errors even when `handleToolErrors = true`.
		*/
		if (isGraphInterrupt(error)) throw error;
		/**
		* If the signal is aborted, we want to bubble up the error to the invoke caller.
		*/
		if (this.signal?.aborted) throw error;
		/**
		* If error is from middleware and handleToolErrors is not true, bubble up
		* (default handler and false both re-raise middleware errors)
		*/
		if (isMiddlewareError && this.handleToolErrors !== true) throw error;
		/**
		* If handleToolErrors is false, throw all errors
		*/
		if (!this.handleToolErrors) throw error;
		/**
		* Apply handleToolErrors to the error
		*/
		if (typeof this.handleToolErrors === "function") {
			const result = this.handleToolErrors(error, call);
			if (result && ToolMessage.isInstance(result)) return result;
			/**
			* `handleToolErrors` returned undefined - re-raise
			*/
			throw error;
		} else if (this.handleToolErrors) return new ToolMessage({
			name: call.name,
			content: `${error}\n Please fix your mistakes.`,
			tool_call_id: call.id
		});
		/**
		* Shouldn't reach here, but throw as fallback
		*/
		throw error;
	}
	async runTool(call, config, state) {
		/**
		* Build runtime from LangGraph config
		*/
		const lgConfig = config;
		const runtime = {
			context: lgConfig?.context,
			writer: lgConfig?.writer,
			interrupt: lgConfig?.interrupt,
			signal: lgConfig?.signal
		};
		/**
		* Find the tool instance to include in the request.
		* For dynamically registered tools, this may be undefined.
		*/
		const registeredTool = this.tools.find((t) => t.name === call.name);
		/**
		* Define the base handler that executes the tool.
		* When wrapToolCall middleware is present, this handler does NOT catch errors
		* so the middleware can handle them.
		* When no middleware, errors are caught and handled here.
		*
		* The handler now accepts an overridden tool from the request, allowing
		* middleware to provide tool implementations for dynamically registered tools.
		*/
		const baseHandler = async (request) => {
			const { toolCall, tool: requestTool } = request;
			/**
			* Use the tool from the request (which may be overridden via spread syntax)
			* or fall back to finding it in registered tools.
			* This allows middleware to provide dynamic tool implementations.
			*/
			const tool = requestTool ?? this.tools.find((t) => t.name === toolCall.name);
			if (tool === void 0) {
				/**
				* Tool not found - return a graceful error message rather than throwing.
				* This allows the LLM to see the error and potentially retry.
				*/
				const availableTools = this.tools.map((t) => t.name);
				return new ToolMessage({
					content: getInvalidToolError(toolCall.name, availableTools),
					tool_call_id: toolCall.id,
					name: toolCall.name,
					status: "error"
				});
			}
			/**
			* Cast tool to a common invokable type.
			* The tool can be from registered tools (StructuredToolInterface | DynamicTool | RunnableToolLike)
			* or from middleware override (ClientTool | ServerTool).
			*/
			const invokableTool = tool;
			try {
				const output = await invokableTool.invoke({
					...toolCall,
					type: "tool_call"
				}, {
					...config,
					config,
					toolCallId: toolCall.id,
					state: config.configurable?.__pregel_scratchpad?.currentTaskInput,
					signal: mergeAbortSignals(this.signal, config.signal)
				});
				if (ToolMessage.isInstance(output) || isCommand(output)) return output;
				return new ToolMessage({
					name: invokableTool.name,
					content: typeof output === "string" ? output : JSON.stringify(output),
					tool_call_id: toolCall.id
				});
			} catch (e) {
				/**
				* Handle errors from tool execution (not from wrapToolCall)
				* If tool invocation fails due to input parsing error, throw a {@link ToolInvocationError}
				*/
				if (e instanceof ToolInputParsingException) throw new ToolInvocationError(e, toolCall);
				/**
				* Re-throw to be handled by caller
				*/
				throw e;
			}
		};
		/**
		* Create request object for middleware
		* Cast to ToolCallRequest<AgentBuiltInState> to satisfy type constraints
		* of wrapToolCall which expects AgentBuiltInState
		*/
		const request = {
			toolCall: call,
			tool: registeredTool,
			state,
			runtime
		};
		/**
		* If wrapToolCall is provided, use it to wrap the tool execution
		*/
		if (this.wrapToolCall) try {
			return await this.wrapToolCall(request, baseHandler);
		} catch (e) {
			/**
			* Handle middleware errors
			*/
			return this.#handleError(e, call, true);
		}
		/**
		* No wrapToolCall - if tool wasn't found, return graceful error
		*/
		if (!registeredTool) {
			const availableTools = this.tools.map((t) => t.name);
			return new ToolMessage({
				content: getInvalidToolError(call.name, availableTools),
				tool_call_id: call.id,
				name: call.name,
				status: "error"
			});
		}
		/**
		* No wrapToolCall - execute tool directly and handle errors here
		*/
		try {
			return await baseHandler(request);
		} catch (e) {
			/**
			* Handle tool errors when no middleware provided
			*/
			return this.#handleError(e, call, false);
		}
	}
	async run(state, config) {
		let outputs;
		if (isSendInput(state)) {
			const { lg_tool_call: _, jumpTo: __, ...newState } = state;
			outputs = [await this.runTool(state.lg_tool_call, config, newState)];
		} else {
			let messages;
			if (isBaseMessageArray(state)) messages = state;
			else if (isMessagesState(state)) messages = state.messages;
			else throw new Error("ToolNode only accepts BaseMessage[] or { messages: BaseMessage[] } as input.");
			const toolMessageIds = new Set(messages.filter((msg) => msg.getType() === "tool").map((msg) => msg.tool_call_id));
			let aiMessage;
			for (let i = messages.length - 1; i >= 0; i -= 1) {
				const message = messages[i];
				if (AIMessage.isInstance(message)) {
					aiMessage = message;
					break;
				}
			}
			if (!AIMessage.isInstance(aiMessage)) throw new Error("ToolNode only accepts AIMessages as input.");
			outputs = await Promise.all(aiMessage.tool_calls?.filter((call) => call.id == null || !toolMessageIds.has(call.id)).map((call) => this.runTool(call, config, state)) ?? []);
		}
		if (!outputs.some(isCommand)) return Array.isArray(state) ? outputs : { messages: outputs };
		const combinedOutputs = [];
		let parentCommand = null;
		for (const output of outputs) if (isCommand(output)) if (output.graph === Command.PARENT && Array.isArray(output.goto) && output.goto.every((send) => isSend(send))) if (parentCommand) parentCommand.goto.push(...output.goto);
		else parentCommand = new Command({
			graph: Command.PARENT,
			goto: output.goto
		});
		else combinedOutputs.push(output);
		else combinedOutputs.push(Array.isArray(state) ? [output] : { messages: [output] });
		if (parentCommand) combinedOutputs.push(parentCommand);
		return combinedOutputs;
	}
};
function isSend(x) {
	return x instanceof Send;
}

//#endregion
export { TOOLS_NODE_NAME, ToolNode };
//# sourceMappingURL=ToolNode.js.map