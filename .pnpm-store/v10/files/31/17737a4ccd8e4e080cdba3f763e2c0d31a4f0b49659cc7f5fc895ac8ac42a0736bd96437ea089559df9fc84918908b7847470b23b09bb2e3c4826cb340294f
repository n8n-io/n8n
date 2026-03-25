import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { chunkArray } from "@langchain/core/utils/chunk_array";
import { v4 } from "uuid";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/turbopuffer.ts
var turbopuffer_exports = {};
__export(turbopuffer_exports, { TurbopufferVectorStore: () => TurbopufferVectorStore });
/**
* @deprecated Use `TurbopufferVectorStore` from `@langchain/turbopuffer` instead.
* The new package uses the official SDK and supports document deletion, region
* configuration, and returns document IDs in search results.
*/
var TurbopufferVectorStore = class extends VectorStore {
	get lc_secrets() {
		return { apiKey: "TURBOPUFFER_API_KEY" };
	}
	get lc_aliases() {
		return { apiKey: "TURBOPUFFER_API_KEY" };
	}
	static lc_name() {
		return "TurbopufferVectorStore";
	}
	distanceMetric = "cosine_distance";
	apiKey;
	namespace = "default";
	apiUrl = "https://api.turbopuffer.com/v1";
	caller;
	batchSize = 3e3;
	_vectorstoreType() {
		return "turbopuffer";
	}
	constructor(embeddings, args) {
		super(embeddings, args);
		const { apiKey: argsApiKey, namespace, distanceMetric, apiUrl, batchSize,...asyncCallerArgs } = args;
		const apiKey = argsApiKey ?? getEnvironmentVariable("TURBOPUFFER_API_KEY");
		if (!apiKey) throw new Error(`Turbopuffer API key not found.\nPlease pass it in as "apiKey" or set it as an environment variable called "TURBOPUFFER_API_KEY"`);
		this.apiKey = apiKey;
		this.namespace = namespace ?? this.namespace;
		this.distanceMetric = distanceMetric ?? this.distanceMetric;
		this.apiUrl = apiUrl ?? this.apiUrl;
		this.batchSize = batchSize ?? this.batchSize;
		this.caller = new AsyncCaller({
			maxConcurrency: 6,
			maxRetries: 0,
			...asyncCallerArgs
		});
	}
	defaultHeaders() {
		return {
			Authorization: `Bearer ${this.apiKey}`,
			"Content-Type": "application/json"
		};
	}
	async callWithRetry(fetchUrl, stringifiedBody, method = "POST") {
		const json = await this.caller.call(async () => {
			const headers = { Authorization: `Bearer ${this.apiKey}` };
			if (stringifiedBody !== void 0) headers["Content-Type"] = "application/json";
			const response = await fetch(fetchUrl, {
				method,
				headers,
				body: stringifiedBody
			});
			if (response.status !== 200) {
				const error = /* @__PURE__ */ new Error(`Failed to call turbopuffer. Response status ${response.status}\nFull response: ${await response.text()}`);
				error.response = response;
				throw error;
			}
			return response.json();
		});
		return json;
	}
	async addVectors(vectors, documents, options) {
		if (options?.ids && options.ids.length !== vectors.length) throw new Error("Number of ids provided does not match number of vectors");
		if (documents.length !== vectors.length) throw new Error("Number of documents provided does not match number of vectors");
		if (documents.length === 0) throw new Error("No documents provided");
		const batchedVectors = chunkArray(vectors, this.batchSize);
		const batchedDocuments = chunkArray(documents, this.batchSize);
		const batchedIds = options?.ids ? chunkArray(options.ids, this.batchSize) : batchedDocuments.map((docs) => docs.map((_) => v4()));
		const batchRequests = batchedVectors.map(async (batchVectors, index) => {
			const batchDocs = batchedDocuments[index];
			const batchIds = batchedIds[index];
			if (batchIds.length !== batchVectors.length) throw new Error("Number of ids provided does not match number of vectors");
			const attributes = { __lc_page_content: batchDocs.map((doc) => doc.pageContent) };
			const usedMetadataFields = new Set(batchDocs.map((doc) => Object.keys(doc.metadata)).flat());
			for (const key of usedMetadataFields) attributes[key] = batchDocs.map((doc) => {
				if (doc.metadata[key] !== void 0) if (typeof doc.metadata[key] === "string") return doc.metadata[key];
				else {
					console.warn([`[WARNING]: Dropping non-string metadata key "${key}" with value "${JSON.stringify(doc.metadata[key])}".`, `turbopuffer currently supports only string metadata values.`].join("\n"));
					return null;
				}
				else return null;
			});
			const data = {
				ids: batchIds,
				vectors: batchVectors,
				distance_metric: this.distanceMetric,
				attributes
			};
			return this.callWithRetry(`${this.apiUrl}/vectors/${this.namespace}`, JSON.stringify(data));
		});
		await Promise.all(batchRequests);
		return batchedIds.flat();
	}
	async delete(params) {
		if (params.deleteIndex) await this.callWithRetry(`${this.apiUrl}/vectors/${this.namespace}`, void 0, "DELETE");
		else throw new Error(`You must provide a "deleteIndex" flag.`);
	}
	async addDocuments(documents, options) {
		const vectors = await this.embeddings.embedDocuments(documents.map((doc) => doc.pageContent));
		return this.addVectors(vectors, documents, options);
	}
	async queryVectors(query, k, includeVector, filter) {
		const data = {
			vector: query,
			top_k: k,
			distance_metric: this.distanceMetric,
			filters: filter,
			include_attributes: true,
			include_vectors: includeVector
		};
		return this.callWithRetry(`${this.apiUrl}/vectors/${this.namespace}/query`, JSON.stringify(data));
	}
	async similaritySearchVectorWithScore(query, k, filter) {
		const search = await this.queryVectors(query, k, false, filter);
		const result = search.map((res) => {
			const { __lc_page_content,...metadata } = res.attributes;
			return [new Document({
				pageContent: __lc_page_content,
				metadata
			}), res.dist];
		});
		return result;
	}
	static async fromDocuments(docs, embeddings, dbConfig) {
		const instance = new this(embeddings, dbConfig);
		await instance.addDocuments(docs);
		return instance;
	}
};

//#endregion
export { TurbopufferVectorStore, turbopuffer_exports };
//# sourceMappingURL=turbopuffer.js.map