const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_embeddings = require_rolldown_runtime.__toESM(require("@langchain/core/embeddings"));
const __langchain_core_utils_chunk_array = require_rolldown_runtime.__toESM(require("@langchain/core/utils/chunk_array"));

//#region src/embeddings/huggingface_transformers.ts
var huggingface_transformers_exports = {};
require_rolldown_runtime.__export(huggingface_transformers_exports, { HuggingFaceTransformersEmbeddings: () => HuggingFaceTransformersEmbeddings });
/**
* @example
* ```typescript
* const model = new HuggingFaceTransformersEmbeddings({
*   model: "Xenova/all-MiniLM-L6-v2",
* });
*
* // Embed a single query
* const res = await model.embedQuery(
*   "What would be a good company name for a company that makes colorful socks?"
* );
* console.log({ res });
*
* // Embed multiple documents
* const documentRes = await model.embedDocuments(["Hello world", "Bye bye"]);
* console.log({ documentRes });
* ```
*/
var HuggingFaceTransformersEmbeddings = class extends __langchain_core_embeddings.Embeddings {
	model = "Xenova/all-MiniLM-L6-v2";
	batchSize = 512;
	stripNewLines = true;
	timeout;
	pretrainedOptions;
	pipelineOptions;
	pipelinePromise = null;
	constructor(fields) {
		super(fields ?? {});
		this.model = fields?.model ?? this.model;
		this.stripNewLines = fields?.stripNewLines ?? this.stripNewLines;
		this.timeout = fields?.timeout;
		this.pretrainedOptions = fields?.pretrainedOptions ?? {};
		this.pipelineOptions = {
			pooling: "mean",
			normalize: true,
			...fields?.pipelineOptions
		};
	}
	async embedDocuments(texts) {
		const batches = (0, __langchain_core_utils_chunk_array.chunkArray)(this.stripNewLines ? texts.map((t) => t.replace(/\n/g, " ")) : texts, this.batchSize);
		const batchRequests = batches.map((batch) => this.runEmbedding(batch));
		const batchResponses = await Promise.all(batchRequests);
		const embeddings = [];
		for (let i = 0; i < batchResponses.length; i += 1) {
			const batchResponse = batchResponses[i];
			for (let j = 0; j < batchResponse.length; j += 1) embeddings.push(batchResponse[j]);
		}
		return embeddings;
	}
	async embedQuery(text) {
		const data = await this.runEmbedding([this.stripNewLines ? text.replace(/\n/g, " ") : text]);
		return data[0];
	}
	async runEmbedding(texts) {
		if (!this.pipelinePromise) this.pipelinePromise = (async () => {
			const transformers = await import("@huggingface/transformers");
			const pipeline = transformers.pipeline;
			const result = await pipeline("feature-extraction", this.model, this.pretrainedOptions);
			return result;
		})();
		const pipe = await this.pipelinePromise;
		return this.caller.call(async () => {
			const output = await pipe(texts, this.pipelineOptions);
			return output.tolist();
		});
	}
};

//#endregion
exports.HuggingFaceTransformersEmbeddings = HuggingFaceTransformersEmbeddings;
Object.defineProperty(exports, 'huggingface_transformers_exports', {
  enumerable: true,
  get: function () {
    return huggingface_transformers_exports;
  }
});
//# sourceMappingURL=huggingface_transformers.cjs.map