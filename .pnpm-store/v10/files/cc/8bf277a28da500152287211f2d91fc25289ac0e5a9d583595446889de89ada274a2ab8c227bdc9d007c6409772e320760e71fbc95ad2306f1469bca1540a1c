import { __export } from "../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import { NotFoundError, ZepClient } from "@getzep/zep-js";
import { BaseRetriever } from "@langchain/core/retrievers";

//#region src/retrievers/zep.ts
var zep_exports = {};
__export(zep_exports, { ZepRetriever: () => ZepRetriever });
/**
* Class for retrieving information from a Zep long-term memory store.
* Extends the BaseRetriever class.
* @example
* ```typescript
* const retriever = new ZepRetriever({
*   url: "http:
*   sessionId: "session_exampleUUID",
*   topK: 3,
* });
* const query = "Can I drive red cars in France?";
* const docs = await retriever.getRelevantDocuments(query);
* ```
*/
var ZepRetriever = class extends BaseRetriever {
	static lc_name() {
		return "ZepRetriever";
	}
	lc_namespace = [
		"langchain",
		"retrievers",
		"zep"
	];
	get lc_secrets() {
		return {
			apiKey: "ZEP_API_KEY",
			url: "ZEP_API_URL"
		};
	}
	get lc_aliases() {
		return { apiKey: "api_key" };
	}
	zepClientPromise;
	sessionId;
	topK;
	searchScope;
	searchType;
	mmrLambda;
	filter;
	constructor(config) {
		super(config);
		this.sessionId = config.sessionId;
		this.topK = config.topK;
		this.searchScope = config.searchScope;
		this.searchType = config.searchType;
		this.mmrLambda = config.mmrLambda;
		this.filter = config.filter;
		this.zepClientPromise = ZepClient.init(config.url, config.apiKey);
	}
	/**
	*  Converts an array of message search results to an array of Document objects.
	*  @param {MemorySearchResult[]} results - The array of search results.
	*  @returns {Document[]} An array of Document objects representing the search results.
	*/
	searchMessageResultToDoc(results) {
		return results.filter((r) => r.message).map(({ message: { content, metadata: messageMetadata } = {}, dist,...rest }) => new Document({
			pageContent: content ?? "",
			metadata: {
				score: dist,
				...messageMetadata,
				...rest
			}
		}));
	}
	/**
	*  Converts an array of summary search results to an array of Document objects.
	*  @param {MemorySearchResult[]} results - The array of search results.
	*  @returns {Document[]} An array of Document objects representing the search results.
	*/
	searchSummaryResultToDoc(results) {
		return results.filter((r) => r.summary).map(({ summary: { content, metadata: summaryMetadata } = {}, dist,...rest }) => new Document({
			pageContent: content ?? "",
			metadata: {
				score: dist,
				...summaryMetadata,
				...rest
			}
		}));
	}
	/**
	*  Retrieves the relevant documents based on the given query.
	*  @param {string} query - The query string.
	*  @returns {Promise<Document[]>} A promise that resolves to an array of relevant Document objects.
	*/
	async _getRelevantDocuments(query) {
		const payload = {
			text: query,
			metadata: this.filter,
			search_scope: this.searchScope,
			search_type: this.searchType,
			mmr_lambda: this.mmrLambda
		};
		const zepClient = await this.zepClientPromise;
		if (!zepClient) throw new Error("ZepClient is not initialized");
		try {
			const results = await zepClient.memory.searchMemory(this.sessionId, payload, this.topK);
			return this.searchScope === "summary" ? this.searchSummaryResultToDoc(results) : this.searchMessageResultToDoc(results);
		} catch (error) {
			if (error instanceof NotFoundError) return Promise.resolve([]);
			throw error;
		}
	}
};

//#endregion
export { ZepRetriever, zep_exports };
//# sourceMappingURL=zep.js.map