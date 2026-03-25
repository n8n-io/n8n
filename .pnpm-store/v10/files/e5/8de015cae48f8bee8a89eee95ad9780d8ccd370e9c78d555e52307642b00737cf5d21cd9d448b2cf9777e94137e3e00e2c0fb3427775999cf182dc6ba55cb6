const require_constants = require('../constants.cjs');
const require_annotation = require('../graph/annotation.cjs');
const require_messages_reducer = require('../graph/messages_reducer.cjs');
const require_state = require('../graph/state.cjs');
require('../graph/index.cjs');
const require_tool_node = require('./tool_node.cjs');
const require_agentName = require('./agentName.cjs');
let _langchain_core_runnables = require("@langchain/core/runnables");
let _langchain_core_messages = require("@langchain/core/messages");

//#region src/prebuilt/react_agent_executor.ts
function _convertMessageModifierToPrompt(messageModifier) {
	if (typeof messageModifier === "string" || (0, _langchain_core_messages.isBaseMessage)(messageModifier) && messageModifier._getType() === "system") return messageModifier;
	if (typeof messageModifier === "function") return async (state) => messageModifier(state.messages);
	if (_langchain_core_runnables.Runnable.isRunnable(messageModifier)) return _langchain_core_runnables.RunnableLambda.from((state) => state.messages).pipe(messageModifier);
	throw new Error(`Unexpected type for messageModifier: ${typeof messageModifier}`);
}
const PROMPT_RUNNABLE_NAME = "prompt";
function _getPromptRunnable(prompt) {
	let promptRunnable;
	if (prompt == null) promptRunnable = _langchain_core_runnables.RunnableLambda.from((state) => state.messages).withConfig({ runName: PROMPT_RUNNABLE_NAME });
	else if (typeof prompt === "string") {
		const systemMessage = new _langchain_core_messages.SystemMessage(prompt);
		promptRunnable = _langchain_core_runnables.RunnableLambda.from((state) => {
			return [systemMessage, ...state.messages ?? []];
		}).withConfig({ runName: PROMPT_RUNNABLE_NAME });
	} else if ((0, _langchain_core_messages.isBaseMessage)(prompt) && prompt._getType() === "system") promptRunnable = _langchain_core_runnables.RunnableLambda.from((state) => [prompt, ...state.messages]).withConfig({ runName: PROMPT_RUNNABLE_NAME });
	else if (typeof prompt === "function") promptRunnable = _langchain_core_runnables.RunnableLambda.from(prompt).withConfig({ runName: PROMPT_RUNNABLE_NAME });
	else if (_langchain_core_runnables.Runnable.isRunnable(prompt)) promptRunnable = prompt;
	else throw new Error(`Got unexpected type for 'prompt': ${typeof prompt}`);
	return promptRunnable;
}
function isClientTool(tool) {
	return _langchain_core_runnables.Runnable.isRunnable(tool);
}
function _getPrompt(prompt, stateModifier, messageModifier) {
	if ([
		prompt,
		stateModifier,
		messageModifier
	].filter((x) => x != null).length > 1) throw new Error("Expected only one of prompt, stateModifier, or messageModifier, got multiple values");
	let finalPrompt = prompt;
	if (stateModifier != null) finalPrompt = stateModifier;
	else if (messageModifier != null) finalPrompt = _convertMessageModifierToPrompt(messageModifier);
	return _getPromptRunnable(finalPrompt);
}
function _isBaseChatModel(model) {
	return "invoke" in model && typeof model.invoke === "function" && "_modelType" in model;
}
function _isConfigurableModel(model) {
	return "_queuedMethodOperations" in model && "_model" in model && typeof model._model === "function";
}
function _isChatModelWithBindTools(llm) {
	if (!_isBaseChatModel(llm)) return false;
	return "bindTools" in llm && typeof llm.bindTools === "function";
}
async function _shouldBindTools(llm, tools) {
	let model = llm;
	if (_langchain_core_runnables.RunnableSequence.isRunnableSequence(model)) model = model.steps.find((step) => _langchain_core_runnables.RunnableBinding.isRunnableBinding(step) || _isBaseChatModel(step) || _isConfigurableModel(step)) || model;
	if (_isConfigurableModel(model)) model = await model._model();
	if (!_langchain_core_runnables.RunnableBinding.isRunnableBinding(model)) return true;
	let boundTools = (() => {
		if (model.kwargs != null && typeof model.kwargs === "object" && "tools" in model.kwargs && Array.isArray(model.kwargs.tools)) return model.kwargs.tools ?? null;
		if (model.config != null && typeof model.config === "object" && "tools" in model.config && Array.isArray(model.config.tools)) return model.config.tools ?? null;
		return null;
	})();
	if (boundTools != null && boundTools.length === 1 && "functionDeclarations" in boundTools[0]) boundTools = boundTools[0].functionDeclarations;
	if (boundTools == null) return true;
	if (tools.length !== boundTools.length) throw new Error("Number of tools in the model.bindTools() and tools passed to createReactAgent must match");
	const toolNames = new Set(tools.flatMap((tool) => isClientTool(tool) ? tool.name : []));
	const boundToolNames = /* @__PURE__ */ new Set();
	for (const boundTool of boundTools) {
		let boundToolName;
		if ("type" in boundTool && boundTool.type === "function") boundToolName = boundTool.function.name;
		else if ("name" in boundTool) boundToolName = boundTool.name;
		else if ("toolSpec" in boundTool && "name" in boundTool.toolSpec) boundToolName = boundTool.toolSpec.name;
		else continue;
		if (boundToolName) boundToolNames.add(boundToolName);
	}
	const missingTools = [...toolNames].filter((x) => !boundToolNames.has(x));
	if (missingTools.length > 0) throw new Error(`Missing tools '${missingTools}' in the model.bindTools().Tools in the model.bindTools() must match the tools passed to createReactAgent.`);
	return false;
}
const _simpleBindTools = (llm, toolClasses) => {
	if (_isChatModelWithBindTools(llm)) return llm.bindTools(toolClasses);
	if (_langchain_core_runnables.RunnableBinding.isRunnableBinding(llm) && _isChatModelWithBindTools(llm.bound)) {
		const newBound = llm.bound.bindTools(toolClasses);
		if (_langchain_core_runnables.RunnableBinding.isRunnableBinding(newBound)) return new _langchain_core_runnables.RunnableBinding({
			bound: newBound.bound,
			config: {
				...llm.config,
				...newBound.config
			},
			kwargs: {
				...llm.kwargs,
				...newBound.kwargs
			},
			configFactories: newBound.configFactories ?? llm.configFactories
		});
		return new _langchain_core_runnables.RunnableBinding({
			bound: newBound,
			config: llm.config,
			kwargs: llm.kwargs,
			configFactories: llm.configFactories
		});
	}
	return null;
};
async function _bindTools(llm, toolClasses) {
	const model = _simpleBindTools(llm, toolClasses);
	if (model) return model;
	if (_isConfigurableModel(llm)) {
		const model = _simpleBindTools(await llm._model(), toolClasses);
		if (model) return model;
	}
	if (_langchain_core_runnables.RunnableSequence.isRunnableSequence(llm)) {
		const modelStep = llm.steps.findIndex((step) => _langchain_core_runnables.RunnableBinding.isRunnableBinding(step) || _isBaseChatModel(step) || _isConfigurableModel(step));
		if (modelStep >= 0) {
			const model = _simpleBindTools(llm.steps[modelStep], toolClasses);
			if (model) {
				const nextSteps = llm.steps.slice();
				nextSteps.splice(modelStep, 1, model);
				return _langchain_core_runnables.RunnableSequence.from(nextSteps);
			}
		}
	}
	throw new Error(`llm ${llm} must define bindTools method.`);
}
async function _getModel(llm) {
	let model = llm;
	if (_langchain_core_runnables.RunnableSequence.isRunnableSequence(model)) model = model.steps.find((step) => _langchain_core_runnables.RunnableBinding.isRunnableBinding(step) || _isBaseChatModel(step) || _isConfigurableModel(step)) || model;
	if (_isConfigurableModel(model)) model = await model._model();
	if (_langchain_core_runnables.RunnableBinding.isRunnableBinding(model)) model = model.bound;
	if (!_isBaseChatModel(model)) throw new Error(`Expected \`llm\` to be a ChatModel or RunnableBinding (e.g. llm.bind_tools(...)) with invoke() and generate() methods, got ${model.constructor.name}`);
	return model;
}
const createReactAgentAnnotation = () => require_annotation.Annotation.Root({
	messages: require_annotation.Annotation({
		reducer: require_messages_reducer.messagesStateReducer,
		default: () => []
	}),
	structuredResponse: require_annotation.Annotation
});
const PreHookAnnotation = require_annotation.Annotation.Root({ llmInputMessages: require_annotation.Annotation({
	reducer: (_, update) => require_messages_reducer.messagesStateReducer([], update),
	default: () => []
}) });
/**
* @deprecated `createReactAgent` has been moved to {@link https://www.npmjs.com/package/langchain langchain} package.
* Update your import to `import { createAgent } from "langchain";`
*
* Creates a StateGraph agent that relies on a chat model utilizing tool calling.
*
* @example
* ```ts
* import { ChatOpenAI } from "@langchain/openai";
* import { tool } from "@langchain/core/tools";
* import { z } from "zod";
* import { createReactAgent } from "@langchain/langgraph/prebuilt";
*
* const model = new ChatOpenAI({
*   model: "gpt-4o",
* });
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
*   })
* })
*
* const agent = createReactAgent({ llm: model, tools: [getWeather] });
*
* const inputs = {
*   messages: [{ role: "user", content: "what is the weather in SF?" }],
* };
*
* const stream = await agent.stream(inputs, { streamMode: "values" });
*
* for await (const { messages } of stream) {
*   console.log(messages);
* }
* // Returns the messages in the state at each step of execution
* ```
*/
function createReactAgent(params) {
	const { llm, tools, messageModifier, stateModifier, prompt, stateSchema, contextSchema, checkpointSaver, checkpointer, interruptBefore, interruptAfter, store, responseFormat, preModelHook, postModelHook, name, description, version = "v1", includeAgentName } = params;
	let toolClasses;
	let toolNode;
	if (!Array.isArray(tools)) {
		toolClasses = tools.tools;
		toolNode = tools;
	} else {
		toolClasses = tools;
		toolNode = new require_tool_node.ToolNode(toolClasses.filter(isClientTool));
	}
	let cachedStaticModel = null;
	const _getStaticModel = async (llm) => {
		if (cachedStaticModel) return cachedStaticModel;
		let modelWithTools;
		if (await _shouldBindTools(llm, toolClasses)) modelWithTools = await _bindTools(llm, toolClasses);
		else modelWithTools = llm;
		const promptRunnable = _getPrompt(prompt, stateModifier, messageModifier);
		const modelRunnable = includeAgentName === "inline" ? require_agentName.withAgentName(modelWithTools, includeAgentName) : modelWithTools;
		cachedStaticModel = promptRunnable.pipe(modelRunnable);
		return cachedStaticModel;
	};
	const _getDynamicModel = async (llm, state, config) => {
		const model = await llm(state, config);
		return _getPrompt(prompt, stateModifier, messageModifier).pipe(includeAgentName === "inline" ? require_agentName.withAgentName(model, includeAgentName) : model);
	};
	const shouldReturnDirect = new Set(toolClasses.filter(isClientTool).filter((tool) => "returnDirect" in tool && tool.returnDirect).map((tool) => tool.name));
	function getModelInputState(state) {
		const { messages, llmInputMessages, ...rest } = state;
		if (llmInputMessages != null && llmInputMessages.length > 0) return {
			messages: llmInputMessages,
			...rest
		};
		return {
			messages,
			...rest
		};
	}
	const generateStructuredResponse = async (state, config) => {
		if (responseFormat == null) throw new Error("Attempted to generate structured output with no passed response schema. Please contact us for help.");
		const messages = [...state.messages];
		let modelWithStructuredOutput;
		const model = typeof llm === "function" ? await llm(state, config) : await _getModel(llm);
		if (!_isBaseChatModel(model)) throw new Error(`Expected \`llm\` to be a ChatModel with .withStructuredOutput() method, got ${model.constructor.name}`);
		if (typeof responseFormat === "object" && "schema" in responseFormat) {
			const { prompt, schema, ...options } = responseFormat;
			modelWithStructuredOutput = model.withStructuredOutput(schema, options);
			if (prompt != null) messages.unshift(new _langchain_core_messages.SystemMessage({ content: prompt }));
		} else modelWithStructuredOutput = model.withStructuredOutput(responseFormat);
		return { structuredResponse: await modelWithStructuredOutput.invoke(messages, config) };
	};
	const callModel = async (state, config) => {
		const response = await (typeof llm === "function" ? await _getDynamicModel(llm, state, config) : await _getStaticModel(llm)).invoke(getModelInputState(state), config);
		response.name = name;
		response.lc_kwargs.name = name;
		return { messages: [response] };
	};
	const workflow = new require_state.StateGraph(stateSchema ?? createReactAgentAnnotation(), contextSchema).addNode("tools", toolNode);
	if (!("messages" in workflow._schemaDefinition)) throw new Error("Missing required `messages` key in state schema.");
	const allNodeWorkflows = workflow;
	const conditionalMap = (map) => {
		return Object.fromEntries(Object.entries(map).filter(([_, v]) => v != null));
	};
	let entrypoint = "agent";
	let inputSchema;
	if (preModelHook != null) {
		allNodeWorkflows.addNode("pre_model_hook", preModelHook).addEdge("pre_model_hook", "agent");
		entrypoint = "pre_model_hook";
		inputSchema = require_annotation.Annotation.Root({
			...workflow._schemaDefinition,
			...PreHookAnnotation.spec
		});
	} else entrypoint = "agent";
	allNodeWorkflows.addNode("agent", callModel, { input: inputSchema }).addEdge(require_constants.START, entrypoint);
	if (postModelHook != null) allNodeWorkflows.addNode("post_model_hook", postModelHook).addEdge("agent", "post_model_hook").addConditionalEdges("post_model_hook", (state) => {
		const { messages } = state;
		const toolMessageIds = new Set(messages.filter(_langchain_core_messages.isToolMessage).map((msg) => msg.tool_call_id));
		let lastAiMessage;
		for (let i = messages.length - 1; i >= 0; i -= 1) {
			const message = messages[i];
			if ((0, _langchain_core_messages.isAIMessage)(message)) {
				lastAiMessage = message;
				break;
			}
		}
		const pendingToolCalls = lastAiMessage?.tool_calls?.filter((i) => i.id == null || !toolMessageIds.has(i.id)) ?? [];
		const lastMessage = messages[messages.length - 1];
		if (pendingToolCalls.length > 0) {
			if (version === "v2") return pendingToolCalls.map((toolCall) => new require_constants.Send("tools", {
				...state,
				lg_tool_call: toolCall
			}));
			return "tools";
		}
		if (lastMessage && (0, _langchain_core_messages.isToolMessage)(lastMessage)) return entrypoint;
		if (responseFormat != null) return "generate_structured_response";
		return require_constants.END;
	}, conditionalMap({
		tools: "tools",
		[entrypoint]: entrypoint,
		generate_structured_response: responseFormat != null ? "generate_structured_response" : null,
		[require_constants.END]: responseFormat != null ? null : require_constants.END
	}));
	if (responseFormat !== void 0) workflow.addNode("generate_structured_response", generateStructuredResponse).addEdge("generate_structured_response", require_constants.END);
	if (postModelHook == null) allNodeWorkflows.addConditionalEdges("agent", (state) => {
		const { messages } = state;
		const lastMessage = messages[messages.length - 1];
		if (!(0, _langchain_core_messages.isAIMessage)(lastMessage) || !lastMessage.tool_calls?.length) {
			if (responseFormat != null) return "generate_structured_response";
			return require_constants.END;
		}
		if (version === "v2") return lastMessage.tool_calls.map((toolCall) => new require_constants.Send("tools", {
			...state,
			lg_tool_call: toolCall
		}));
		return "tools";
	}, conditionalMap({
		tools: "tools",
		generate_structured_response: responseFormat != null ? "generate_structured_response" : null,
		[require_constants.END]: responseFormat != null ? null : require_constants.END
	}));
	if (shouldReturnDirect.size > 0) allNodeWorkflows.addConditionalEdges("tools", (state) => {
		const agentState = state;
		for (let i = agentState.messages.length - 1; i >= 0; i -= 1) {
			const message = agentState.messages[i];
			if (!(0, _langchain_core_messages.isToolMessage)(message)) break;
			if (message.name !== void 0 && shouldReturnDirect.has(message.name)) return require_constants.END;
		}
		return entrypoint;
	}, conditionalMap({
		[entrypoint]: entrypoint,
		[require_constants.END]: require_constants.END
	}));
	else allNodeWorkflows.addEdge("tools", entrypoint);
	return allNodeWorkflows.compile({
		checkpointer: checkpointer ?? checkpointSaver,
		interruptBefore,
		interruptAfter,
		store,
		name,
		description
	});
}

//#endregion
exports.createReactAgent = createReactAgent;
exports.createReactAgentAnnotation = createReactAgentAnnotation;
//# sourceMappingURL=react_agent_executor.cjs.map