const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const uuid = require_rolldown_runtime.__toESM(require("uuid"));
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));
const __langchain_core_utils_testing = require_rolldown_runtime.__toESM(require("@langchain/core/utils/testing"));

//#region src/vectorstores/vectara.ts
var vectara_exports = {};
require_rolldown_runtime.__export(vectara_exports, {
	DEFAULT_FILTER: () => DEFAULT_FILTER,
	VectaraStore: () => VectaraStore
});
const DEFAULT_FILTER = {
	start: 0,
	filter: "",
	lambda: 0,
	contextConfig: {
		sentencesBefore: 2,
		sentencesAfter: 2,
		startTag: "<b>",
		endTag: "</b>"
	},
	mmrConfig: {
		enabled: false,
		mmrTopK: 0,
		diversityBias: 0
	}
};
/**
* Class for interacting with the Vectara API. Extends the VectorStore
* class.
*/
var VectaraStore = class VectaraStore extends __langchain_core_vectorstores.VectorStore {
	get lc_secrets() {
		return {
			apiKey: "VECTARA_API_KEY",
			corpusId: "VECTARA_CORPUS_ID",
			customerId: "VECTARA_CUSTOMER_ID"
		};
	}
	get lc_aliases() {
		return {
			apiKey: "vectara_api_key",
			corpusId: "vectara_corpus_id",
			customerId: "vectara_customer_id"
		};
	}
	apiEndpoint = "api.vectara.io";
	apiKey;
	corpusId;
	customerId;
	verbose;
	source;
	vectaraApiTimeoutSeconds = 60;
	_vectorstoreType() {
		return "vectara";
	}
	constructor(args) {
		super(new __langchain_core_utils_testing.FakeEmbeddings(), args);
		const apiKey = args.apiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("VECTARA_API_KEY");
		if (!apiKey) throw new Error("Vectara api key is not provided.");
		this.apiKey = apiKey;
		this.source = args.source ?? "langchainjs";
		const corpusId = args.corpusId ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("VECTARA_CORPUS_ID")?.split(",").map((id) => {
			const num = Number(id);
			if (Number.isNaN(num)) throw new Error("Vectara corpus id is not a number.");
			return num;
		});
		if (!corpusId) throw new Error("Vectara corpus id is not provided.");
		if (typeof corpusId === "number") this.corpusId = [corpusId];
		else {
			if (corpusId.length === 0) throw new Error("Vectara corpus id is not provided.");
			this.corpusId = corpusId;
		}
		const customerId = args.customerId ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("VECTARA_CUSTOMER_ID");
		if (!customerId) throw new Error("Vectara customer id is not provided.");
		this.customerId = customerId;
		this.verbose = args.verbose ?? false;
	}
	/**
	* Returns a header for Vectara API calls.
	* @returns A Promise that resolves to a VectaraCallHeader object.
	*/
	async getJsonHeader() {
		return { headers: {
			"x-api-key": this.apiKey,
			"Content-Type": "application/json",
			"customer-id": this.customerId.toString(),
			"X-Source": this.source
		} };
	}
	/**
	* Throws an error, as this method is not implemented. Use addDocuments
	* instead.
	* @param _vectors Not used.
	* @param _documents Not used.
	* @returns Does not return a value.
	*/
	async addVectors(_vectors, _documents) {
		throw new Error("Method not implemented. Please call addDocuments instead.");
	}
	/**
	* Method to delete data from the Vectara corpus.
	* @param params an array of document IDs to be deleted
	* @returns Promise that resolves when the deletion is complete.
	*/
	async deleteDocuments(ids) {
		if (ids && ids.length > 0) {
			const headers = await this.getJsonHeader();
			for (const id of ids) {
				const data = {
					customer_id: this.customerId,
					corpus_id: this.corpusId[0],
					document_id: id
				};
				try {
					const controller = new AbortController();
					const timeout = setTimeout(() => controller.abort(), this.vectaraApiTimeoutSeconds * 1e3);
					const response = await fetch(`https://${this.apiEndpoint}/v1/delete-doc`, {
						method: "POST",
						headers: headers?.headers,
						body: JSON.stringify(data),
						signal: controller.signal
					});
					clearTimeout(timeout);
					if (response.status !== 200) throw new Error(`Vectara API returned status code ${response.status} when deleting document ${id}`);
				} catch (e) {
					const error = /* @__PURE__ */ new Error(`Error ${e.message}`);
					error.code = 500;
					throw error;
				}
			}
		} else throw new Error(`no "ids" specified for deletion`);
	}
	/**
	* Adds documents to the Vectara store.
	* @param documents An array of Document objects to add to the Vectara store.
	* @returns A Promise that resolves to an array of document IDs indexed in Vectara.
	*/
	async addDocuments(documents) {
		if (this.corpusId.length > 1) throw new Error("addDocuments does not support multiple corpus ids");
		const headers = await this.getJsonHeader();
		const doc_ids = [];
		let countAdded = 0;
		for (const document of documents) {
			const doc_id = document.metadata?.document_id ?? uuid.v4();
			const data = {
				customer_id: this.customerId,
				corpus_id: this.corpusId[0],
				document: {
					document_id: doc_id,
					title: document.metadata?.title ?? "",
					metadata_json: JSON.stringify(document.metadata ?? {}),
					section: [{ text: document.pageContent }]
				}
			};
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), this.vectaraApiTimeoutSeconds * 1e3);
				const response = await fetch(`https://${this.apiEndpoint}/v1/index`, {
					method: "POST",
					headers: headers?.headers,
					body: JSON.stringify(data),
					signal: controller.signal
				});
				clearTimeout(timeout);
				const result = await response.json();
				if (result.status?.code !== "OK" && result.status?.code !== "ALREADY_EXISTS") {
					const error = /* @__PURE__ */ new Error(`Vectara API returned status code ${result.status?.code}: ${JSON.stringify(result.message)}`);
					error.code = 500;
					throw error;
				} else {
					countAdded += 1;
					doc_ids.push(doc_id);
				}
			} catch (e) {
				const error = /* @__PURE__ */ new Error(`Error ${e.message} while adding document`);
				error.code = 500;
				throw error;
			}
		}
		if (this.verbose) console.log(`Added ${countAdded} documents to Vectara`);
		return doc_ids;
	}
	/**
	* Vectara provides a way to add documents directly via their API. This API handles
	* pre-processing and chunking internally in an optimal manner. This method is a wrapper
	* to utilize that API within LangChain.
	*
	* @param files An array of VectaraFile objects representing the files and their respective file names to be uploaded to Vectara.
	* @param metadata Optional. An array of metadata objects corresponding to each file in the `filePaths` array.
	* @returns A Promise that resolves to the number of successfully uploaded files.
	*/
	async addFiles(files, metadatas = void 0) {
		if (this.corpusId.length > 1) throw new Error("addFiles does not support multiple corpus ids");
		const doc_ids = [];
		for (const [index, file] of files.entries()) {
			const md = metadatas ? metadatas[index] : {};
			const data = new FormData();
			data.append("file", file.blob, file.fileName);
			data.append("doc-metadata", JSON.stringify(md));
			const response = await fetch(`https://api.vectara.io/v1/upload?c=${this.customerId}&o=${this.corpusId[0]}&d=true`, {
				method: "POST",
				headers: {
					"x-api-key": this.apiKey,
					"X-Source": this.source
				},
				body: data
			});
			const { status } = response;
			if (status === 409) throw new Error(`File at index ${index} already exists in Vectara`);
			else if (status !== 200) throw new Error(`Vectara API returned status code ${status}`);
			else {
				const result = await response.json();
				const doc_id = result.document.documentId;
				doc_ids.push(doc_id);
			}
		}
		if (this.verbose) console.log(`Uploaded ${files.length} files to Vectara`);
		return doc_ids;
	}
	/**
	* Performs a Vectara API call based on the arguments provided.
	* @param query The query string for the similarity search.
	* @param k Optional. The number of results to return. Default is 10.
	* @param filter Optional. A VectaraFilter object to refine the search results.
	* @returns A Promise that resolves to an array of tuples, each containing a Document and its score.
	*/
	async vectaraQuery(query, k, vectaraFilterObject, summary = {
		enabled: false,
		maxSummarizedResults: 0,
		responseLang: "eng"
	}) {
		const headers = await this.getJsonHeader();
		const { start, filter, lambda, contextConfig, mmrConfig } = vectaraFilterObject;
		const corpusKeys = this.corpusId.map((corpusId) => ({
			customerId: this.customerId,
			corpusId,
			metadataFilter: filter,
			lexicalInterpolationConfig: { lambda }
		}));
		const data = { query: [{
			query,
			start,
			numResults: mmrConfig?.enabled ? mmrConfig.mmrTopK : k,
			contextConfig,
			...mmrConfig?.enabled ? { rerankingConfig: {
				rerankerId: 272725718,
				mmrConfig: { diversityBias: mmrConfig.diversityBias }
			} } : {},
			corpusKey: corpusKeys,
			...summary?.enabled ? { summary: [summary] } : {}
		}] };
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.vectaraApiTimeoutSeconds * 1e3);
		const response = await fetch(`https://${this.apiEndpoint}/v1/query`, {
			method: "POST",
			headers: headers?.headers,
			body: JSON.stringify(data),
			signal: controller.signal
		});
		clearTimeout(timeout);
		if (response.status !== 200) throw new Error(`Vectara API returned status code ${response.status}`);
		const result = await response.json();
		const responses = result.responseSet[0].response;
		const documents = result.responseSet[0].document;
		for (let i = 0; i < responses.length; i += 1) {
			const responseMetadata = responses[i].metadata;
			const documentMetadata = documents[responses[i].documentIndex].metadata;
			const combinedMetadata = {};
			responseMetadata.forEach((item) => {
				combinedMetadata[item.name] = item.value;
			});
			documentMetadata.forEach((item) => {
				combinedMetadata[item.name] = item.value;
			});
			responses[i].metadata = combinedMetadata;
		}
		const res = {
			documents: responses.map((response$1) => new __langchain_core_documents.Document({
				pageContent: response$1.text,
				metadata: response$1.metadata
			})),
			scores: responses.map((response$1) => response$1.score),
			summary: result.responseSet[0].summary[0]?.text ?? ""
		};
		return res;
	}
	/**
	* Performs a similarity search and returns documents along with their
	* scores.
	* @param query The query string for the similarity search.
	* @param k Optional. The number of results to return. Default is 10.
	* @param filter Optional. A VectaraFilter object to refine the search results.
	* @returns A Promise that resolves to an array of tuples, each containing a Document and its score.
	*/
	async similaritySearchWithScore(query, k, filter) {
		const summaryResult = await this.vectaraQuery(query, k || 10, filter || DEFAULT_FILTER);
		const res = summaryResult.documents.map((document, index) => [document, summaryResult.scores[index]]);
		return res;
	}
	/**
	* Performs a similarity search and returns documents.
	* @param query The query string for the similarity search.
	* @param k Optional. The number of results to return. Default is 10.
	* @param filter Optional. A VectaraFilter object to refine the search results.
	* @returns A Promise that resolves to an array of Document objects.
	*/
	async similaritySearch(query, k, filter) {
		const documents = await this.similaritySearchWithScore(query, k || 10, filter || DEFAULT_FILTER);
		return documents.map((result) => result[0]);
	}
	/**
	* Throws an error, as this method is not implemented. Use
	* similaritySearch or similaritySearchWithScore instead.
	* @param _query Not used.
	* @param _k Not used.
	* @param _filter Not used.
	* @returns Does not return a value.
	*/
	async similaritySearchVectorWithScore(_query, _k, _filter) {
		throw new Error("Method not implemented. Please call similaritySearch or similaritySearchWithScore instead.");
	}
	/**
	* Creates a VectaraStore instance from texts.
	* @param texts An array of text strings.
	* @param metadatas Metadata for the texts. Can be a single object or an array of objects.
	* @param _embeddings Not used.
	* @param args A VectaraLibArgs object for initializing the VectaraStore instance.
	* @returns A Promise that resolves to a VectaraStore instance.
	*/
	static fromTexts(texts, metadatas, _embeddings, args) {
		const docs = [];
		for (let i = 0; i < texts.length; i += 1) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			const newDoc = new __langchain_core_documents.Document({
				pageContent: texts[i],
				metadata
			});
			docs.push(newDoc);
		}
		return VectaraStore.fromDocuments(docs, new __langchain_core_utils_testing.FakeEmbeddings(), args);
	}
	/**
	* Creates a VectaraStore instance from documents.
	* @param docs An array of Document objects.
	* @param _embeddings Not used.
	* @param args A VectaraLibArgs object for initializing the VectaraStore instance.
	* @returns A Promise that resolves to a VectaraStore instance.
	*/
	static async fromDocuments(docs, _embeddings, args) {
		const instance = new this(args);
		await instance.addDocuments(docs);
		return instance;
	}
};

//#endregion
exports.DEFAULT_FILTER = DEFAULT_FILTER;
exports.VectaraStore = VectaraStore;
Object.defineProperty(exports, 'vectara_exports', {
  enumerable: true,
  get: function () {
    return vectara_exports;
  }
});
//# sourceMappingURL=vectara.cjs.map