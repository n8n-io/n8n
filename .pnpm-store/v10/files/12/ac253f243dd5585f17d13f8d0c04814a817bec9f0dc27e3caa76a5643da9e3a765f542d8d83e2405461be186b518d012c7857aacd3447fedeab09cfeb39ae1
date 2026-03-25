const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_vectorstores = require_rolldown_runtime.__toESM(require("@langchain/core/vectorstores"));
const __langchain_core_utils_math = require_rolldown_runtime.__toESM(require("@langchain/core/utils/math"));

//#region src/retrievers/matryoshka_retriever.ts
var matryoshka_retriever_exports = {};
require_rolldown_runtime.__export(matryoshka_retriever_exports, { MatryoshkaRetriever: () => MatryoshkaRetriever });
/**
* A retriever that uses two sets of embeddings to perform adaptive retrieval. Based
* off of the "Matryoshka embeddings: faster OpenAI vector search using Adaptive Retrieval"
* blog post {@link https://supabase.com/blog/matryoshka-embeddings}.
*
*
* This class performs "Adaptive Retrieval" for searching text embeddings efficiently using the
* Matryoshka Representation Learning (MRL) technique. It retrieves documents similar to a query
* embedding in two steps:
*
* First-pass: Uses a lower dimensional sub-vector from the MRL embedding for an initial, fast,
* but less accurate search.
*
* Second-pass: Re-ranks the top results from the first pass using the full, high-dimensional
* embedding for higher accuracy.
*
*
* This code implements MRL embeddings for efficient vector search by combining faster,
* lower-dimensional initial search with accurate, high-dimensional re-ranking.
*/
var MatryoshkaRetriever = class extends __langchain_core_vectorstores.VectorStoreRetriever {
	smallK = 50;
	largeK = 8;
	largeEmbeddingKey = "lc_large_embedding";
	largeEmbeddingModel;
	searchType = "cosine";
	constructor(fields) {
		super(fields);
		this.smallK = fields.smallK ?? this.smallK;
		this.largeK = fields.largeK ?? this.largeK;
		this.largeEmbeddingKey = fields.largeEmbeddingKey ?? this.largeEmbeddingKey;
		this.largeEmbeddingModel = fields.largeEmbeddingModel;
		this.searchType = fields.searchType ?? this.searchType;
	}
	/**
	* Ranks documents based on their similarity to a query embedding using larger embeddings.
	*
	* This method takes a query embedding and a list of documents (smallResults) as input. Each document
	* in the smallResults array has previously been associated with a large embedding stored in its metadata.
	* Depending on the `searchType` (cosine, innerProduct, or euclidean), it calculates the similarity scores
	* between the query embedding and each document's large embedding. It then ranks the documents based on
	* these similarity scores, from the most similar to the least similar.
	*
	* The method returns a promise that resolves to an array of the top `largeK` documents, where `largeK`
	* is a class property defining the number of documents to return. This subset of documents is determined
	* by sorting the entire list of documents based on their similarity scores and then selecting the top
	* `largeK` documents.
	*
	* @param {number[]} embeddedQuery The embedding of the query, represented as an array of numbers.
	* @param {DocumentInterface[]} smallResults An array of documents, each with metadata that includes a large embedding for similarity comparison.
	* @returns {Promise<DocumentInterface[]>} A promise that resolves to an array of the top `largeK` ranked documents based on their similarity to the query embedding.
	*/
	_rankByLargeEmbeddings(embeddedQuery, smallResults) {
		const largeEmbeddings = smallResults.map((doc) => JSON.parse(doc.metadata[this.largeEmbeddingKey]));
		let func;
		switch (this.searchType) {
			case "cosine":
				func = () => (0, __langchain_core_utils_math.cosineSimilarity)([embeddedQuery], largeEmbeddings);
				break;
			case "innerProduct":
				func = () => (0, __langchain_core_utils_math.innerProduct)([embeddedQuery], largeEmbeddings);
				break;
			case "euclidean":
				func = () => (0, __langchain_core_utils_math.euclideanDistance)([embeddedQuery], largeEmbeddings);
				break;
			default: throw new Error(`Unknown search type: ${this.searchType}`);
		}
		const [similarityScores] = func();
		let indices = Array.from({ length: smallResults.length }, (_, index) => index);
		indices = indices.map((v, i) => [similarityScores[i], v]).sort(([a], [b]) => b - a).slice(0, this.largeK).map(([, i]) => i);
		return indices.map((i) => smallResults[i]);
	}
	async _getRelevantDocuments(query) {
		const [embeddedQuery, smallResults] = await Promise.all([this.largeEmbeddingModel.embedQuery(query), this.vectorStore.similaritySearch(query, this.smallK, this.filter)]);
		return this._rankByLargeEmbeddings(embeddedQuery, smallResults);
	}
	/**
	* Override the default `addDocuments` method to embed the documents twice,
	* once using the larger embeddings model, and then again using the default
	* embedding model linked to the vector store.
	*
	* @param {DocumentInterface[]} documents - An array of documents to add to the vector store.
	* @param {AddDocumentOptions} options - An optional object containing additional options for adding documents.
	* @returns {Promise<string[] | void>} A promise that resolves to an array of the document IDs that were added to the vector store.
	*/
	addDocuments = async (documents, options) => {
		if (documents.some((doc) => this.largeEmbeddingKey in doc.metadata)) throw new Error(`All documents must not contain the large embedding key: ${this.largeEmbeddingKey} in their metadata.`);
		const allDocPageContent = documents.map((doc) => doc.pageContent);
		const allDocLargeEmbeddings = await this.largeEmbeddingModel.embedDocuments(allDocPageContent);
		const newDocuments = documents.map((doc, idx) => ({
			...doc,
			metadata: {
				...doc.metadata,
				[this.largeEmbeddingKey]: JSON.stringify(allDocLargeEmbeddings[idx])
			}
		}));
		return this.vectorStore.addDocuments(newDocuments, options);
	};
};

//#endregion
exports.MatryoshkaRetriever = MatryoshkaRetriever;
Object.defineProperty(exports, 'matryoshka_retriever_exports', {
  enumerable: true,
  get: function () {
    return matryoshka_retriever_exports;
  }
});
//# sourceMappingURL=matryoshka_retriever.cjs.map