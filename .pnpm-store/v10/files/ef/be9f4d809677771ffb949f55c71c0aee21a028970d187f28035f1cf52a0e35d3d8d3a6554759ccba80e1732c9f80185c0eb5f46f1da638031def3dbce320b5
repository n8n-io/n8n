const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_tools = require('../utils/tools.cjs');
const require_misc = require('../utils/misc.cjs');
const require_azure = require('../utils/azure.cjs');
const require_output = require('../utils/output.cjs');
const require_profiles = require('./profiles.cjs');
const openai = require_rolldown_runtime.__toESM(require("openai"));
const __langchain_core_utils_types = require_rolldown_runtime.__toESM(require("@langchain/core/utils/types"));
const __langchain_core_utils_json_schema = require_rolldown_runtime.__toESM(require("@langchain/core/utils/json_schema"));
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_language_models_chat_models = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/chat_models"));
const __langchain_core_language_models_base = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/base"));
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));
const __langchain_core_output_parsers_openai_tools = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers/openai_tools"));

//#region src/chat_models/base.ts
/** @internal */
var BaseChatOpenAI = class extends __langchain_core_language_models_chat_models.BaseChatModel {
	temperature;
	topP;
	frequencyPenalty;
	presencePenalty;
	n;
	logitBias;
	model = "gpt-3.5-turbo";
	modelKwargs;
	stop;
	stopSequences;
	user;
	timeout;
	streaming = false;
	streamUsage = true;
	maxTokens;
	logprobs;
	topLogprobs;
	apiKey;
	organization;
	__includeRawResponse;
	/** @internal */
	client;
	/** @internal */
	clientConfig;
	/**
	* Whether the model supports the `strict` argument when passing in tools.
	* If `undefined` the `strict` argument will not be passed to OpenAI.
	*/
	supportsStrictToolCalling;
	audio;
	modalities;
	reasoning;
	/**
	* Must be set to `true` in tenancies with Zero Data Retention. Setting to `true` will disable
	* output storage in the Responses API, but this DOES NOT enable Zero Data Retention in your
	* OpenAI organization or project. This must be configured directly with OpenAI.
	*
	* See:
	* https://platform.openai.com/docs/guides/your-data
	* https://platform.openai.com/docs/api-reference/responses/create#responses-create-store
	*
	* @default false
	*/
	zdrEnabled;
	/**
	* Service tier to use for this request. Can be "auto", "default", or "flex" or "priority".
	* Specifies the service tier for prioritization and latency optimization.
	*/
	service_tier;
	/**
	* Used by OpenAI to cache responses for similar requests to optimize your cache
	* hit rates.
	* [Learn more](https://platform.openai.com/docs/guides/prompt-caching).
	*/
	promptCacheKey;
	/**
	* The verbosity of the model's response.
	*/
	verbosity;
	defaultOptions;
	_llmType() {
		return "openai";
	}
	static lc_name() {
		return "ChatOpenAI";
	}
	get callKeys() {
		return [
			...super.callKeys,
			"options",
			"function_call",
			"functions",
			"tools",
			"tool_choice",
			"promptIndex",
			"response_format",
			"seed",
			"reasoning",
			"service_tier"
		];
	}
	lc_serializable = true;
	get lc_secrets() {
		return {
			apiKey: "OPENAI_API_KEY",
			organization: "OPENAI_ORGANIZATION"
		};
	}
	get lc_aliases() {
		return {
			apiKey: "openai_api_key",
			modelName: "model"
		};
	}
	get lc_serializable_keys() {
		return [
			"configuration",
			"logprobs",
			"topLogprobs",
			"prefixMessages",
			"supportsStrictToolCalling",
			"modalities",
			"audio",
			"temperature",
			"maxTokens",
			"topP",
			"frequencyPenalty",
			"presencePenalty",
			"n",
			"logitBias",
			"user",
			"streaming",
			"streamUsage",
			"model",
			"modelName",
			"modelKwargs",
			"stop",
			"stopSequences",
			"timeout",
			"apiKey",
			"cache",
			"maxConcurrency",
			"maxRetries",
			"verbose",
			"callbacks",
			"tags",
			"metadata",
			"disableStreaming",
			"zdrEnabled",
			"reasoning",
			"promptCacheKey",
			"verbosity"
		];
	}
	getLsParams(options) {
		const params = this.invocationParams(options);
		return {
			ls_provider: "openai",
			ls_model_name: this.model,
			ls_model_type: "chat",
			ls_temperature: params.temperature ?? void 0,
			ls_max_tokens: params.max_tokens ?? void 0,
			ls_stop: options.stop
		};
	}
	/** @ignore */
	_identifyingParams() {
		return {
			model_name: this.model,
			...this.invocationParams(),
			...this.clientConfig
		};
	}
	/**
	* Get the identifying parameters for the model
	*/
	identifyingParams() {
		return this._identifyingParams();
	}
	constructor(fields) {
		super(fields ?? {});
		const configApiKey = typeof fields?.configuration?.apiKey === "string" || typeof fields?.configuration?.apiKey === "function" ? fields?.configuration?.apiKey : void 0;
		this.apiKey = fields?.apiKey ?? configApiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("OPENAI_API_KEY");
		this.organization = fields?.configuration?.organization ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("OPENAI_ORGANIZATION");
		this.model = fields?.model ?? fields?.modelName ?? this.model;
		this.modelKwargs = fields?.modelKwargs ?? {};
		this.timeout = fields?.timeout;
		this.temperature = fields?.temperature ?? this.temperature;
		this.topP = fields?.topP ?? this.topP;
		this.frequencyPenalty = fields?.frequencyPenalty ?? this.frequencyPenalty;
		this.presencePenalty = fields?.presencePenalty ?? this.presencePenalty;
		this.logprobs = fields?.logprobs;
		this.topLogprobs = fields?.topLogprobs;
		this.n = fields?.n ?? this.n;
		this.logitBias = fields?.logitBias;
		this.stop = fields?.stopSequences ?? fields?.stop;
		this.stopSequences = this.stop;
		this.user = fields?.user;
		this.__includeRawResponse = fields?.__includeRawResponse;
		this.audio = fields?.audio;
		this.modalities = fields?.modalities;
		this.reasoning = fields?.reasoning;
		this.maxTokens = fields?.maxCompletionTokens ?? fields?.maxTokens;
		this.promptCacheKey = fields?.promptCacheKey ?? this.promptCacheKey;
		this.verbosity = fields?.verbosity ?? this.verbosity;
		this.disableStreaming = fields?.disableStreaming === true;
		this.streaming = fields?.streaming === true;
		if (this.disableStreaming) this.streaming = false;
		if (fields?.streaming === false) this.disableStreaming = true;
		this.streamUsage = fields?.streamUsage ?? this.streamUsage;
		if (this.disableStreaming) this.streamUsage = false;
		this.clientConfig = {
			apiKey: this.apiKey,
			organization: this.organization,
			dangerouslyAllowBrowser: true,
			...fields?.configuration
		};
		if (fields?.supportsStrictToolCalling !== void 0) this.supportsStrictToolCalling = fields.supportsStrictToolCalling;
		if (fields?.service_tier !== void 0) this.service_tier = fields.service_tier;
		this.zdrEnabled = fields?.zdrEnabled ?? false;
	}
	/**
	* Returns backwards compatible reasoning parameters from constructor params and call options
	* @internal
	*/
	_getReasoningParams(options) {
		if (!require_misc.isReasoningModel(this.model)) return;
		let reasoning;
		if (this.reasoning !== void 0) reasoning = {
			...reasoning,
			...this.reasoning
		};
		if (options?.reasoning !== void 0) reasoning = {
			...reasoning,
			...options.reasoning
		};
		return reasoning;
	}
	/**
	* Returns an openai compatible response format from a set of options
	* @internal
	*/
	_getResponseFormat(resFormat) {
		if (resFormat && resFormat.type === "json_schema" && resFormat.json_schema.schema && (0, __langchain_core_utils_types.isInteropZodSchema)(resFormat.json_schema.schema)) return require_output.interopZodResponseFormat(resFormat.json_schema.schema, resFormat.json_schema.name, { description: resFormat.json_schema.description });
		return resFormat;
	}
	_combineCallOptions(additionalOptions) {
		return {
			...this.defaultOptions,
			...additionalOptions ?? {}
		};
	}
	/** @internal */
	_getClientOptions(options) {
		if (!this.client) {
			const openAIEndpointConfig = { baseURL: this.clientConfig.baseURL };
			const endpoint = require_azure.getEndpoint(openAIEndpointConfig);
			const params = {
				...this.clientConfig,
				baseURL: endpoint,
				timeout: this.timeout,
				maxRetries: 0
			};
			if (!params.baseURL) delete params.baseURL;
			params.defaultHeaders = require_azure.getHeadersWithUserAgent(params.defaultHeaders);
			this.client = new openai.OpenAI(params);
		}
		const requestOptions = {
			...this.clientConfig,
			...options
		};
		return requestOptions;
	}
	_convertChatOpenAIToolToCompletionsTool(tool, fields) {
		if (require_tools.isCustomTool(tool)) return require_tools.convertResponsesCustomTool(tool.metadata.customTool);
		if ((0, __langchain_core_language_models_base.isOpenAITool)(tool)) {
			if (fields?.strict !== void 0) return {
				...tool,
				function: {
					...tool.function,
					strict: fields.strict
				}
			};
			return tool;
		}
		return require_tools._convertToOpenAITool(tool, fields);
	}
	bindTools(tools, kwargs) {
		let strict;
		if (kwargs?.strict !== void 0) strict = kwargs.strict;
		else if (this.supportsStrictToolCalling !== void 0) strict = this.supportsStrictToolCalling;
		return this.withConfig({
			tools: tools.map((tool) => require_tools.isBuiltInTool(tool) || require_tools.isCustomTool(tool) ? tool : this._convertChatOpenAIToolToCompletionsTool(tool, { strict })),
			...kwargs
		});
	}
	async stream(input, options) {
		return super.stream(input, this._combineCallOptions(options));
	}
	async invoke(input, options) {
		return super.invoke(input, this._combineCallOptions(options));
	}
	/** @ignore */
	_combineLLMOutput(...llmOutputs) {
		return llmOutputs.reduce((acc, llmOutput) => {
			if (llmOutput && llmOutput.tokenUsage) {
				acc.tokenUsage.completionTokens += llmOutput.tokenUsage.completionTokens ?? 0;
				acc.tokenUsage.promptTokens += llmOutput.tokenUsage.promptTokens ?? 0;
				acc.tokenUsage.totalTokens += llmOutput.tokenUsage.totalTokens ?? 0;
			}
			return acc;
		}, { tokenUsage: {
			completionTokens: 0,
			promptTokens: 0,
			totalTokens: 0
		} });
	}
	async getNumTokensFromMessages(messages) {
		let totalCount = 0;
		let tokensPerMessage = 0;
		let tokensPerName = 0;
		if (this.model === "gpt-3.5-turbo-0301") {
			tokensPerMessage = 4;
			tokensPerName = -1;
		} else {
			tokensPerMessage = 3;
			tokensPerName = 1;
		}
		const countPerMessage = await Promise.all(messages.map(async (message) => {
			const textCount = await this.getNumTokens(message.content);
			const roleCount = await this.getNumTokens(require_misc.messageToOpenAIRole(message));
			const nameCount = message.name !== void 0 ? tokensPerName + await this.getNumTokens(message.name) : 0;
			let count = textCount + tokensPerMessage + roleCount + nameCount;
			const openAIMessage = message;
			if (openAIMessage._getType() === "function") count -= 2;
			if (openAIMessage.additional_kwargs?.function_call) count += 3;
			if (openAIMessage?.additional_kwargs.function_call?.name) count += await this.getNumTokens(openAIMessage.additional_kwargs.function_call?.name);
			if (openAIMessage.additional_kwargs.function_call?.arguments) try {
				count += await this.getNumTokens(JSON.stringify(JSON.parse(openAIMessage.additional_kwargs.function_call?.arguments)));
			} catch (error) {
				console.error("Error parsing function arguments", error, JSON.stringify(openAIMessage.additional_kwargs.function_call));
				count += await this.getNumTokens(openAIMessage.additional_kwargs.function_call?.arguments);
			}
			totalCount += count;
			return count;
		}));
		totalCount += 3;
		return {
			totalCount,
			countPerMessage
		};
	}
	/** @internal */
	async _getNumTokensFromGenerations(generations) {
		const generationUsages = await Promise.all(generations.map(async (generation) => {
			if (generation.message.additional_kwargs?.function_call) return (await this.getNumTokensFromMessages([generation.message])).countPerMessage[0];
			else return await this.getNumTokens(generation.message.content);
		}));
		return generationUsages.reduce((a, b) => a + b, 0);
	}
	/** @internal */
	async _getEstimatedTokenCountFromPrompt(messages, functions, function_call) {
		let tokens = (await this.getNumTokensFromMessages(messages)).totalCount;
		if (functions && function_call !== "auto") {
			const promptDefinitions = require_tools.formatFunctionDefinitions(functions);
			tokens += await this.getNumTokens(promptDefinitions);
			tokens += 9;
		}
		if (functions && messages.find((m) => m._getType() === "system")) tokens -= 4;
		if (function_call === "none") tokens += 1;
		else if (typeof function_call === "object") tokens += await this.getNumTokens(function_call.name) + 4;
		return tokens;
	}
	/**
	* Return profiling information for the model.
	*
	* Provides information about the model's capabilities and constraints,
	* including token limits, multimodal support, and advanced features like
	* tool calling and structured output.
	*
	* @returns {ModelProfile} An object describing the model's capabilities and constraints
	*
	* @example
	* ```typescript
	* const model = new ChatOpenAI({ model: "gpt-4o" });
	* const profile = model.profile;
	* console.log(profile.maxInputTokens); // 128000
	* console.log(profile.imageInputs); // true
	* ```
	*/
	get profile() {
		return require_profiles.default[this.model] ?? {};
	}
	/** @internal */
	_getStructuredOutputMethod(config) {
		const ensuredConfig = { ...config };
		if (!this.model.startsWith("gpt-3") && !this.model.startsWith("gpt-4-") && this.model !== "gpt-4") {
			if (ensuredConfig?.method === void 0) return "jsonSchema";
		} else if (ensuredConfig.method === "jsonSchema") console.warn(`[WARNING]: JSON Schema is not supported for model "${this.model}". Falling back to tool calling.`);
		return ensuredConfig.method;
	}
	/**
	* Add structured output to the model.
	*
	* The OpenAI model family supports the following structured output methods:
	* - `jsonSchema`: Use the `response_format` field in the response to return a JSON schema. Only supported with the `gpt-4o-mini`,
	*   `gpt-4o-mini-2024-07-18`, and `gpt-4o-2024-08-06` model snapshots and later.
	* - `functionCalling`: Function calling is useful when you are building an application that bridges the models and functionality
	*   of your application.
	* - `jsonMode`: JSON mode is a more basic version of the Structured Outputs feature. While JSON mode ensures that model
	*   output is valid JSON, Structured Outputs reliably matches the model's output to the schema you specify.
	*   We recommend you use `functionCalling` or `jsonSchema` if it is supported for your use case.
	*
	* The default method is `functionCalling`.
	*
	* @see https://platform.openai.com/docs/guides/structured-outputs
	* @param outputSchema - The schema to use for structured output.
	* @param config - The structured output method options.
	* @returns The model with structured output.
	*/
	withStructuredOutput(outputSchema, config) {
		let llm;
		let outputParser;
		const { schema, name, includeRaw } = {
			...config,
			schema: outputSchema
		};
		if (config?.strict !== void 0 && config.method === "jsonMode") throw new Error("Argument `strict` is only supported for `method` = 'function_calling'");
		const method = require_output.getStructuredOutputMethod(this.model, config?.method);
		if (method === "jsonMode") {
			if ((0, __langchain_core_utils_types.isInteropZodSchema)(schema)) outputParser = __langchain_core_output_parsers.StructuredOutputParser.fromZodSchema(schema);
			else outputParser = new __langchain_core_output_parsers.JsonOutputParser();
			const asJsonSchema = (0, __langchain_core_utils_json_schema.toJsonSchema)(schema);
			llm = this.withConfig({
				outputVersion: "v0",
				response_format: { type: "json_object" },
				ls_structured_output_format: {
					kwargs: { method: "json_mode" },
					schema: {
						title: name ?? "extract",
						...asJsonSchema
					}
				}
			});
		} else if (method === "jsonSchema") {
			const openaiJsonSchemaParams = {
				name: name ?? "extract",
				description: (0, __langchain_core_utils_types.getSchemaDescription)(schema),
				schema,
				strict: config?.strict
			};
			const asJsonSchema = (0, __langchain_core_utils_json_schema.toJsonSchema)(openaiJsonSchemaParams.schema);
			llm = this.withConfig({
				outputVersion: "v0",
				response_format: {
					type: "json_schema",
					json_schema: openaiJsonSchemaParams
				},
				ls_structured_output_format: {
					kwargs: { method: "json_schema" },
					schema: {
						title: openaiJsonSchemaParams.name,
						description: openaiJsonSchemaParams.description,
						...asJsonSchema
					}
				}
			});
			if ((0, __langchain_core_utils_types.isInteropZodSchema)(schema)) {
				const altParser = __langchain_core_output_parsers.StructuredOutputParser.fromZodSchema(schema);
				outputParser = __langchain_core_runnables.RunnableLambda.from((aiMessage) => {
					if ("parsed" in aiMessage.additional_kwargs) return aiMessage.additional_kwargs.parsed;
					return altParser;
				});
			} else outputParser = new __langchain_core_output_parsers.JsonOutputParser();
		} else {
			let functionName = name ?? "extract";
			if ((0, __langchain_core_utils_types.isInteropZodSchema)(schema)) {
				const asJsonSchema = (0, __langchain_core_utils_json_schema.toJsonSchema)(schema);
				llm = this.withConfig({
					outputVersion: "v0",
					tools: [{
						type: "function",
						function: {
							name: functionName,
							description: asJsonSchema.description,
							parameters: asJsonSchema
						}
					}],
					tool_choice: {
						type: "function",
						function: { name: functionName }
					},
					ls_structured_output_format: {
						kwargs: { method: "function_calling" },
						schema: {
							title: functionName,
							...asJsonSchema
						}
					},
					...config?.strict !== void 0 ? { strict: config.strict } : {}
				});
				outputParser = new __langchain_core_output_parsers_openai_tools.JsonOutputKeyToolsParser({
					returnSingle: true,
					keyName: functionName,
					zodSchema: schema
				});
			} else {
				let openAIFunctionDefinition;
				if (typeof schema.name === "string" && typeof schema.parameters === "object" && schema.parameters != null) {
					openAIFunctionDefinition = schema;
					functionName = schema.name;
				} else {
					functionName = schema.title ?? functionName;
					openAIFunctionDefinition = {
						name: functionName,
						description: schema.description ?? "",
						parameters: schema
					};
				}
				const asJsonSchema = (0, __langchain_core_utils_json_schema.toJsonSchema)(schema);
				llm = this.withConfig({
					outputVersion: "v0",
					tools: [{
						type: "function",
						function: openAIFunctionDefinition
					}],
					tool_choice: {
						type: "function",
						function: { name: functionName }
					},
					ls_structured_output_format: {
						kwargs: { method: "function_calling" },
						schema: {
							title: functionName,
							...asJsonSchema
						}
					},
					...config?.strict !== void 0 ? { strict: config.strict } : {}
				});
				outputParser = new __langchain_core_output_parsers_openai_tools.JsonOutputKeyToolsParser({
					returnSingle: true,
					keyName: functionName
				});
			}
		}
		if (!includeRaw) return llm.pipe(outputParser);
		const parserAssign = __langchain_core_runnables.RunnablePassthrough.assign({ parsed: (input, config$1) => outputParser.invoke(input.raw, config$1) });
		const parserNone = __langchain_core_runnables.RunnablePassthrough.assign({ parsed: () => null });
		const parsedWithFallback = parserAssign.withFallbacks({ fallbacks: [parserNone] });
		return __langchain_core_runnables.RunnableSequence.from([{ raw: llm }, parsedWithFallback]);
	}
};

//#endregion
exports.BaseChatOpenAI = BaseChatOpenAI;
//# sourceMappingURL=base.cjs.map