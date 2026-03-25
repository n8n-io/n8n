const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_ibm = require('../utils/ibm.cjs');
const __langchain_core_language_models_chat_models = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/chat_models"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));
const __langchain_core_output_parsers_openai_tools = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers/openai_tools"));
const __langchain_core_utils_async_caller = require_rolldown_runtime.__toESM(require("@langchain/core/utils/async_caller"));
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));
const __langchain_core_utils_types = require_rolldown_runtime.__toESM(require("@langchain/core/utils/types"));
const __langchain_core_utils_json_schema = require_rolldown_runtime.__toESM(require("@langchain/core/utils/json_schema"));

//#region src/chat_models/ibm.ts
var ibm_exports = {};
require_rolldown_runtime.__export(ibm_exports, { ChatWatsonx: () => ChatWatsonx });
function _convertToValidToolId(model, tool_call_id) {
	if (model.startsWith("mistralai") && tool_call_id) return require_ibm._convertToolCallIdToMistralCompatible(tool_call_id);
	return tool_call_id;
}
function _convertToolToWatsonxTool(tools) {
	return tools.map((tool) => {
		if ("type" in tool) return tool;
		const parameters = (0, __langchain_core_utils_types.isInteropZodSchema)(tool.schema) ? (0, __langchain_core_utils_json_schema.toJsonSchema)(tool.schema) : tool.schema;
		return {
			type: "function",
			function: {
				name: tool.name,
				description: tool.description ?? `Tool: ${tool.name}`,
				parameters
			}
		};
	});
}
const MESSAGE_TYPE_TO_ROLE_MAP = {
	human: "user",
	ai: "assistant",
	system: "system",
	tool: "tool",
	function: "function",
	generic: "assistant",
	developer: "developer",
	remove: "function"
};
const getRole = (role) => {
	const watsonRole = MESSAGE_TYPE_TO_ROLE_MAP[role];
	if (!watsonRole) throw new Error(`Unknown message type: ${role}`);
	return watsonRole;
};
const getToolCalls = (message, model) => {
	if ((0, __langchain_core_messages.isAIMessage)(message) && message.tool_calls?.length) return message.tool_calls.map((toolCall) => ({
		...toolCall,
		id: _convertToValidToolId(model ?? "", toolCall.id ?? "")
	})).map(__langchain_core_output_parsers_openai_tools.convertLangChainToolCallToOpenAI);
	return void 0;
};
function _convertMessagesToWatsonxMessages(messages, model) {
	return messages.map((message) => {
		const toolCalls = getToolCalls(message, model);
		const content = toolCalls === void 0 ? message.content : "";
		if ("tool_call_id" in message && typeof message.tool_call_id === "string") return {
			role: getRole(message.getType()),
			content,
			name: message.name,
			tool_call_id: _convertToValidToolId(model ?? "", message.tool_call_id)
		};
		return {
			role: getRole(message.getType()),
			content,
			tool_calls: toolCalls
		};
	});
}
function _watsonxResponseToChatMessage(choice, rawDataId, usage) {
	const { message } = choice;
	if (!message) throw new Error("No message presented");
	const rawToolCalls = message.tool_calls ?? [];
	switch (message.role) {
		case "assistant": {
			const toolCalls = [];
			const invalidToolCalls = [];
			for (const rawToolCall of rawToolCalls) try {
				const parsed = (0, __langchain_core_output_parsers_openai_tools.parseToolCall)(rawToolCall, { returnId: true });
				toolCalls.push(parsed);
			} catch (e) {
				invalidToolCalls.push((0, __langchain_core_output_parsers_openai_tools.makeInvalidToolCall)(rawToolCall, e.message));
			}
			const additional_kwargs = {
				tool_calls: rawToolCalls.map((toolCall) => ({
					...toolCall,
					type: "function"
				})),
				..."reasoning_content" in message ? { reasoning: message?.reasoning_content } : {}
			};
			return new __langchain_core_messages.AIMessage({
				id: rawDataId,
				content: message.content ?? "",
				tool_calls: toolCalls,
				invalid_tool_calls: invalidToolCalls,
				additional_kwargs,
				usage_metadata: usage ? {
					input_tokens: usage.prompt_tokens ?? 0,
					output_tokens: usage.completion_tokens ?? 0,
					total_tokens: usage.total_tokens ?? 0
				} : void 0
			});
		}
		default: return new __langchain_core_messages.ChatMessage(message.content ?? "", message.role ?? "unknown");
	}
}
function _convertDeltaToMessageChunk(helperIndex, delta, rawData, model, usage, defaultRole) {
	if (delta.refusal) throw new Error(delta.refusal);
	const rawToolCalls = delta.tool_calls?.length ? delta.tool_calls?.map((toolCall, index) => {
		const validId = toolCall.id && toolCall.id !== "" ? _convertToValidToolId(model ?? "", toolCall.id) : void 0;
		if (toolCall.id) helperIndex.value += 1;
		return {
			index: delta?.tool_calls && delta?.tool_calls?.length > 1 ? index : helperIndex.value,
			...toolCall,
			...validId !== null && { id: validId },
			type: "function"
		};
	}) : void 0;
	const role = delta.role || defaultRole || "assistant";
	const content = delta.content ?? "";
	const additional_kwargs = {
		...rawToolCalls ? { tool_calls: rawToolCalls } : {},
		..."reasoning_content" in delta ? { reasoning: delta?.reasoning_content } : {}
	};
	const usageMetadata = {
		input_tokens: usage?.prompt_tokens ?? 0,
		output_tokens: usage?.completion_tokens ?? 0,
		total_tokens: usage?.total_tokens ?? 0
	};
	switch (role) {
		case "user": return new __langchain_core_messages.HumanMessageChunk({ content });
		case "assistant": {
			const toolCallChunks = [];
			if (rawToolCalls && rawToolCalls?.length > 0) for (const rawToolCallChunk of rawToolCalls) {
				const toolCallName = rawToolCallChunk.function.name;
				toolCallChunks.push({
					name: toolCallName.length > 0 ? toolCallName : void 0,
					args: rawToolCallChunk.function?.arguments,
					id: rawToolCallChunk.id,
					index: rawToolCallChunk.index,
					type: "tool_call_chunk"
				});
			}
			return new __langchain_core_messages.AIMessageChunk({
				content,
				tool_call_chunks: toolCallChunks,
				additional_kwargs,
				usage_metadata: usageMetadata,
				id: rawData.id
			});
		}
		case "tool":
			if (rawToolCalls) return new __langchain_core_messages.ToolMessageChunk({
				content,
				additional_kwargs,
				tool_call_id: _convertToValidToolId(model ?? "", rawToolCalls[0].id)
			});
			return null;
		case "function": return new __langchain_core_messages.FunctionMessageChunk({
			content,
			additional_kwargs
		});
		default: return new __langchain_core_messages.ChatMessageChunk({
			content,
			role
		});
	}
}
function _convertToolChoiceToWatsonxToolChoice(toolChoice) {
	if (typeof toolChoice === "string") if (toolChoice === "any" || toolChoice === "required") return { toolChoiceOption: "required" };
	else if (toolChoice === "auto" || toolChoice === "none") return { toolChoiceOption: toolChoice };
	else return { toolChoice: {
		type: "function",
		function: { name: toolChoice }
	} };
	else if ("type" in toolChoice) return { toolChoice };
	else throw new Error(`Unrecognized tool_choice type. Expected string or TextChatParameterTools. Recieved ${toolChoice}`);
}
var ChatWatsonx = class extends __langchain_core_language_models_chat_models.BaseChatModel {
	static lc_name() {
		return "ChatWatsonx";
	}
	lc_serializable = true;
	get lc_secrets() {
		return {
			authenticator: "AUTHENTICATOR",
			apiKey: "WATSONX_AI_APIKEY",
			apikey: "WATSONX_AI_APIKEY",
			watsonxAIAuthType: "WATSONX_AI_AUTH_TYPE",
			watsonxAIApikey: "WATSONX_AI_APIKEY",
			watsonxAIBearerToken: "WATSONX_AI_BEARER_TOKEN",
			watsonxAIUsername: "WATSONX_AI_USERNAME",
			watsonxAIPassword: "WATSONX_AI_PASSWORD",
			watsonxAIUrl: "WATSONX_AI_URL"
		};
	}
	get lc_aliases() {
		return {
			authenticator: "authenticator",
			apikey: "watsonx_ai_apikey",
			apiKey: "watsonx_ai_apikey",
			watsonxAIAuthType: "watsonx_ai_auth_type",
			watsonxAIApikey: "watsonx_ai_apikey",
			watsonxAIBearerToken: "watsonx_ai_bearer_token",
			watsonxAIUsername: "watsonx_ai_username",
			watsonxAIPassword: "watsonx_ai_password",
			watsonxAIUrl: "watsonx_ai_url"
		};
	}
	getLsParams(options) {
		const params = this.invocationParams(options);
		return {
			ls_provider: "watsonx",
			ls_model_name: this.model,
			ls_model_type: "chat",
			ls_temperature: params.temperature ?? void 0,
			ls_max_tokens: params.maxTokens ?? void 0
		};
	}
	checkValidProperties(fields, includeCommonProps = true) {
		const PROPERTY_GROUPS = {
			ALWAYS_ALLOWED: [
				"headers",
				"signal",
				"tool_choice",
				"promptIndex",
				"ls_structured_output_format",
				"watsonxCallbacks",
				"writer",
				"interrupt"
			],
			AUTH: [
				"serviceUrl",
				"watsonxAIApikey",
				"watsonxAIBearerToken",
				"watsonxAIUsername",
				"watsonxAIPassword",
				"watsonxAIUrl",
				"watsonxAIAuthType",
				"disableSSL"
			],
			SHARED: [
				"maxRetries",
				"authenticator",
				"serviceUrl",
				"version",
				"streaming",
				"callbackManager",
				"callbacks",
				"maxConcurrency",
				"cache",
				"metadata",
				"concurrency",
				"onFailedAttempt",
				"verbose",
				"tags",
				"headers",
				"disableStreaming",
				"timeout",
				"stopSequences"
			],
			GATEWAY: [
				"tools",
				"frequencyPenalty",
				"logitBias",
				"logprobs",
				"topLogprobs",
				"maxTokens",
				"n",
				"presencePenalty",
				"responseFormat",
				"seed",
				"stop",
				"temperature",
				"topP",
				"model",
				"modelGatewayKwargs",
				"modelGateway",
				"reasoningEffort"
			],
			DEPLOYMENT: ["idOrName"],
			PROJECT_OR_SPACE: [
				"spaceId",
				"projectId",
				"tools",
				"toolChoiceOption",
				"frequencyPenalty",
				"logitBias",
				"logprobs",
				"topLogprobs",
				"maxTokens",
				"maxCompletionTokens",
				"n",
				"presencePenalty",
				"responseFormat",
				"seed",
				"stop",
				"temperature",
				"topP",
				"timeLimit",
				"model",
				"reasoningEffort",
				"includeReasoning"
			]
		};
		const validProps = [...PROPERTY_GROUPS.ALWAYS_ALLOWED];
		if (includeCommonProps) validProps.push(...PROPERTY_GROUPS.AUTH, ...PROPERTY_GROUPS.SHARED);
		if (this.modelGateway) validProps.push(...PROPERTY_GROUPS.GATEWAY);
		else if (this.idOrName) validProps.push(...PROPERTY_GROUPS.DEPLOYMENT);
		else if (this.spaceId || this.projectId) validProps.push(...PROPERTY_GROUPS.PROJECT_OR_SPACE);
		require_ibm.checkValidProps(fields, validProps);
	}
	service;
	gateway;
	model;
	version = "2024-05-31";
	modelGateway = false;
	maxTokens;
	maxCompletionTokens;
	maxRetries = 0;
	serviceUrl;
	spaceId;
	projectId;
	idOrName;
	frequencyPenalty;
	logprobs;
	topLogprobs;
	n;
	presencePenalty;
	temperature;
	topP;
	timeLimit;
	includeReasoning;
	reasoningEffort;
	maxConcurrency;
	responseFormat;
	streaming = false;
	modelGatewayKwargs;
	watsonxCallbacks;
	constructor(fields) {
		super(fields);
		const uniqueProps = [
			"spaceId",
			"projectId",
			"idOrName",
			"modelGateway"
		];
		require_ibm.expectOneOf(fields, uniqueProps, true);
		this.idOrName = fields?.idOrName;
		this.projectId = fields?.projectId;
		this.modelGateway = fields.modelGateway || this.modelGateway;
		this.spaceId = fields?.spaceId;
		this.checkValidProperties(fields);
		this.model = fields?.model ?? this.model;
		this.projectId = fields?.projectId;
		this.spaceId = fields?.spaceId;
		this.watsonxCallbacks = fields?.watsonxCallbacks;
		this.serviceUrl = fields?.serviceUrl;
		this.version = fields?.version ?? this.version;
		this.temperature = fields?.temperature;
		this.maxRetries = fields?.maxRetries || this.maxRetries;
		this.maxConcurrency = fields?.maxConcurrency;
		this.frequencyPenalty = fields?.frequencyPenalty;
		this.maxTokens = fields?.maxTokens ?? this.maxTokens;
		this.maxCompletionTokens = fields?.maxCompletionTokens;
		this.presencePenalty = fields?.presencePenalty;
		this.topP = fields?.topP;
		this.responseFormat = fields?.responseFormat ?? this.responseFormat;
		this.streaming = fields?.streaming ?? this.streaming;
		this.n = fields?.n ?? this.n;
		this.timeLimit = fields?.timeLimit;
		this.reasoningEffort = fields?.reasoningEffort;
		this.includeReasoning = fields?.includeReasoning;
		this.modelGateway = fields?.modelGateway ?? this.modelGateway;
		this.modelGatewayKwargs = fields?.modelGatewayKwargs;
		const { watsonxAIApikey, watsonxAIAuthType, watsonxAIBearerToken, watsonxAIUsername, watsonxAIPassword, watsonxAIUrl, disableSSL, version, serviceUrl } = fields;
		const authData = {
			watsonxAIApikey,
			watsonxAIAuthType,
			watsonxAIBearerToken,
			watsonxAIUsername,
			watsonxAIPassword,
			watsonxAIUrl,
			disableSSL,
			version,
			serviceUrl
		};
		if (this.modelGateway) {
			const chatGateway = require_ibm.authenticateAndSetGatewayInstance(authData);
			if (chatGateway) this.gateway = chatGateway;
			else throw new Error("You have not provided any type of authentication");
		} else {
			const service = require_ibm.authenticateAndSetInstance(authData);
			if (service) this.service = service;
			else throw new Error("You have not provided any type of authentication");
		}
	}
	_llmType() {
		return "watsonx";
	}
	invocationParams(options) {
		const { tools, responseFormat, timeLimit, tool_choice } = options;
		require_ibm.expectOneOf(options, [
			"spaceId",
			"projectId",
			"idOrName",
			"modelGateway"
		]);
		this.checkValidProperties(options, false);
		const paramDefaults = {
			maxTokens: options.maxTokens ?? this.maxTokens,
			maxCompletionTokens: options.maxCompletionTokens ?? this.maxCompletionTokens,
			temperature: options.temperature ?? this.temperature,
			topP: options.topP ?? this.topP,
			presencePenalty: options.presencePenalty ?? this.presencePenalty,
			n: options.n ?? this.n,
			topLogprobs: options.topLogprobs ?? this.topLogprobs,
			logprobs: options.logprobs ?? this.logprobs,
			frequencyPenalty: options.frequencyPenalty ?? this.frequencyPenalty,
			reasoningEffort: options.reasoningEffort ?? this.reasoningEffort
		};
		const toolParams = tools ? { tools: _convertToolToWatsonxTool(tools) } : {};
		const toolChoiceParams = tool_choice ? _convertToolChoiceToWatsonxToolChoice(tool_choice) : {};
		const gatewayParams = this.modelGateway ? { ...this.modelGatewayKwargs } : {
			timeLimit: timeLimit ?? this.timeLimit,
			projectId: options.projectId ?? this.projectId,
			includeReasoning: options.includeReasoning ?? this.includeReasoning
		};
		return {
			...paramDefaults,
			...toolParams,
			responseFormat,
			...toolChoiceParams,
			...gatewayParams
		};
	}
	invocationCallbacks(options) {
		return options.watsonxCallbacks ?? this.watsonxCallbacks;
	}
	bindTools(tools, kwargs) {
		return this.withConfig({
			tools: _convertToolToWatsonxTool(tools),
			...kwargs
		});
	}
	scopeId(options) {
		const model = options?.model ?? this.model;
		const projectId = options?.projectId ?? this.projectId;
		const spaceId = options?.spaceId ?? this.spaceId;
		const idOrName = options?.idOrName ?? this.idOrName;
		if (this.modelGateway) {
			if (!model) throw new Error("No model provided! Model gateway expects model to be provided");
			return { model };
		}
		if (projectId && model) return {
			projectId,
			modelId: model
		};
		if (spaceId && model) return {
			spaceId,
			modelId: model
		};
		if (idOrName) return { idOrName };
		if (model) return { modelId: model };
		throw new Error("No id or model provided!");
	}
	async completionWithRetry(callback, options) {
		const caller = new __langchain_core_utils_async_caller.AsyncCaller({
			maxConcurrency: options?.maxConcurrency ?? this.maxConcurrency,
			maxRetries: this.maxRetries
		});
		const result = options ? caller.callWithOptions({ signal: options.signal }, async () => callback()) : caller.call(async () => callback());
		return result;
	}
	async _chatModelGateway(scopeId, params, messages, signal, stream = false) {
		if (this.gateway) {
			if ("model" in scopeId) return this.gateway.chat.completion.create({
				...params,
				...scopeId,
				signal,
				stream,
				...stream ? { returnObject: true } : {},
				messages
			});
			throw new Error("No 'model' specified. Model needs to be spcified for model gateway");
		}
		throw new Error("'gateway' instance is not set. Please check your implementation");
	}
	async _generate(messages, options, runManager) {
		if (this.streaming) {
			const stream = this._streamResponseChunks(messages, options, runManager);
			const finalChunks = {};
			let tokenUsage = {
				input_tokens: 0,
				output_tokens: 0,
				total_tokens: 0
			};
			const tokenUsages = [];
			for await (const chunk of stream) {
				const message = chunk.message;
				const usageMetadata = message?.usage_metadata;
				if (usageMetadata) {
					const completion = chunk.generationInfo?.completion;
					if (tokenUsages[completion]) tokenUsages[completion].output_tokens = usageMetadata?.output_tokens;
					else tokenUsages[completion] = usageMetadata;
				}
				chunk.message.response_metadata = {
					model: this.model,
					...chunk.generationInfo,
					...chunk.message.response_metadata
				};
				const index = chunk.generationInfo?.completion ?? 0;
				if (finalChunks[index] === void 0) finalChunks[index] = chunk;
				else finalChunks[index] = finalChunks[index].concat(chunk);
			}
			tokenUsage = tokenUsages.reduce((acc, curr) => {
				return {
					input_tokens: acc.input_tokens + curr.input_tokens,
					output_tokens: acc.output_tokens + curr.output_tokens,
					total_tokens: acc.total_tokens + curr.total_tokens
				};
			});
			const generations = Object.entries(finalChunks).sort(([aKey], [bKey]) => parseInt(aKey, 10) - parseInt(bKey, 10)).map(([_, value]) => value);
			return {
				generations,
				llmOutput: { tokenUsage }
			};
		} else {
			const params = this.invocationParams(options);
			const scopeId = this.scopeId(options);
			const watsonxCallbacks = this.invocationCallbacks(options);
			const watsonxMessages = _convertMessagesToWatsonxMessages(messages, this.model);
			const callback = () => {
				if (this.modelGateway) return this._chatModelGateway(scopeId, params, watsonxMessages, options.signal, false);
				if (this.service) {
					if ("idOrName" in scopeId) return this.service.deploymentsTextChat({
						...scopeId,
						messages: watsonxMessages,
						signal: options?.signal
					}, watsonxCallbacks);
					if ("modelId" in scopeId) return this.service.textChat({
						...params,
						...scopeId,
						messages: watsonxMessages,
						signal: options?.signal
					}, watsonxCallbacks);
				}
				throw new Error("No service or gateway set. Please check your intsance init");
			};
			const { result } = await this.completionWithRetry(callback, options);
			const generations = [];
			for (const part of result.choices) {
				const generation = {
					text: part.message?.content ?? "",
					message: _watsonxResponseToChatMessage(part, result.id, result?.usage)
				};
				if (part.finish_reason) generation.generationInfo = { finish_reason: part.finish_reason };
				generations.push(generation);
			}
			return {
				generations,
				llmOutput: {
					tokenUsage: result?.usage,
					model_name: this.model,
					model: this.model
				}
			};
		}
	}
	async *_streamResponseChunks(messages, options, _runManager) {
		const params = this.invocationParams(options);
		const scopeId = this.scopeId(options);
		const watsonxMessages = _convertMessagesToWatsonxMessages(messages, this.model);
		const watsonxCallbacks = this.invocationCallbacks(options);
		const { signal } = options;
		const callback = () => {
			if (this.modelGateway) return this._chatModelGateway(scopeId, params, watsonxMessages, signal, true);
			if (this.service) {
				if ("idOrName" in scopeId) return this.service.deploymentsTextChatStream({
					...scopeId,
					messages: watsonxMessages,
					returnObject: true,
					signal
				}, watsonxCallbacks);
				if ("modelId" in scopeId) return this.service.textChatStream({
					...params,
					...scopeId,
					messages: watsonxMessages,
					returnObject: true,
					signal
				}, watsonxCallbacks);
				throw new Error("No idOrName or modelId specified. At least one of these needs to be specified in basic mode");
			}
			throw new Error("No service or gateway set. Please check your intsance init");
		};
		const stream = await this.completionWithRetry(callback, options);
		let defaultRole;
		let usage;
		let currentCompletion = 0;
		const counter = { value: -1 };
		for await (const chunk of stream) {
			if (chunk?.data?.usage) usage = chunk.data.usage;
			const { data } = chunk;
			const choice = data.choices[0];
			if (choice && !("delta" in choice)) continue;
			const delta = choice?.delta;
			if (!delta) continue;
			currentCompletion = choice.index ?? 0;
			const newTokenIndices = {
				prompt: options.promptIndex ?? 0,
				completion: choice.index ?? 0
			};
			const generationInfo = {
				...newTokenIndices,
				finish_reason: choice.finish_reason
			};
			const message = _convertDeltaToMessageChunk(counter, delta, data, this.model, chunk.data.usage, defaultRole);
			defaultRole = delta.role || defaultRole;
			if (message === null || !delta.content && !delta.tool_calls && delta.role === "assistant") continue;
			const generationChunk$1 = new __langchain_core_outputs.ChatGenerationChunk({
				message,
				text: delta.content ?? "",
				generationInfo
			});
			yield generationChunk$1;
			_runManager?.handleLLMNewToken(generationChunk$1.text, newTokenIndices, void 0, void 0, void 0, { chunk: generationChunk$1 });
		}
		const generationChunk = new __langchain_core_outputs.ChatGenerationChunk({
			message: new __langchain_core_messages.AIMessageChunk({
				content: "",
				response_metadata: {
					model: this.model,
					usage
				},
				usage_metadata: {
					input_tokens: usage?.prompt_tokens ?? 0,
					output_tokens: usage?.completion_tokens ?? 0,
					total_tokens: usage?.total_tokens ?? 0
				}
			}),
			text: "",
			generationInfo: {
				prompt: options.promptIndex ?? 0,
				completion: currentCompletion ?? 0
			}
		});
		yield generationChunk;
	}
	/** @ignore */
	_combineLLMOutput() {
		return [];
	}
	withStructuredOutput(outputSchema, config) {
		const schema = outputSchema;
		const name = config?.name;
		const method = config?.method;
		const includeRaw = config?.includeRaw;
		let functionName = name ?? "extract";
		let outputParser;
		let llm;
		if (method === "jsonMode") {
			let outputFormatSchema;
			if ((0, __langchain_core_utils_types.isInteropZodSchema)(schema)) {
				outputParser = __langchain_core_output_parsers.StructuredOutputParser.fromZodSchema(schema);
				outputFormatSchema = (0, __langchain_core_utils_json_schema.toJsonSchema)(schema);
			} else outputParser = new __langchain_core_output_parsers.JsonOutputParser();
			const options = {
				responseFormat: { type: "json_object" },
				ls_structured_output_format: {
					kwargs: { method: "jsonMode" },
					schema: outputFormatSchema
				}
			};
			llm = this.withConfig(options);
		} else if ((0, __langchain_core_utils_types.isInteropZodSchema)(schema)) {
			const asJsonSchema = (0, __langchain_core_utils_json_schema.toJsonSchema)(schema);
			llm = this.withConfig({
				tools: [{
					type: "function",
					function: {
						name: functionName,
						description: asJsonSchema.description ?? `Tool: ${functionName}`,
						parameters: asJsonSchema
					}
				}],
				tool_choice: {
					type: "function",
					function: { name: functionName }
				},
				ls_structured_output_format: {
					kwargs: { method: "functionCalling" },
					schema: asJsonSchema
				}
			});
			outputParser = new require_ibm.WatsonxToolsOutputParser({
				returnSingle: true,
				keyName: functionName,
				zodSchema: schema
			});
		} else {
			let openAIFunctionDefinition;
			if (typeof schema.name === "string" && typeof schema.parameters === "object" && schema.parameters != null) {
				openAIFunctionDefinition = schema;
				functionName = schema.name;
			} else openAIFunctionDefinition = {
				name: functionName,
				description: schema.description ?? "",
				parameters: schema
			};
			llm = this.withConfig({
				tools: [{
					type: "function",
					function: openAIFunctionDefinition
				}],
				tool_choice: {
					type: "function",
					function: { name: functionName }
				},
				ls_structured_output_format: {
					kwargs: { method: "functionCalling" },
					schema: (0, __langchain_core_utils_json_schema.toJsonSchema)(schema)
				}
			});
			outputParser = new require_ibm.WatsonxToolsOutputParser({
				returnSingle: true,
				keyName: functionName
			});
		}
		if (!includeRaw) return llm.pipe(outputParser);
		const parserAssign = __langchain_core_runnables.RunnablePassthrough.assign({ parsed: (input, config$1) => outputParser.invoke(input.raw, config$1) });
		const parserNone = __langchain_core_runnables.RunnablePassthrough.assign({ parsed: () => null });
		const parsedWithFallback = parserAssign.withFallbacks({ fallbacks: [parserNone] });
		return __langchain_core_runnables.RunnableSequence.from([{ raw: llm }, parsedWithFallback]);
	}
};

//#endregion
exports.ChatWatsonx = ChatWatsonx;
Object.defineProperty(exports, 'ibm_exports', {
  enumerable: true,
  get: function () {
    return ibm_exports;
  }
});
//# sourceMappingURL=ibm.cjs.map