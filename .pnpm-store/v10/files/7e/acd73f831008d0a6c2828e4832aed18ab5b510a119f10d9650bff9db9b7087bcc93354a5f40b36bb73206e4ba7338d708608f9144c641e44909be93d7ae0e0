const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_ibm = require('../utils/ibm.cjs');
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));
const __langchain_core_utils_async_caller = require_rolldown_runtime.__toESM(require("@langchain/core/utils/async_caller"));
const __langchain_core_language_models_llms = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/llms"));

//#region src/llms/ibm.ts
var ibm_exports = {};
require_rolldown_runtime.__export(ibm_exports, { WatsonxLLM: () => WatsonxLLM });
/**
* Integration with an LLM.
*/
var WatsonxLLM = class extends __langchain_core_language_models_llms.BaseLLM {
	static lc_name() {
		return "WatsonxLLM";
	}
	lc_serializable = true;
	streaming = false;
	model;
	maxRetries = 0;
	version = "2024-05-31";
	serviceUrl;
	maxTokens;
	maxNewTokens;
	spaceId;
	projectId;
	idOrName;
	decodingMethod;
	lengthPenalty;
	minNewTokens;
	randomSeed;
	stopSequence;
	temperature;
	timeLimit;
	topK;
	topP;
	repetitionPenalty;
	truncateInputTokens;
	returnOptions;
	includeStopSequence;
	maxConcurrency;
	watsonxCallbacks;
	modelGateway = false;
	modelGatewayKwargs = {};
	service;
	gateway;
	checkValidProperties(fields, includeCommonProps = true) {
		const authProps = [
			"serviceUrl",
			"watsonxAIApikey",
			"watsonxAIBearerToken",
			"watsonxAIUsername",
			"watsonxAIPassword",
			"watsonxAIUrl",
			"watsonxAIAuthType",
			"disableSSL"
		];
		const sharedProps = [
			"maxRetries",
			"watsonxCallbacks",
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
			"concurrency",
			"verbose",
			"tags"
		];
		const gatewayProps = [
			"temperature",
			"topP",
			"model",
			"modelGatewayKwargs",
			"modelGateway",
			"verbose",
			"tags",
			"maxTokens"
		];
		const deploymentProps = ["idOrName"];
		const projectOrSpaceProps = [
			"spaceId",
			"projectId",
			"temperature",
			"topP",
			"timeLimit",
			"model",
			"maxNewTokens",
			"decodingMethod",
			"lengthPenalty",
			"minNewTokens",
			"randomSeed",
			"stopSequence",
			"topK",
			"repetitionPenalty",
			"truncateInputTokens",
			"returnOptions",
			"includeStopSequence"
		];
		const validProps = [];
		if (includeCommonProps) validProps.push(...authProps, ...sharedProps);
		if (this.modelGateway) validProps.push(...gatewayProps);
		else if (this.idOrName) validProps.push(...deploymentProps);
		else if (this.spaceId || this.projectId) validProps.push(...projectOrSpaceProps);
		require_ibm.checkValidProps(fields, validProps);
	}
	constructor(fields) {
		super(fields);
		require_ibm.expectOneOf(fields, [
			"spaceId",
			"projectId",
			"idOrName",
			"modelGateway"
		], true);
		this.idOrName = fields?.idOrName;
		this.projectId = fields?.projectId;
		this.modelGateway = fields.modelGateway || this.modelGateway;
		this.spaceId = fields?.spaceId;
		this.checkValidProperties(fields);
		this.model = fields.model ?? this.model;
		this.serviceUrl = fields.serviceUrl;
		this.version = fields.version;
		this.topP = fields.topP;
		this.temperature = fields.temperature;
		this.maxNewTokens = fields.maxNewTokens ?? fields.maxTokens;
		this.decodingMethod = fields.decodingMethod;
		this.lengthPenalty = fields.lengthPenalty;
		this.minNewTokens = fields.minNewTokens;
		this.maxTokens = fields.maxTokens;
		this.randomSeed = fields.randomSeed;
		this.stopSequence = fields.stopSequence;
		this.timeLimit = fields.timeLimit;
		this.topK = fields.topK;
		this.repetitionPenalty = fields.repetitionPenalty;
		this.truncateInputTokens = fields.truncateInputTokens;
		this.returnOptions = fields.returnOptions;
		this.includeStopSequence = fields.includeStopSequence;
		this.modelGatewayKwargs = fields.modelGatewayKwargs || this.modelGatewayKwargs;
		this.maxRetries = fields.maxRetries || this.maxRetries;
		this.maxConcurrency = fields.maxConcurrency;
		this.streaming = fields.streaming || this.streaming;
		this.watsonxCallbacks = fields.watsonxCallbacks || this.watsonxCallbacks;
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
			const gateway = require_ibm.authenticateAndSetGatewayInstance(authData);
			if (gateway) this.gateway = gateway;
			else throw new Error("You have not provided any type of authentication");
		} else {
			const service = require_ibm.authenticateAndSetInstance(authData);
			if (service) this.service = service;
			else throw new Error("You have not provided any type of authentication");
		}
	}
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
	invocationParams(options) {
		const { parameters } = options;
		const { signal, maxRetries, maxConcurrency, timeout,...rest } = options;
		if (parameters) this.checkValidProperties(parameters, false);
		if (this.idOrName && Object.keys(rest).length > 0) throw new Error("Options cannot be provided to a deployed model");
		if (this.idOrName) return void 0;
		if (this.modelGateway) {
			const modelGatewayParams = {
				...this?.modelGatewayKwargs,
				...parameters?.modelGatewayKwargs
			};
			return {
				stop: options?.stop ?? this.stopSequence,
				temperature: parameters?.temperature ?? this.temperature,
				topP: parameters?.topP ?? this.topP,
				maxTokens: parameters?.maxTokens ?? this.maxTokens,
				...modelGatewayParams
			};
		}
		return {
			stop_sequences: options?.stop ?? this.stopSequence,
			temperature: parameters?.temperature ?? this.temperature,
			top_p: parameters?.topP ?? this.topP,
			max_new_tokens: parameters?.maxNewTokens ?? this.maxNewTokens ?? parameters?.maxTokens ?? this.maxTokens,
			decoding_method: parameters?.decodingMethod ?? this.decodingMethod,
			length_penalty: parameters?.lengthPenalty ?? this.lengthPenalty,
			min_new_tokens: parameters?.minNewTokens ?? this.minNewTokens,
			random_seed: parameters?.randomSeed ?? this.randomSeed,
			time_limit: parameters?.timeLimit ?? this.timeLimit ?? timeout,
			top_k: parameters?.topK ?? this.topK,
			repetition_penalty: parameters?.repetitionPenalty ?? this.repetitionPenalty,
			truncate_input_tokens: parameters?.truncateInputTokens ?? this.truncateInputTokens,
			return_options: parameters?.returnOptions ?? this.returnOptions,
			include_stop_sequence: parameters?.includeStopSequence ?? this.includeStopSequence
		};
	}
	invocationCallbacks(options) {
		return options.watsonxCallbacks ?? this.watsonxCallbacks;
	}
	scopeId() {
		if (this.projectId) return {
			projectId: this.projectId,
			modelId: this.model
		};
		else if (this.spaceId) return {
			spaceId: this.spaceId,
			modelId: this.model
		};
		else if (this.idOrName) return {
			idOrName: this.idOrName,
			modelId: this.model
		};
		else if (this.modelGateway) return { modelId: this.model };
		else throw new Error("Invalid mode type. Please make sure you have provided correct parameters");
	}
	async listModels() {
		if (this.service) {
			const { service } = this;
			const listModelParams = { filters: "function_text_generation" };
			const listModels = await this.completionWithRetry(() => service.listFoundationModelSpecs(listModelParams));
			return listModels.result.resources?.map((item) => item.model_id);
		} else throw new Error("This method is not supported in this model gateway");
	}
	async generateSingleMessage(input, options, stream) {
		const { signal, stop, maxRetries, maxConcurrency, timeout,...requestOptions } = options;
		const parameters = this.invocationParams(options);
		const watsonxCallbacks = this.invocationCallbacks(options);
		if (stream) {
			if (this.service) if (this.idOrName) return await this.service.deploymentGenerateTextStream({
				idOrName: this.idOrName,
				...requestOptions,
				parameters: {
					...parameters,
					prompt_variables: { input }
				},
				returnObject: true,
				signal
			});
			else return await this.service.generateTextStream({
				input,
				parameters,
				...this.scopeId(),
				...requestOptions,
				returnObject: true,
				signal
			}, watsonxCallbacks);
			else if (this.gateway) return await this.gateway.completion.create({
				...parameters,
				model: this.model,
				prompt: input,
				stream: true,
				signal,
				returnObject: true
			});
		} else if (this.service) {
			const tokenUsage = {
				generated_token_count: 0,
				input_token_count: 0
			};
			const textGenerationPromise = this.idOrName ? this.service.deploymentGenerateText({
				...requestOptions,
				idOrName: this.idOrName,
				parameters: {
					...parameters,
					prompt_variables: { input }
				},
				signal
			}, watsonxCallbacks) : this.service.generateText({
				input,
				parameters,
				...this.scopeId(),
				...requestOptions,
				signal
			}, watsonxCallbacks);
			const textGeneration = await textGenerationPromise;
			const singleGeneration = textGeneration.result.results.map((result) => {
				tokenUsage.generated_token_count += result.generated_token_count ? result.generated_token_count : 0;
				tokenUsage.input_token_count += result.input_token_count ? result.input_token_count : 0;
				return {
					text: result.generated_text,
					generationInfo: {
						stop_reason: result.stop_reason,
						input_token_count: result.input_token_count,
						generated_token_count: result.generated_token_count
					}
				};
			});
			return singleGeneration;
		} else if (this.gateway) {
			const textGeneration = await this.gateway.completion.create({
				...parameters,
				prompt: input,
				model: this.model,
				signal
			});
			const tokenUsage = textGeneration.result.usage;
			const singleGeneration = textGeneration.result.choices.map((choice) => {
				return {
					text: choice.text ?? "",
					generationInfo: {
						stop_reason: choice.finish_reason,
						input_token_count: tokenUsage?.prompt_tokens,
						generated_token_count: tokenUsage?.completion_tokens
					}
				};
			});
			return singleGeneration;
		}
		throw new Error("No service or gateway set. Please check your intsance init");
	}
	async completionWithRetry(callback, options) {
		const caller = new __langchain_core_utils_async_caller.AsyncCaller({
			maxConcurrency: options?.maxConcurrency || this.maxConcurrency,
			maxRetries: this.maxRetries
		});
		const result = options ? caller.callWithOptions({ signal: options.signal }, async () => callback()) : caller.call(async () => callback());
		return result;
	}
	async _generate(prompts, options, runManager) {
		const tokenUsage = {
			generated_token_count: 0,
			input_token_count: 0
		};
		if (this.streaming) {
			const generations = await Promise.all(prompts.map(async (prompt, promptIdx) => {
				const stream = this._streamResponseChunks(prompt, options);
				const geneartionsArray = [];
				for await (const chunk of stream) {
					const completion = chunk?.generationInfo?.completion ?? 0;
					const generationInfo = {
						text: "",
						stop_reason: "",
						generated_token_count: 0,
						input_token_count: 0
					};
					geneartionsArray[completion] ??= generationInfo;
					geneartionsArray[completion].generated_token_count = chunk?.generationInfo?.usage_metadata.generated_token_count ?? 0;
					geneartionsArray[completion].input_token_count += chunk?.generationInfo?.usage_metadata.input_token_count ?? 0;
					geneartionsArray[completion].stop_reason = chunk?.generationInfo?.stop_reason;
					geneartionsArray[completion].text += chunk.text;
					if (chunk.text) runManager?.handleLLMNewToken(chunk.text, {
						prompt: promptIdx,
						completion: 0
					});
				}
				return geneartionsArray.map((item) => {
					const { text,...rest } = item;
					tokenUsage.generated_token_count = rest.generated_token_count;
					tokenUsage.input_token_count += rest.input_token_count;
					return {
						text,
						generationInfo: rest
					};
				});
			}));
			const result = {
				generations,
				llmOutput: { tokenUsage }
			};
			return result;
		} else {
			const generations = await Promise.all(prompts.map(async (prompt) => {
				const callback = () => this.generateSingleMessage(prompt, options, false);
				const response = await this.completionWithRetry(callback, options);
				const [generated_token_count, input_token_count] = response.reduce((acc, curr) => {
					let generated = 0;
					let inputed = 0;
					if (curr?.generationInfo?.generated_token_count) generated = curr.generationInfo.generated_token_count + acc[0];
					if (curr?.generationInfo?.input_token_count) inputed = curr.generationInfo.input_token_count + acc[1];
					return [generated, inputed];
				}, [0, 0]);
				tokenUsage.generated_token_count += generated_token_count;
				tokenUsage.input_token_count += input_token_count;
				return response;
			}));
			const result = {
				generations,
				llmOutput: { tokenUsage }
			};
			return result;
		}
	}
	async getNumTokens(content, options) {
		if (this.service) {
			const { service } = this;
			const params = {
				...this.scopeId(),
				input: content,
				parameters: options
			};
			const callback = () => service.tokenizeText(params);
			const response = await this.completionWithRetry(callback);
			return response.result.result.token_count;
		} else throw new Error("This method is not supported in model gateway");
	}
	async *_streamResponseChunks(prompt, options, runManager) {
		const callback = () => this.generateSingleMessage(prompt, options, true);
		const streamInferDeployedPrompt = await this.completionWithRetry(callback);
		const responseChunk = {
			id: 0,
			event: "",
			data: { results: [] }
		};
		for await (const chunk of streamInferDeployedPrompt) {
			const results = "model_id" in chunk.data ? chunk.data.results : chunk.data.choices;
			const usage = "usage" in chunk.data ? chunk.data.usage : {};
			for (const [index, item] of results.entries()) {
				const params = "generated_text" in item ? {
					text: item.generated_text,
					generationInfo: {
						stop_reason: item.stop_reason,
						completion: index,
						usage_metadata: {
							generated_token_count: item.generated_token_count,
							input_token_count: item.input_token_count,
							stop_reason: item.stop_reason
						}
					}
				} : {
					text: item.text ?? "",
					generationInfo: {
						stop_reason: item.finish_reason,
						completion: index,
						usage_metadata: {
							generated_token_count: usage?.completion_tokens,
							input_token_count: usage?.prompt_tokens,
							stop_reason: item.finish_reason
						}
					}
				};
				yield new __langchain_core_outputs.GenerationChunk(params);
				if (!this.streaming) runManager?.handleLLMNewToken("generated_text" in item ? item.generated_text : item.text ?? "");
			}
			Object.assign(responseChunk, {
				id: 0,
				event: "",
				data: {}
			});
		}
	}
	_llmType() {
		return "watsonx";
	}
};

//#endregion
exports.WatsonxLLM = WatsonxLLM;
Object.defineProperty(exports, 'ibm_exports', {
  enumerable: true,
  get: function () {
    return ibm_exports;
  }
});
//# sourceMappingURL=ibm.cjs.map