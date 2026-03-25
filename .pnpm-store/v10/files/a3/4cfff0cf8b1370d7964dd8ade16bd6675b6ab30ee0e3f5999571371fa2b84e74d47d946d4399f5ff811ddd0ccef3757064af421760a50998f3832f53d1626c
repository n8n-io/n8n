const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_utils_event_source_parse = require('../utils/event_source_parse.cjs');
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_language_models_llms = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/llms"));

//#region src/llms/togetherai.ts
var togetherai_exports = {};
require_rolldown_runtime.__export(togetherai_exports, { TogetherAI: () => TogetherAI });
var TogetherAI = class extends __langchain_core_language_models_llms.LLM {
	lc_serializable = true;
	static inputs;
	temperature = .7;
	topP = .7;
	topK = 50;
	modelName;
	model;
	streaming = false;
	repetitionPenalty = 1;
	logprobs;
	maxTokens;
	safetyModel;
	stop;
	apiKey;
	inferenceAPIUrl = "https://api.together.xyz/inference";
	static lc_name() {
		return "TogetherAI";
	}
	/**
	* Check if a model name appears to be a chat/instruct model
	* @param modelName The model name to check
	* @returns true if the model appears to be a chat/instruct model
	*/
	isChatModel(modelName) {
		const chatModelPatterns = [
			/instruct/i,
			/chat/i,
			/vision/i,
			/turbo/i
		];
		return chatModelPatterns.some((pattern) => pattern.test(modelName));
	}
	constructor(inputs) {
		super(inputs);
		const apiKey = inputs.apiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("TOGETHER_AI_API_KEY");
		if (!apiKey) throw new Error("TOGETHER_AI_API_KEY not found.");
		if (!inputs.model && !inputs.modelName) throw new Error("Model name is required for TogetherAI.");
		this.apiKey = apiKey;
		this.temperature = inputs?.temperature ?? this.temperature;
		this.topK = inputs?.topK ?? this.topK;
		this.topP = inputs?.topP ?? this.topP;
		this.modelName = inputs.model ?? inputs.modelName ?? "";
		this.model = this.modelName;
		this.streaming = inputs.streaming ?? this.streaming;
		this.repetitionPenalty = inputs.repetitionPenalty ?? this.repetitionPenalty;
		this.logprobs = inputs.logprobs;
		this.safetyModel = inputs.safetyModel;
		this.maxTokens = inputs.maxTokens;
		this.stop = inputs.stop;
		if (this.isChatModel(this.model)) console.warn(`Warning: Model '${this.model}' appears to be a chat/instruct model. Consider using ChatTogetherAI from @langchain/community/chat_models/togetherai instead.`);
	}
	_llmType() {
		return "together_ai";
	}
	constructHeaders() {
		return {
			accept: "application/json",
			"content-type": "application/json",
			Authorization: `Bearer ${this.apiKey}`
		};
	}
	constructBody(prompt, options) {
		const body = {
			model: options?.model ?? options?.modelName ?? this?.model,
			prompt,
			temperature: this?.temperature ?? options?.temperature,
			top_k: this?.topK ?? options?.topK,
			top_p: this?.topP ?? options?.topP,
			repetition_penalty: this?.repetitionPenalty ?? options?.repetitionPenalty,
			logprobs: this?.logprobs ?? options?.logprobs,
			stream_tokens: this?.streaming,
			safety_model: this?.safetyModel ?? options?.safetyModel,
			max_tokens: this?.maxTokens ?? options?.maxTokens,
			stop: this?.stop ?? options?.stop
		};
		return body;
	}
	async completionWithRetry(prompt, options) {
		return this.caller.call(async () => {
			const fetchResponse = await fetch(this.inferenceAPIUrl, {
				method: "POST",
				headers: { ...this.constructHeaders() },
				body: JSON.stringify(this.constructBody(prompt, options))
			});
			if (fetchResponse.status === 200) return fetchResponse.json();
			const errorResponse = await fetchResponse.json();
			throw new Error(`Error getting prompt completion from Together AI. ${JSON.stringify(errorResponse, null, 2)}`);
		});
	}
	/** @ignore */
	async _call(prompt, options) {
		const response = await this.completionWithRetry(prompt, options);
		if (!response.output && !response.choices) throw new Error(`Unexpected response format from Together AI. The model '${this.model}' may require the ChatTogetherAI class instead of TogetherAI class. Response: ${JSON.stringify(response, null, 2)}`);
		if (response.output) return response.output.choices?.[0]?.text ?? "";
		else return response.choices?.[0]?.text ?? "";
	}
	async *_streamResponseChunks(prompt, options, runManager) {
		const fetchResponse = await fetch(this.inferenceAPIUrl, {
			method: "POST",
			headers: { ...this.constructHeaders() },
			body: JSON.stringify(this.constructBody(prompt, options))
		});
		if (fetchResponse.status !== 200 || !fetchResponse.body) {
			const errorResponse = await fetchResponse.json();
			throw new Error(`Error getting prompt completion from Together AI. ${JSON.stringify(errorResponse, null, 2)}`);
		}
		const stream = require_utils_event_source_parse.convertEventStreamToIterableReadableDataStream(fetchResponse.body);
		for await (const chunk of stream) if (chunk !== "[DONE]") {
			const parsedChunk = JSON.parse(chunk);
			const generationChunk = new __langchain_core_outputs.GenerationChunk({ text: parsedChunk.choices[0].text ?? "" });
			yield generationChunk;
			runManager?.handleLLMNewToken(generationChunk.text ?? "");
		}
	}
};

//#endregion
exports.TogetherAI = TogetherAI;
Object.defineProperty(exports, 'togetherai_exports', {
  enumerable: true,
  get: function () {
    return togetherai_exports;
  }
});
//# sourceMappingURL=togetherai.cjs.map