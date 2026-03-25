import { removeAdditionalProperties, schemaToGeminiParameters } from "./utils/zod_to_gemini_parameters.js";
import { DefaultGeminiSafetyHandler, getGeminiAPI } from "./utils/gemini.js";
import { convertToGeminiTools, copyAIModelParams, copyAndValidateModelParamsInto } from "./utils/common.js";
import { ensureParams } from "./utils/failed_handler.js";
import { AbstractGoogleLLMConnection } from "./connection.js";
import { ApiKeyGoogleAuth } from "./auth.js";
import PROFILES from "./profiles.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { AIMessageChunk } from "@langchain/core/messages";
import { concat } from "@langchain/core/utils/stream";
import { isInteropZodSchema } from "@langchain/core/utils/types";
import { isSerializableSchema } from "@langchain/core/utils/standard_schema";
import { assembleStructuredOutputPipeline, createContentParser, createFunctionCallingParser } from "@langchain/core/language_models/structured_output";

//#region src/chat_models.ts
var ChatConnection = class extends AbstractGoogleLLMConnection {
	convertSystemMessageToHumanContent;
	constructor(fields, caller, client, streaming) {
		super(fields, caller, client, streaming);
		this.convertSystemMessageToHumanContent = fields?.convertSystemMessageToHumanContent;
	}
	get useSystemInstruction() {
		return typeof this.convertSystemMessageToHumanContent === "boolean" ? !this.convertSystemMessageToHumanContent : this.computeUseSystemInstruction;
	}
	get computeUseSystemInstruction() {
		if (this.modelFamily === "palm") return false;
		else if (this.modelName === "gemini-1.0-pro-001") return false;
		else if (this.modelName.startsWith("gemini-pro-vision")) return false;
		else if (this.modelName.startsWith("gemini-1.0-pro-vision")) return false;
		else if (this.modelName === "gemini-pro" && this.platform === "gai") return false;
		else if (this.modelFamily === "gemma") return false;
		return true;
	}
	computeGoogleSearchToolAdjustmentFromModel() {
		if (this.modelName.startsWith("gemini-1.0")) return "googleSearchRetrieval";
		else if (this.modelName.startsWith("gemini-1.5")) return "googleSearchRetrieval";
		else return "googleSearch";
	}
	computeGoogleSearchToolAdjustment(apiConfig) {
		const adj = apiConfig.googleSearchToolAdjustment;
		if (adj === void 0 || adj === true) return this.computeGoogleSearchToolAdjustmentFromModel();
		else return adj;
	}
	buildGeminiAPI() {
		const apiConfig = this.apiConfig ?? {};
		const googleSearchToolAdjustment = this.computeGoogleSearchToolAdjustment(apiConfig);
		return getGeminiAPI({
			useSystemInstruction: this.useSystemInstruction,
			googleSearchToolAdjustment,
			...apiConfig
		});
	}
	get api() {
		switch (this.apiName) {
			case "google": return this.buildGeminiAPI();
			default: return super.api;
		}
	}
};
/**
* Integration with a Google chat model.
*/
var ChatGoogleBase = class extends BaseChatModel {
	static lc_name() {
		return "ChatGoogle";
	}
	get lc_secrets() {
		return { authOptions: "GOOGLE_AUTH_OPTIONS" };
	}
	lc_serializable = true;
	model;
	modelName = "gemini-pro";
	temperature;
	maxOutputTokens;
	maxReasoningTokens;
	topP;
	topK;
	seed;
	presencePenalty;
	frequencyPenalty;
	stopSequences = [];
	logprobs;
	topLogprobs = 0;
	safetySettings = [];
	responseModalities;
	convertSystemMessageToHumanContent;
	safetyHandler;
	speechConfig;
	streamUsage = true;
	streaming = false;
	labels;
	connection;
	streamedConnection;
	constructor(fields) {
		super(ensureParams(fields));
		this._addVersion("@langchain/google-common", "2.1.24");
		copyAndValidateModelParamsInto(fields, this);
		this.safetyHandler = fields?.safetyHandler ?? new DefaultGeminiSafetyHandler();
		this.streamUsage = fields?.streamUsage ?? this.streamUsage;
		const client = this.buildClient(fields);
		this.buildConnection(fields ?? {}, client);
	}
	getLsParams(options) {
		const params = this.invocationParams(options);
		return {
			ls_provider: "google_vertexai",
			ls_model_name: this.model,
			ls_model_type: "chat",
			ls_temperature: params.temperature ?? void 0,
			ls_max_tokens: params.maxOutputTokens ?? void 0,
			ls_stop: options.stop
		};
	}
	buildApiKeyClient(apiKey) {
		return new ApiKeyGoogleAuth(apiKey);
	}
	buildApiKey(fields) {
		return fields?.apiKey ?? getEnvironmentVariable("GOOGLE_API_KEY");
	}
	buildClient(fields) {
		const apiKey = this.buildApiKey(fields);
		if (apiKey) return this.buildApiKeyClient(apiKey);
		else return this.buildAbstractedClient(fields);
	}
	buildConnection(fields, client) {
		this.connection = new ChatConnection({
			...fields,
			...this
		}, this.caller, client, false);
		this.streamedConnection = new ChatConnection({
			...fields,
			...this
		}, this.caller, client, true);
	}
	get platform() {
		return this.connection.platform;
	}
	bindTools(tools, kwargs) {
		return this.withConfig({
			tools: convertToGeminiTools(tools),
			...kwargs
		});
	}
	_llmType() {
		return "google";
	}
	/**
	* Get the parameters used to invoke the model
	*/
	invocationParams(options) {
		return copyAIModelParams(this, options);
	}
	async _generate(messages, options, runManager) {
		options.signal?.throwIfAborted();
		const parameters = this.invocationParams(options);
		if (this.streaming) {
			const stream = this._streamResponseChunks(messages, options, runManager);
			let finalChunk = null;
			for await (const chunk of stream) finalChunk = !finalChunk ? chunk : concat(finalChunk, chunk);
			if (!finalChunk) throw new Error("No chunks were returned from the stream.");
			return { generations: [finalChunk] };
		}
		const response = await this.connection.request(messages, parameters, options, runManager);
		const ret = this.connection.api.responseToChatResult(response);
		const chunk = ret?.generations?.[0];
		if (chunk) await runManager?.handleLLMNewToken(chunk.text || "");
		return ret;
	}
	async *_streamResponseChunks(_messages, options, runManager) {
		const parameters = this.invocationParams(options);
		const stream = (await this.streamedConnection.request(_messages, parameters, options, runManager)).data;
		let usageMetadata;
		while (!stream.streamDone) {
			if (options.signal?.aborted) return;
			const output = await stream.nextChunk();
			await runManager?.handleCustomEvent(`google-chunk-${this.constructor.name}`, { output });
			if (output && output.usageMetadata && this.streamUsage !== false && options.streamUsage !== false) usageMetadata = {
				input_tokens: output.usageMetadata.promptTokenCount,
				output_tokens: output.usageMetadata.candidatesTokenCount,
				total_tokens: output.usageMetadata.totalTokenCount
			};
			const chunk = output !== null ? this.connection.api.responseToChatGeneration({ data: output }) : new ChatGenerationChunk({
				text: "",
				generationInfo: { finishReason: "stop" },
				message: new AIMessageChunk({
					content: "",
					usage_metadata: usageMetadata
				})
			});
			if (chunk) {
				yield chunk;
				await runManager?.handleLLMNewToken(chunk.text ?? "", void 0, void 0, void 0, void 0, { chunk });
			}
		}
	}
	/** @ignore */
	_combineLLMOutput() {
		return [];
	}
	/**
	* Return profiling information for the model.
	*
	* Provides information about the model's capabilities and constraints,
	* including token limits, multimodal support, and advanced features like
	* tool calling and structured output.
	*
	* @returns {ModelProfile} An object describing the model's capabilities and constraints
	*/
	get profile() {
		return PROFILES[this.model] ?? {};
	}
	withStructuredOutput(outputSchema, config) {
		const schema = outputSchema;
		const name = config?.name;
		const method = config?.method;
		const includeRaw = config?.includeRaw;
		if (method === "jsonMode") throw new Error(`Google only supports "jsonSchema" or "functionCalling" as a method.`);
		let llm;
		let outputParser;
		if (method === "functionCalling") {
			let functionName = name ?? "extract";
			let geminiFunctionDeclaration;
			if (isInteropZodSchema(schema) || isSerializableSchema(schema)) {
				const jsonSchema = schemaToGeminiParameters(schema);
				geminiFunctionDeclaration = {
					name: functionName,
					description: jsonSchema.description ?? "A function available to call.",
					parameters: jsonSchema
				};
			} else if (typeof schema.name === "string" && typeof schema.parameters === "object" && schema.parameters != null) {
				geminiFunctionDeclaration = schema;
				functionName = schema.name;
			} else {
				const parameters = removeAdditionalProperties(schema);
				geminiFunctionDeclaration = {
					name: functionName,
					description: schema.description ?? "",
					parameters
				};
			}
			const tools = [{ functionDeclarations: [geminiFunctionDeclaration] }];
			llm = this.bindTools(tools).withConfig({ tool_choice: functionName });
			outputParser = createFunctionCallingParser(schema, functionName);
		} else {
			const jsonSchema = schemaToGeminiParameters(schema);
			llm = this.withConfig({ responseSchema: jsonSchema });
			outputParser = createContentParser(schema);
		}
		return assembleStructuredOutputPipeline(llm, outputParser, includeRaw, includeRaw ? "StructuredOutputRunnable" : "ChatGoogleStructuredOutput");
	}
};

//#endregion
export { ChatConnection, ChatGoogleBase };
//# sourceMappingURL=chat_models.js.map