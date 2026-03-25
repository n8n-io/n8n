import { initChatModel } from "../../chat_models/universal.js";
import { MiddlewareError, MultipleStructuredOutputsError } from "../errors.js";
import { bindTools, hasToolCalls, isClientTool, validateLLMHasNoBoundTools } from "../utils.js";
import { RunnableCallable } from "../RunnableCallable.js";
import { mergeAbortSignals, toPartialZodObject } from "./utils.js";
import { withAgentName } from "../withAgentName.js";
import { ProviderStrategy, ToolStrategy, transformResponseFormat } from "../responses.js";
import { AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { raceWithSignal } from "@langchain/core/runnables";
import { Command, isCommand } from "@langchain/langgraph";
import { getSchemaDescription, interopParse } from "@langchain/core/utils/types";

//#region src/agents/nodes/AgentNode.ts
/**
* Check if the response is an internal model response.
* @param response - The response to check.
* @returns True if the response is an internal model response, false otherwise.
*/
function isInternalModelResponse(response) {
	return AIMessage.isInstance(response) || isCommand(response) || typeof response === "object" && response !== null && "structuredResponse" in response && "messages" in response;
}
/**
* The name of the agent node in the state graph.
*/
const AGENT_NODE_NAME = "model_request";
var AgentNode = class extends RunnableCallable {
	#options;
	#systemMessage;
	constructor(options) {
		super({
			name: options.name ?? "model",
			func: (input, config) => this.#run(input, config)
		});
		this.#options = options;
		this.#systemMessage = options.systemMessage;
	}
	/**
	* Returns response format primtivies based on given model and response format provided by the user.
	*
	* If the user selects a tool output:
	* - return a record of tools to extract structured output from the model's response
	*
	* if the the user selects a native schema output or if the model supports JSON schema output:
	* - return a provider strategy to extract structured output from the model's response
	*
	* @param model - The model to get the response format for.
	* @returns The response format.
	*/
	#getResponseFormat(model) {
		if (!this.#options.responseFormat) return;
		const strategies = transformResponseFormat(this.#options.responseFormat, void 0, model);
		/**
		* Populate a list of structured tool info.
		*/
		if (!strategies.every((format) => format instanceof ProviderStrategy)) return {
			type: "tool",
			tools: strategies.filter((format) => format instanceof ToolStrategy).reduce((acc, format) => {
				acc[format.name] = format;
				return acc;
			}, {})
		};
		return {
			type: "native",
			strategy: strategies[0]
		};
	}
	async #run(state, config) {
		/**
		* Check if we just executed a returnDirect tool
		* If so, we should generate structured response (if needed) and stop
		*/
		const lastMessage = state.messages.at(-1);
		if (lastMessage && ToolMessage.isInstance(lastMessage) && lastMessage.name && this.#options.shouldReturnDirect.has(lastMessage.name)) return [new Command({ update: { messages: [] } })];
		const { response, lastAiMessage, collectedCommands } = await this.#invokeModel(state, config);
		/**
		* structuredResponse — return as a plain state update dict (not a Command)
		* because the structuredResponse channel uses UntrackedValue(guard=true)
		* which only allows a single write per step.
		*/
		if (typeof response === "object" && response !== null && "structuredResponse" in response && "messages" in response) {
			const { structuredResponse, messages } = response;
			return {
				messages: [...state.messages, ...messages],
				structuredResponse
			};
		}
		const commands = [];
		const aiMessage = AIMessage.isInstance(response) ? response : lastAiMessage;
		if (aiMessage) {
			aiMessage.name = this.name;
			aiMessage.lc_kwargs.name = this.name;
			if (this.#areMoreStepsNeeded(state, aiMessage)) commands.push(new Command({ update: { messages: [new AIMessage({
				content: "Sorry, need more steps to process this request.",
				name: this.name,
				id: aiMessage.id
			})] } }));
			else commands.push(new Command({ update: { messages: [aiMessage] } }));
		}
		if (isCommand(response) && !collectedCommands.includes(response)) commands.push(response);
		commands.push(...collectedCommands);
		return commands;
	}
	/**
	* Derive the model from the options.
	* @param state - The state of the agent.
	* @param config - The config of the agent.
	* @returns The model.
	*/
	#deriveModel() {
		if (typeof this.#options.model === "string") return initChatModel(this.#options.model);
		if (this.#options.model) return this.#options.model;
		throw new Error("No model option was provided, either via `model` option.");
	}
	async #invokeModel(state, config, options = {}) {
		const model = await this.#deriveModel();
		const lgConfig = config;
		/**
		* Create a local variable for current system message to avoid concurrency issues
		* Each invocation gets its own copy
		*/
		let currentSystemMessage = this.#systemMessage;
		/**
		* Shared tracking state for AIMessage and Command collection.
		* lastAiMessage tracks the effective AIMessage through the middleware chain.
		* collectedCommands accumulates Commands returned by middleware (not base handler).
		*/
		let lastAiMessage = null;
		const collectedCommands = [];
		/**
		* Create the base handler that performs the actual model invocation
		*/
		const baseHandler = async (request) => {
			/**
			* Check if the LLM already has bound tools and throw if it does.
			*/
			validateLLMHasNoBoundTools(request.model);
			const structuredResponseFormat = this.#getResponseFormat(request.model);
			const modelWithTools = await this.#bindTools(request.model, request, structuredResponseFormat);
			/**
			* prepend the system message to the messages if it is not empty
			*/
			const messages = [...currentSystemMessage.text === "" ? [] : [currentSystemMessage], ...request.messages];
			const signal = mergeAbortSignals(this.#options.signal, config.signal);
			const response = await raceWithSignal(modelWithTools.invoke(messages, {
				...config,
				signal
			}), signal);
			lastAiMessage = response;
			/**
			* if the user requests a native schema output, try to parse the response
			* and return the structured response if it is valid
			*/
			if (structuredResponseFormat?.type === "native") {
				const structuredResponse = structuredResponseFormat.strategy.parse(response);
				if (structuredResponse) return {
					structuredResponse,
					messages: [response]
				};
				return response;
			}
			if (!structuredResponseFormat || !response.tool_calls) return response;
			const toolCalls = response.tool_calls.filter((call) => call.name in structuredResponseFormat.tools);
			/**
			* if there were not structured tool calls, we can return the response
			*/
			if (toolCalls.length === 0) return response;
			/**
			* if there were multiple structured tool calls, we should throw an error as this
			* scenario is not defined/supported.
			*/
			if (toolCalls.length > 1) return this.#handleMultipleStructuredOutputs(response, toolCalls, structuredResponseFormat);
			const toolMessageContent = structuredResponseFormat.tools[toolCalls[0].name]?.options?.toolMessageContent;
			return this.#handleSingleStructuredOutput(response, toolCalls[0], structuredResponseFormat, toolMessageContent ?? options.lastMessage);
		};
		const wrapperMiddleware = this.#options.wrapModelCallHookMiddleware ?? [];
		let wrappedHandler = baseHandler;
		/**
		* Build composed handler from last to first so first middleware becomes outermost
		*/
		for (let i = wrapperMiddleware.length - 1; i >= 0; i--) {
			const [middleware, getMiddlewareState] = wrapperMiddleware[i];
			if (middleware.wrapModelCall) {
				const innerHandler = wrappedHandler;
				const currentMiddleware = middleware;
				const currentGetState = getMiddlewareState;
				wrappedHandler = async (request) => {
					const baselineSystemMessage = currentSystemMessage;
					/**
					* Merge context with default context of middleware
					*/
					const context = currentMiddleware.contextSchema ? interopParse(currentMiddleware.contextSchema, lgConfig?.context || {}) : lgConfig?.context;
					/**
					* Create runtime
					*/
					const runtime = Object.freeze({
						context,
						store: lgConfig.store,
						configurable: lgConfig.configurable,
						writer: lgConfig.writer,
						interrupt: lgConfig.interrupt,
						signal: lgConfig.signal
					});
					/**
					* Create the request with state and runtime
					*/
					const requestWithStateAndRuntime = {
						...request,
						state: {
							...middleware.stateSchema ? interopParse(toPartialZodObject(middleware.stateSchema), state) : {},
							...currentGetState(),
							messages: state.messages
						},
						runtime
					};
					/**
					* Create handler that validates tools and calls the inner handler
					*/
					const handlerWithValidation = async (req) => {
						currentSystemMessage = baselineSystemMessage;
						/**
						* Verify that the user didn't add any new tools.
						* We can't allow this as the ToolNode is already initiated with given tools.
						*/
						const modifiedTools = req.tools ?? [];
						const newTools = modifiedTools.filter((tool) => isClientTool(tool) && !this.#options.toolClasses.some((t) => t.name === tool.name));
						if (newTools.length > 0) throw new Error(`You have added a new tool in "wrapModelCall" hook of middleware "${currentMiddleware.name}": ${newTools.map((tool) => tool.name).join(", ")}. This is not supported.`);
						/**
						* Verify that user has not added or modified a tool with the same name.
						* We can't allow this as the ToolNode is already initiated with given tools.
						*/
						const invalidTools = modifiedTools.filter((tool) => isClientTool(tool) && this.#options.toolClasses.every((t) => t !== tool));
						if (invalidTools.length > 0) throw new Error(`You have modified a tool in "wrapModelCall" hook of middleware "${currentMiddleware.name}": ${invalidTools.map((tool) => tool.name).join(", ")}. This is not supported.`);
						let normalizedReq = req;
						const hasSystemPromptChanged = req.systemPrompt !== currentSystemMessage.text;
						const hasSystemMessageChanged = req.systemMessage !== currentSystemMessage;
						if (hasSystemPromptChanged && hasSystemMessageChanged) throw new Error("Cannot change both systemPrompt and systemMessage in the same request.");
						/**
						* Check if systemPrompt is a string was changed, if so create a new SystemMessage
						*/
						if (hasSystemPromptChanged) {
							currentSystemMessage = new SystemMessage({ content: [{
								type: "text",
								text: req.systemPrompt
							}] });
							normalizedReq = {
								...req,
								systemPrompt: currentSystemMessage.text,
								systemMessage: currentSystemMessage
							};
						}
						/**
						* If the systemMessage was changed, update the current system message
						*/
						if (hasSystemMessageChanged) {
							currentSystemMessage = new SystemMessage({ ...req.systemMessage });
							normalizedReq = {
								...req,
								systemPrompt: currentSystemMessage.text,
								systemMessage: currentSystemMessage
							};
						}
						const innerHandlerResult = await innerHandler(normalizedReq);
						/**
						* Normalize Commands so middleware always sees AIMessage from handler().
						* When an inner handler (base handler or nested middleware) returns a
						* Command (e.g. structured-output retry), substitute the tracked
						* lastAiMessage so the middleware sees an AIMessage, and collect the
						* raw Command so the framework can still propagate it (e.g. for retries).
						*
						* Only collect if not already present: Commands from inner middleware
						* are already tracked via the middleware validation layer (line ~627).
						*/
						if (isCommand(innerHandlerResult) && lastAiMessage) {
							if (!collectedCommands.includes(innerHandlerResult)) collectedCommands.push(innerHandlerResult);
							return lastAiMessage;
						}
						return innerHandlerResult;
					};
					if (!currentMiddleware.wrapModelCall) return handlerWithValidation(requestWithStateAndRuntime);
					try {
						const middlewareResponse = await currentMiddleware.wrapModelCall(requestWithStateAndRuntime, handlerWithValidation);
						/**
						* Validate that this specific middleware returned a valid response
						*/
						if (!isInternalModelResponse(middlewareResponse)) throw new Error(`Invalid response from "wrapModelCall" in middleware "${currentMiddleware.name}": expected AIMessage or Command, got ${typeof middlewareResponse}`);
						if (AIMessage.isInstance(middlewareResponse)) lastAiMessage = middlewareResponse;
						else if (isCommand(middlewareResponse)) collectedCommands.push(middlewareResponse);
						return middlewareResponse;
					} catch (error) {
						throw MiddlewareError.wrap(error, currentMiddleware.name);
					}
				};
			}
		}
		/**
		* Execute the wrapped handler with the initial request
		* Reset current system prompt to initial state and convert to string using .text getter
		* for backwards compatibility with ModelRequest
		*/
		currentSystemMessage = this.#systemMessage;
		const initialRequest = {
			model,
			systemPrompt: currentSystemMessage?.text,
			systemMessage: currentSystemMessage,
			messages: state.messages,
			tools: this.#options.toolClasses,
			state,
			runtime: Object.freeze({
				context: lgConfig?.context,
				store: lgConfig.store,
				configurable: lgConfig.configurable,
				writer: lgConfig.writer,
				interrupt: lgConfig.interrupt,
				signal: lgConfig.signal
			})
		};
		return {
			response: await wrappedHandler(initialRequest),
			lastAiMessage,
			collectedCommands
		};
	}
	/**
	* If the model returns multiple structured outputs, we need to handle it.
	* @param response - The response from the model
	* @param toolCalls - The tool calls that were made
	* @returns The response from the model
	*/
	#handleMultipleStructuredOutputs(response, toolCalls, responseFormat) {
		const multipleStructuredOutputsError = new MultipleStructuredOutputsError(toolCalls.map((call) => call.name));
		return this.#handleToolStrategyError(multipleStructuredOutputsError, response, toolCalls[0], responseFormat);
	}
	/**
	* If the model returns a single structured output, we need to handle it.
	* @param toolCall - The tool call that was made
	* @returns The structured response and a message to the LLM if needed
	*/
	#handleSingleStructuredOutput(response, toolCall, responseFormat, lastMessage) {
		const tool = responseFormat.tools[toolCall.name];
		try {
			const structuredResponse = tool.parse(toolCall.args);
			return {
				structuredResponse,
				messages: [
					response,
					new ToolMessage({
						tool_call_id: toolCall.id ?? "",
						content: JSON.stringify(structuredResponse),
						name: toolCall.name
					}),
					new AIMessage(lastMessage ?? `Returning structured response: ${JSON.stringify(structuredResponse)}`)
				]
			};
		} catch (error) {
			return this.#handleToolStrategyError(error, response, toolCall, responseFormat);
		}
	}
	async #handleToolStrategyError(error, response, toolCall, responseFormat) {
		/**
		* Using the `errorHandler` option of the first `ToolStrategy` entry is sufficient here.
		* There is technically only one `ToolStrategy` entry in `structuredToolInfo` if the user
		* uses `toolStrategy` to define the response format. If the user applies a list of json
		* schema objects, these will be transformed into multiple `ToolStrategy` entries but all
		* with the same `handleError` option.
		*/
		const errorHandler = Object.values(responseFormat.tools).at(0)?.options?.handleError;
		const toolCallId = toolCall.id;
		if (!toolCallId) throw new Error("Tool call ID is required to handle tool output errors. Please provide a tool call ID.");
		/**
		* Default behavior: retry if `errorHandler` is undefined or truthy.
		* Only throw if explicitly set to `false`.
		*/
		if (errorHandler === false) throw error;
		/**
		* retry if:
		*/
		if (errorHandler === void 0 || typeof errorHandler === "boolean" && errorHandler || Array.isArray(errorHandler) && errorHandler.some((h) => h instanceof MultipleStructuredOutputsError)) return new Command({
			update: { messages: [response, new ToolMessage({
				content: error.message,
				tool_call_id: toolCallId
			})] },
			goto: AGENT_NODE_NAME
		});
		/**
		* if `errorHandler` is a string, retry the tool call with given string
		*/
		if (typeof errorHandler === "string") return new Command({
			update: { messages: [response, new ToolMessage({
				content: errorHandler,
				tool_call_id: toolCallId
			})] },
			goto: AGENT_NODE_NAME
		});
		/**
		* if `errorHandler` is a function, retry the tool call with the function
		*/
		if (typeof errorHandler === "function") {
			const content = await errorHandler(error);
			if (typeof content !== "string") throw new Error("Error handler must return a string.");
			return new Command({
				update: { messages: [response, new ToolMessage({
					content,
					tool_call_id: toolCallId
				})] },
				goto: AGENT_NODE_NAME
			});
		}
		/**
		* Default: retry if we reach here
		*/
		return new Command({
			update: { messages: [response, new ToolMessage({
				content: error.message,
				tool_call_id: toolCallId
			})] },
			goto: AGENT_NODE_NAME
		});
	}
	#areMoreStepsNeeded(state, response) {
		const allToolsReturnDirect = AIMessage.isInstance(response) && response.tool_calls?.every((call) => this.#options.shouldReturnDirect.has(call.name));
		const remainingSteps = "remainingSteps" in state ? state.remainingSteps : void 0;
		return Boolean(remainingSteps && (remainingSteps < 1 && allToolsReturnDirect || remainingSteps < 2 && hasToolCalls(state.messages.at(-1))));
	}
	async #bindTools(model, preparedOptions, structuredResponseFormat) {
		const options = {};
		const structuredTools = Object.values(structuredResponseFormat && "tools" in structuredResponseFormat ? structuredResponseFormat.tools : {});
		/**
		* Use tools from preparedOptions if provided, otherwise use default tools
		*/
		const allTools = [...preparedOptions?.tools ?? this.#options.toolClasses, ...structuredTools.map((toolStrategy) => toolStrategy.tool)];
		/**
		* If there are structured tools, we need to set the tool choice to "any"
		* so that the model can choose to use a structured tool or not.
		*/
		const toolChoice = preparedOptions?.toolChoice || (structuredTools.length > 0 ? "any" : void 0);
		/**
		* check if the user requests a native schema output
		*/
		if (structuredResponseFormat?.type === "native") {
			const resolvedStrict = preparedOptions?.modelSettings?.strict ?? structuredResponseFormat?.strategy?.strict ?? true;
			const jsonSchemaParams = {
				name: structuredResponseFormat.strategy.schema?.name ?? "extract",
				description: getSchemaDescription(structuredResponseFormat.strategy.schema),
				schema: structuredResponseFormat.strategy.schema,
				strict: resolvedStrict
			};
			Object.assign(options, {
				response_format: {
					type: "json_schema",
					json_schema: jsonSchemaParams
				},
				outputConfig: { format: {
					type: "json_schema",
					schema: structuredResponseFormat.strategy.schema
				} },
				ls_structured_output_format: {
					kwargs: { method: "json_schema" },
					schema: structuredResponseFormat.strategy.schema
				},
				strict: resolvedStrict
			});
		}
		/**
		* Bind tools to the model if they are not already bound.
		*/
		const modelWithTools = await bindTools(model, allTools, {
			...options,
			...preparedOptions?.modelSettings,
			tool_choice: toolChoice
		});
		return this.#options.includeAgentName === "inline" ? withAgentName(modelWithTools, this.#options.includeAgentName) : modelWithTools;
	}
	/**
	* Returns internal bookkeeping state for StateManager, not graph output.
	* The return shape differs from the node's output type (Command).
	*/
	getState() {
		const state = super.getState();
		return {
			messages: [],
			...state && !isCommand(state) ? state : {}
		};
	}
};

//#endregion
export { AGENT_NODE_NAME, AgentNode };
//# sourceMappingURL=AgentNode.js.map