const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_language_models_llms = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/llms"));

//#region src/llms/hf.ts
var hf_exports = {};
require_rolldown_runtime.__export(hf_exports, { HuggingFaceInference: () => HuggingFaceInference });
/**
* Class implementing the Large Language Model (LLM) interface using the
* Hugging Face Inference API for text generation.
* @example
* ```typescript
* const model = new HuggingFaceInference({
*   model: "gpt2",
*   temperature: 0.7,
*   maxTokens: 50,
* });
*
* const res = await model.invoke(
*   "Question: What would be a good company name for a company that makes colorful socks?\nAnswer:"
* );
* console.log({ res });
* ```
*/
var HuggingFaceInference = class HuggingFaceInference extends __langchain_core_language_models_llms.LLM {
	lc_serializable = true;
	get lc_secrets() {
		return { apiKey: "HUGGINGFACEHUB_API_KEY" };
	}
	model = "gpt2";
	temperature = void 0;
	maxTokens = void 0;
	stopSequences = void 0;
	topP = void 0;
	topK = void 0;
	frequencyPenalty = void 0;
	apiKey = void 0;
	endpointUrl = void 0;
	includeCredentials = void 0;
	constructor(fields) {
		super(fields ?? {});
		this.model = fields?.model ?? this.model;
		this.temperature = fields?.temperature ?? this.temperature;
		this.maxTokens = fields?.maxTokens ?? this.maxTokens;
		this.stopSequences = fields?.stopSequences ?? this.stopSequences;
		this.topP = fields?.topP ?? this.topP;
		this.topK = fields?.topK ?? this.topK;
		this.frequencyPenalty = fields?.frequencyPenalty ?? this.frequencyPenalty;
		this.apiKey = fields?.apiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("HUGGINGFACEHUB_API_KEY");
		this.endpointUrl = fields?.endpointUrl;
		this.includeCredentials = fields?.includeCredentials;
		if (!this.apiKey) throw new Error(`Please set an API key for HuggingFace Hub in the environment variable "HUGGINGFACEHUB_API_KEY" or in the apiKey field of the HuggingFaceInference constructor.`);
	}
	_llmType() {
		return "hf";
	}
	invocationParams(options) {
		return {
			model: this.model,
			parameters: {
				return_full_text: false,
				temperature: this.temperature,
				max_new_tokens: this.maxTokens,
				stop: options?.stop ?? this.stopSequences,
				top_p: this.topP,
				top_k: this.topK,
				repetition_penalty: this.frequencyPenalty
			}
		};
	}
	async *_streamResponseChunks(prompt, options, runManager) {
		const hfi = await this._prepareHFInference();
		const stream = await this.caller.call(async () => hfi.textGenerationStream({
			...this.invocationParams(options),
			inputs: prompt
		}));
		for await (const chunk of stream) {
			const token = chunk.token.text;
			yield new __langchain_core_outputs.GenerationChunk({
				text: token,
				generationInfo: chunk
			});
			await runManager?.handleLLMNewToken(token ?? "");
			if (chunk.generated_text) yield new __langchain_core_outputs.GenerationChunk({
				text: "",
				generationInfo: { finished: true }
			});
		}
	}
	/** @ignore */
	async _call(prompt, options) {
		const hfi = await this._prepareHFInference();
		const args = {
			...this.invocationParams(options),
			inputs: prompt
		};
		const res = await this.caller.callWithOptions({ signal: options.signal }, hfi.textGeneration.bind(hfi), args);
		return res.generated_text;
	}
	/** @ignore */
	async _prepareHFInference() {
		const { HfInference } = await HuggingFaceInference.imports();
		const hfi = new HfInference(this.apiKey, { includeCredentials: this.includeCredentials });
		return this.endpointUrl ? hfi.endpoint(this.endpointUrl) : hfi;
	}
	/** @ignore */
	static async imports() {
		try {
			const { HfInference } = await import("@huggingface/inference");
			return { HfInference };
		} catch {
			throw new Error("Please install huggingface as a dependency with, e.g. `pnpm install @huggingface/inference`");
		}
	}
};

//#endregion
exports.HuggingFaceInference = HuggingFaceInference;
Object.defineProperty(exports, 'hf_exports', {
  enumerable: true,
  get: function () {
    return hf_exports;
  }
});
//# sourceMappingURL=hf.cjs.map