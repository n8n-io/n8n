import { getCohereClient } from "./client.js";
import { BaseDocumentCompressor } from "@langchain/core/retrievers/document_compressors";

//#region src/rerank.ts
/**
* Document compressor that uses `Cohere Rerank API`.
*/
var CohereRerank = class extends BaseDocumentCompressor {
	model;
	topN = 3;
	client;
	maxChunksPerDoc;
	constructor(fields) {
		super();
		this.client = getCohereClient(fields);
		this.model = fields?.model ?? this.model;
		if (!this.model) throw new Error("Model not specified for CohereRerank instance. Please provide a model name from the options here: https://docs.cohere.com/reference/rerank");
		this.topN = fields?.topN ?? this.topN;
		this.maxChunksPerDoc = fields?.maxChunksPerDoc;
	}
	/**
	* Compress documents using Cohere's rerank API.
	*
	* @param {Array<DocumentInterface>} documents A sequence of documents to compress.
	* @param {string} query The query to use for compressing the documents.
	*
	* @returns {Promise<Array<DocumentInterface>>} A sequence of compressed documents.
	*/
	async compressDocuments(documents, query) {
		if (documents == null || documents.length === 0) return [];
		const _docs = documents.map((doc) => doc.pageContent);
		const { results } = await this.client.rerank({
			model: this.model,
			query,
			documents: _docs,
			topN: this.topN,
			maxChunksPerDoc: this.maxChunksPerDoc
		});
		const finalResults = [];
		for (let i = 0; i < results.length; i += 1) {
			const result = results[i];
			const doc = documents[result.index];
			doc.metadata.relevanceScore = result.relevanceScore;
			finalResults.push(doc);
		}
		return finalResults;
	}
	/**
	* Returns an ordered list of documents ordered by their relevance to the provided query.
	*
	* @param {Array<DocumentInterface | string | Record<string, string>>} documents A list of documents as strings, DocumentInterfaces or objects with a `pageContent` key.
	* @param {string} query The query to use for reranking the documents.
	* @param options
	* @param {string} options.model The name of the model to use.
	* @param {number} options.topN How many documents to return.
	* @param {number} options.maxChunksPerDoc The maximum number of chunks per document.
	*
	* @returns {Promise<Array<{ index: number; relevanceScore: number }>>} An ordered list of documents with relevance scores.
	*/
	async rerank(documents, query, options) {
		const docs = documents.map((doc) => {
			if (typeof doc === "string") return doc;
			return doc.pageContent;
		});
		const model = options?.model ?? this.model;
		const topN = options?.topN ?? this.topN;
		const maxChunksPerDoc = options?.maxChunksPerDoc ?? this.maxChunksPerDoc;
		const { results } = await this.client.rerank({
			model,
			query,
			documents: docs,
			topN,
			maxChunksPerDoc
		});
		const resultObjects = results.map((result) => ({
			index: result.index,
			relevanceScore: result.relevanceScore
		}));
		return resultObjects;
	}
};

//#endregion
export { CohereRerank };
//# sourceMappingURL=rerank.js.map