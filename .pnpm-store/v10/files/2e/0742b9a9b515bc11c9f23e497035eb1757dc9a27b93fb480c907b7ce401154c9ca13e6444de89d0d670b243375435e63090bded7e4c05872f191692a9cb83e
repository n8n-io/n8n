const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const ollama_browser = require_rolldown_runtime.__toESM(require("ollama/browser"));
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));
const __langchain_core_language_models_llms = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/llms"));

//#region src/llms.ts
/**
* Class that represents the Ollama language model. It extends the base
* LLM class and implements the OllamaInput interface.
* @example
* ```typescript
* const ollama = new Ollama({
*   baseUrl: "http://api.example.com",
*   model: "llama3",
* });
*
* // Streaming translation from English to German
* const stream = await ollama.stream(
*   `Translate "I love programming" into German.`
* );
*
* const chunks = [];
* for await (const chunk of stream) {
*   chunks.push(chunk);
* }
*
* console.log(chunks.join(""));
* ```
*/
var Ollama = class extends __langchain_core_language_models_llms.LLM {
	static lc_name() {
		return "Ollama";
	}
	lc_serializable = true;
	model = "llama3";
	baseUrl = "http://localhost:11434";
	keepAlive;
	embeddingOnly;
	f16KV;
	frequencyPenalty;
	logitsAll;
	lowVram;
	mainGpu;
	mirostat;
	mirostatEta;
	mirostatTau;
	numBatch;
	numCtx;
	numGpu;
	numKeep;
	numPredict;
	numThread;
	penalizeNewline;
	presencePenalty;
	repeatLastN;
	repeatPenalty;
	temperature;
	stop;
	tfsZ;
	topK;
	topP;
	typicalP;
	useMLock;
	useMMap;
	vocabOnly;
	format;
	client;
	constructor(fields) {
		super(fields ?? {});
		this.model = fields?.model ?? this.model;
		this.baseUrl = fields?.baseUrl?.endsWith("/") ? fields?.baseUrl.slice(0, -1) : fields?.baseUrl ?? this.baseUrl;
		this.client = new ollama_browser.Ollama({
			fetch: fields?.fetch,
			host: this.baseUrl,
			headers: fields?.headers
		});
		this.keepAlive = fields?.keepAlive;
		this.embeddingOnly = fields?.embeddingOnly;
		this.f16KV = fields?.f16Kv;
		this.frequencyPenalty = fields?.frequencyPenalty;
		this.logitsAll = fields?.logitsAll;
		this.lowVram = fields?.lowVram;
		this.mainGpu = fields?.mainGpu;
		this.mirostat = fields?.mirostat;
		this.mirostatEta = fields?.mirostatEta;
		this.mirostatTau = fields?.mirostatTau;
		this.numBatch = fields?.numBatch;
		this.numCtx = fields?.numCtx;
		this.numGpu = fields?.numGpu;
		this.numKeep = fields?.numKeep;
		this.numPredict = fields?.numPredict;
		this.numThread = fields?.numThread;
		this.penalizeNewline = fields?.penalizeNewline;
		this.presencePenalty = fields?.presencePenalty;
		this.repeatLastN = fields?.repeatLastN;
		this.repeatPenalty = fields?.repeatPenalty;
		this.temperature = fields?.temperature;
		this.stop = fields?.stop;
		this.tfsZ = fields?.tfsZ;
		this.topK = fields?.topK;
		this.topP = fields?.topP;
		this.typicalP = fields?.typicalP;
		this.useMLock = fields?.useMlock;
		this.useMMap = fields?.useMmap;
		this.vocabOnly = fields?.vocabOnly;
		this.format = fields?.format;
	}
	_llmType() {
		return "ollama";
	}
	invocationParams(options) {
		return {
			model: this.model,
			format: this.format,
			keep_alive: this.keepAlive,
			images: options?.images,
			options: {
				embedding_only: this.embeddingOnly,
				f16_kv: this.f16KV,
				frequency_penalty: this.frequencyPenalty,
				logits_all: this.logitsAll,
				low_vram: this.lowVram,
				main_gpu: this.mainGpu,
				mirostat: this.mirostat,
				mirostat_eta: this.mirostatEta,
				mirostat_tau: this.mirostatTau,
				num_batch: this.numBatch,
				num_ctx: this.numCtx,
				num_gpu: this.numGpu,
				num_keep: this.numKeep,
				num_predict: this.numPredict,
				num_thread: this.numThread,
				penalize_newline: this.penalizeNewline,
				presence_penalty: this.presencePenalty,
				repeat_last_n: this.repeatLastN,
				repeat_penalty: this.repeatPenalty,
				temperature: this.temperature,
				stop: options?.stop ?? this.stop,
				tfs_z: this.tfsZ,
				top_k: this.topK,
				top_p: this.topP,
				typical_p: this.typicalP,
				use_mlock: this.useMLock,
				use_mmap: this.useMMap,
				vocab_only: this.vocabOnly
			}
		};
	}
	async *_streamResponseChunks(prompt, options, runManager) {
		const stream = await this.caller.call(async () => this.client.generate({
			...this.invocationParams(options),
			prompt,
			stream: true
		}));
		for await (const chunk of stream) {
			if (options.signal?.aborted) throw new Error("This operation was aborted");
			if (!chunk.done) {
				yield new __langchain_core_outputs.GenerationChunk({
					text: chunk.response,
					generationInfo: {
						...chunk,
						response: void 0
					}
				});
				await runManager?.handleLLMNewToken(chunk.response ?? "");
			} else yield new __langchain_core_outputs.GenerationChunk({
				text: "",
				generationInfo: {
					model: chunk.model,
					total_duration: chunk.total_duration,
					load_duration: chunk.load_duration,
					prompt_eval_count: chunk.prompt_eval_count,
					prompt_eval_duration: chunk.prompt_eval_duration,
					eval_count: chunk.eval_count,
					eval_duration: chunk.eval_duration
				}
			});
		}
	}
	/** @ignore */
	async _call(prompt, options, runManager) {
		const chunks = [];
		for await (const chunk of this._streamResponseChunks(prompt, options, runManager)) chunks.push(chunk.text);
		return chunks.join("");
	}
};

//#endregion
exports.Ollama = Ollama;
//# sourceMappingURL=llms.cjs.map