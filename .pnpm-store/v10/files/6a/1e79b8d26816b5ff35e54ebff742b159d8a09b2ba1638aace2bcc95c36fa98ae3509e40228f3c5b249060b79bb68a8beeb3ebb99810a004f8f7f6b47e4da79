const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const require_client = require('./client.cjs');
const __langchain_core_embeddings = require_rolldown_runtime.__toESM(require("@langchain/core/embeddings"));

//#region src/embeddings.ts
var PineconeEmbeddings = class extends __langchain_core_embeddings.Embeddings {
	client;
	model;
	params;
	constructor(fields) {
		const defaultFields = {
			maxRetries: 3,
			...fields
		};
		super(defaultFields);
		if (defaultFields.apiKey) {
			const config = {
				apiKey: defaultFields.apiKey,
				controllerHostUrl: defaultFields.controllerHostUrl,
				fetchApi: defaultFields.fetchApi,
				additionalHeaders: defaultFields.additionalHeaders,
				sourceTag: defaultFields.sourceTag
			};
			this.client = require_client.getPineconeClient(config);
		} else this.client = require_client.getPineconeClient();
		if (!defaultFields.model) this.model = "multilingual-e5-large";
		else this.model = defaultFields.model;
		const defaultParams = { inputType: "passage" };
		if (defaultFields.params) this.params = {
			...defaultFields.params,
			...defaultParams
		};
		else this.params = defaultParams;
	}
	async embedDocuments(texts) {
		if (texts.length === 0) throw new Error("At least one document is required to generate embeddings");
		let embeddings;
		if (this.params) embeddings = await this.caller.call(async () => {
			const result = await this.client.inference.embed(this.model, texts, this.params);
			return result;
		});
		else embeddings = await this.caller.call(async () => {
			const result = await this.client.inference.embed(this.model, texts, {});
			return result;
		});
		const embeddingsList = [];
		for (let i = 0; i < embeddings.data.length; i += 1) {
			const embedding = embeddings.data[i];
			if ("values" in embedding && embedding.values) embeddingsList.push(embedding.values);
		}
		return embeddingsList;
	}
	async embedQuery(text) {
		this.params.inputType = "query";
		if (!text) throw new Error("No query passed for which to generate embeddings");
		let embeddings;
		if (this.params) embeddings = await this.caller.call(async () => {
			return await this.client.inference.embed(this.model, [text], this.params);
		});
		else embeddings = await this.caller.call(async () => {
			return await this.client.inference.embed(this.model, [text], {});
		});
		if ("values" in embeddings.data[0]) return embeddings.data[0].values;
		else return [];
	}
};

//#endregion
exports.PineconeEmbeddings = PineconeEmbeddings;
//# sourceMappingURL=embeddings.cjs.map