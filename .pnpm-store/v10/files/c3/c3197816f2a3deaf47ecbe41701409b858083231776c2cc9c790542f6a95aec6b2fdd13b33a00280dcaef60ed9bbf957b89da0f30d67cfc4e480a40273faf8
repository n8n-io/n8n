Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("./_virtual/_rolldown/runtime.cjs");
const require_load_serializable = require("./load/serializable.cjs");
const require_retrievers_index = require("./retrievers/index.cjs");
//#region src/vectorstores.ts
var vectorstores_exports = /* @__PURE__ */ require_runtime.__exportAll({
	SaveableVectorStore: () => SaveableVectorStore,
	VectorStore: () => VectorStore,
	VectorStoreRetriever: () => VectorStoreRetriever
});
/**
* Class for retrieving documents from a `VectorStore` based on vector similarity
* or maximal marginal relevance (MMR).
*
* `VectorStoreRetriever` extends `BaseRetriever`, implementing methods for
* adding documents to the underlying vector store and performing document
* retrieval with optional configurations.
*
* @class VectorStoreRetriever
* @extends BaseRetriever
* @implements VectorStoreRetrieverInterface
* @template V - Type of vector store implementing `VectorStoreInterface`.
*/
var VectorStoreRetriever = class extends require_retrievers_index.BaseRetriever {
	static lc_name() {
		return "VectorStoreRetriever";
	}
	get lc_namespace() {
		return ["langchain_core", "vectorstores"];
	}
	/**
	* The instance of `VectorStore` used for storing and retrieving document embeddings.
	* This vector store must implement the `VectorStoreInterface` to be compatible
	* with the retriever’s operations.
	*/
	vectorStore;
	/**
	* Specifies the number of documents to retrieve for each search query.
	* Defaults to 4 if not specified, providing a basic result count for similarity or MMR searches.
	*/
	k = 4;
	/**
	* Determines the type of search operation to perform on the vector store.
	*
	* - `"similarity"` (default): Conducts a similarity search based purely on vector similarity
	*   to the query.
	* - `"mmr"`: Executes a maximal marginal relevance (MMR) search, balancing relevance and
	*   diversity in the retrieved results.
	*/
	searchType = "similarity";
	/**
	* Additional options specific to maximal marginal relevance (MMR) search, applicable
	* only if `searchType` is set to `"mmr"`.
	*
	* Includes:
	* - `fetchK`: The initial number of documents fetched before applying the MMR algorithm,
	*   allowing for a larger selection from which to choose the most diverse results.
	* - `lambda`: A parameter between 0 and 1 to adjust the relevance-diversity balance,
	*   where 0 prioritizes diversity and 1 prioritizes relevance.
	*/
	searchKwargs;
	/**
	* Optional filter applied to search results, defined by the `FilterType` of the vector store.
	* Allows for refined, targeted results by restricting the returned documents based
	* on specified filter criteria.
	*/
	filter;
	/**
	* Returns the type of vector store, as defined by the `vectorStore` instance.
	*
	* @returns {string} The vector store type.
	*/
	_vectorstoreType() {
		return this.vectorStore._vectorstoreType();
	}
	/**
	* Initializes a new instance of `VectorStoreRetriever` with the specified configuration.
	*
	* This constructor configures the retriever to interact with a given `VectorStore`
	* and supports different retrieval strategies, including similarity search and maximal
	* marginal relevance (MMR) search. Various options allow customization of the number
	* of documents retrieved per query, filtering based on conditions, and fine-tuning
	* MMR-specific parameters.
	*
	* @param fields - Configuration options for setting up the retriever:
	*
	*   - `vectorStore` (required): The `VectorStore` instance implementing `VectorStoreInterface`
	*     that will be used to store and retrieve document embeddings. This is the core component
	*     of the retriever, enabling vector-based similarity and MMR searches.
	*
	*   - `k` (optional): Specifies the number of documents to retrieve per search query. If not
	*     provided, defaults to 4. This count determines the number of most relevant documents returned
	*     for each search operation, balancing performance with comprehensiveness.
	*
	*   - `searchType` (optional): Defines the search approach used by the retriever, allowing for
	*     flexibility between two methods:
	*       - `"similarity"` (default): A similarity-based search, retrieving documents with high vector
	*         similarity to the query. This type prioritizes relevance and is often used when diversity
	*         among results is less critical.
	*       - `"mmr"`: Maximal Marginal Relevance search, which combines relevance with diversity. MMR
	*         is useful for scenarios where varied content is essential, as it selects results that
	*         both match the query and introduce content diversity.
	*
	*   - `filter` (optional): A filter of type `FilterType`, defined by the vector store, that allows
	*     for refined and targeted search results. This filter applies specified conditions to limit
	*     which documents are eligible for retrieval, offering control over the scope of results.
	*
	*   - `searchKwargs` (optional, applicable only if `searchType` is `"mmr"`): Additional settings
	*     for configuring MMR-specific behavior. These parameters allow further tuning of the MMR
	*     search process:
	*       - `fetchK`: The initial number of documents fetched from the vector store before the MMR
	*         algorithm is applied. Fetching a larger set enables the algorithm to select a more
	*         diverse subset of documents.
	*       - `lambda`: A parameter controlling the relevance-diversity balance, where 0 emphasizes
	*         diversity and 1 prioritizes relevance. Intermediate values provide a blend of the two,
	*         allowing customization based on the importance of content variety relative to query relevance.
	*/
	constructor(fields) {
		super(fields);
		this.vectorStore = fields.vectorStore;
		this.k = fields.k ?? this.k;
		this.searchType = fields.searchType ?? this.searchType;
		this.filter = fields.filter;
		if (fields.searchType === "mmr") this.searchKwargs = fields.searchKwargs;
	}
	/**
	* Retrieves relevant documents based on the specified query, using either
	* similarity or maximal marginal relevance (MMR) search.
	*
	* If `searchType` is set to `"mmr"`, performs an MMR search to balance
	* similarity and diversity among results. If `searchType` is `"similarity"`,
	* retrieves results purely based on similarity to the query.
	*
	* @param query - The query string used to find relevant documents.
	* @param runManager - Optional callback manager for tracking retrieval progress.
	* @returns A promise that resolves to an array of `DocumentInterface` instances
	*          representing the most relevant documents to the query.
	* @throws {Error} Throws an error if MMR search is requested but not supported
	*                 by the vector store.
	* @protected
	*/
	async _getRelevantDocuments(query, runManager) {
		if (this.searchType === "mmr") {
			if (typeof this.vectorStore.maxMarginalRelevanceSearch !== "function") throw new Error(`The vector store backing this retriever, ${this._vectorstoreType()} does not support max marginal relevance search.`);
			return this.vectorStore.maxMarginalRelevanceSearch(query, {
				k: this.k,
				filter: this.filter,
				...this.searchKwargs
			}, runManager?.getChild("vectorstore"));
		}
		return this.vectorStore.similaritySearch(query, this.k, this.filter, runManager?.getChild("vectorstore"));
	}
	/**
	* Adds an array of documents to the vector store, embedding them as part of
	* the storage process.
	*
	* This method delegates document embedding and storage to the `addDocuments`
	* method of the underlying vector store.
	*
	* @param documents - An array of documents to embed and add to the vector store.
	* @param options - Optional settings to customize document addition.
	* @returns A promise that resolves to an array of document IDs or `void`,
	*          depending on the vector store's implementation.
	*/
	async addDocuments(documents, options) {
		return this.vectorStore.addDocuments(documents, options);
	}
};
/**
* Abstract class representing a vector storage system for performing
* similarity searches on embedded documents.
*
* `VectorStore` provides methods for adding precomputed vectors or documents,
* removing documents based on criteria, and performing similarity searches
* with optional scoring. Subclasses are responsible for implementing specific
* storage mechanisms and the exact behavior of certain abstract methods.
*
* @abstract
* @extends Serializable
* @implements VectorStoreInterface
*/
var VectorStore = class extends require_load_serializable.Serializable {
	/**
	* Namespace within LangChain to uniquely identify this vector store's
	* location, based on the vector store type.
	*
	* @internal
	*/
	lc_namespace = [
		"langchain",
		"vectorstores",
		this._vectorstoreType()
	];
	/**
	* Embeddings interface for generating vector embeddings from text queries,
	* enabling vector-based similarity searches.
	*/
	embeddings;
	/**
	* Initializes a new vector store with embeddings and database configuration.
	*
	* @param embeddings - Instance of `EmbeddingsInterface` used to embed queries.
	* @param dbConfig - Configuration settings for the database or storage system.
	*/
	constructor(embeddings, dbConfig) {
		super(dbConfig);
		this.embeddings = embeddings;
	}
	/**
	* Deletes documents from the vector store based on the specified parameters.
	*
	* @param _params - Flexible key-value pairs defining conditions for document deletion.
	* @returns A promise that resolves once the deletion is complete.
	*/
	async delete(_params) {
		throw new Error("Not implemented.");
	}
	/**
	* Searches for documents similar to a text query by embedding the query and
	* performing a similarity search on the resulting vector.
	*
	* @param query - Text query for finding similar documents.
	* @param k - Number of similar results to return. Defaults to 4.
	* @param filter - Optional filter based on `FilterType`.
	* @param _callbacks - Optional callbacks for monitoring search progress
	* @returns A promise resolving to an array of `DocumentInterface` instances representing similar documents.
	*/
	async similaritySearch(query, k = 4, filter = void 0, _callbacks = void 0) {
		return (await this.similaritySearchVectorWithScore(await this.embeddings.embedQuery(query), k, filter)).map((result) => result[0]);
	}
	/**
	* Searches for documents similar to a text query by embedding the query,
	* and returns results with similarity scores.
	*
	* @param query - Text query for finding similar documents.
	* @param k - Number of similar results to return. Defaults to 4.
	* @param filter - Optional filter based on `FilterType`.
	* @param _callbacks - Optional callbacks for monitoring search progress
	* @returns A promise resolving to an array of tuples, each containing a
	*          document and its similarity score.
	*/
	async similaritySearchWithScore(query, k = 4, filter = void 0, _callbacks = void 0) {
		return this.similaritySearchVectorWithScore(await this.embeddings.embedQuery(query), k, filter);
	}
	/**
	* Creates a `VectorStore` instance from an array of text strings and optional
	* metadata, using the specified embeddings and database configuration.
	*
	* Subclasses must implement this method to define how text and metadata
	* are embedded and stored in the vector store. Throws an error if not overridden.
	*
	* @param _texts - Array of strings representing the text documents to be stored.
	* @param _metadatas - Metadata for the texts, either as an array (one for each text)
	*                     or a single object (applied to all texts).
	* @param _embeddings - Instance of `EmbeddingsInterface` to embed the texts.
	* @param _dbConfig - Database configuration settings.
	* @returns A promise that resolves to a new `VectorStore` instance.
	* @throws {Error} Throws an error if this method is not overridden by a subclass.
	*/
	static fromTexts(_texts, _metadatas, _embeddings, _dbConfig) {
		throw new Error("the Langchain vectorstore implementation you are using forgot to override this, please report a bug");
	}
	/**
	* Creates a `VectorStore` instance from an array of documents, using the specified
	* embeddings and database configuration.
	*
	* Subclasses must implement this method to define how documents are embedded
	* and stored. Throws an error if not overridden.
	*
	* @param _docs - Array of `DocumentInterface` instances representing the documents to be stored.
	* @param _embeddings - Instance of `EmbeddingsInterface` to embed the documents.
	* @param _dbConfig - Database configuration settings.
	* @returns A promise that resolves to a new `VectorStore` instance.
	* @throws {Error} Throws an error if this method is not overridden by a subclass.
	*/
	static fromDocuments(_docs, _embeddings, _dbConfig) {
		throw new Error("the Langchain vectorstore implementation you are using forgot to override this, please report a bug");
	}
	/**
	* Creates a `VectorStoreRetriever` instance with flexible configuration options.
	*
	* @param kOrFields
	*    - If a number is provided, it sets the `k` parameter (number of items to retrieve).
	*    - If an object is provided, it should contain various configuration options.
	* @param filter
	*    - Optional filter criteria to limit the items retrieved based on the specified filter type.
	* @param callbacks
	*    - Optional callbacks that may be triggered at specific stages of the retrieval process.
	* @param tags
	*    - Tags to categorize or label the `VectorStoreRetriever`. Defaults to an empty array if not provided.
	* @param metadata
	*    - Additional metadata as key-value pairs to add contextual information for the retrieval process.
	* @param verbose
	*    - If `true`, enables detailed logging for the retrieval process. Defaults to `false`.
	*
	* @returns
	*    - A configured `VectorStoreRetriever` instance based on the provided parameters.
	*
	* @example
	* Basic usage with a `k` value:
	* ```typescript
	* const retriever = myVectorStore.asRetriever(5);
	* ```
	*
	* Usage with a configuration object:
	* ```typescript
	* const retriever = myVectorStore.asRetriever({
	*   k: 10,
	*   filter: myFilter,
	*   tags: ['example', 'test'],
	*   verbose: true,
	*   searchType: 'mmr',
	*   searchKwargs: { alpha: 0.5 },
	* });
	* ```
	*/
	asRetriever(kOrFields, filter, callbacks, tags, metadata, verbose) {
		if (typeof kOrFields === "number") return new VectorStoreRetriever({
			vectorStore: this,
			k: kOrFields,
			filter,
			tags: [...tags ?? [], this._vectorstoreType()],
			metadata,
			verbose,
			callbacks
		});
		else {
			const params = {
				vectorStore: this,
				k: kOrFields?.k,
				filter: kOrFields?.filter,
				tags: [...kOrFields?.tags ?? [], this._vectorstoreType()],
				metadata: kOrFields?.metadata,
				verbose: kOrFields?.verbose,
				callbacks: kOrFields?.callbacks,
				searchType: kOrFields?.searchType
			};
			if (kOrFields?.searchType === "mmr") return new VectorStoreRetriever({
				...params,
				searchKwargs: kOrFields.searchKwargs
			});
			return new VectorStoreRetriever({ ...params });
		}
	}
};
/**
* Abstract class extending `VectorStore` that defines a contract for saving
* and loading vector store instances.
*
* The `SaveableVectorStore` class allows vector store implementations to
* persist their data and retrieve it when needed.The format for saving and
* loading data is left to the implementing subclass.
*
* Subclasses must implement the `save` method to handle their custom
* serialization logic, while the `load` method enables reconstruction of a
* vector store from saved data, requiring compatible embeddings through the
* `EmbeddingsInterface`.
*
* @abstract
* @extends VectorStore
*/
var SaveableVectorStore = class extends VectorStore {
	/**
	* Loads a vector store instance from the specified directory, using the
	* provided embeddings to ensure compatibility.
	*
	* This static method reconstructs a `SaveableVectorStore` from previously
	* saved data. Implementations should interpret the saved data format to
	* recreate the vector store instance.
	*
	* @param _directory - The directory path from which the vector store
	* data will be loaded.
	* @param _embeddings - An instance of `EmbeddingsInterface` to align
	* the embeddings with the loaded vector data.
	* @returns A promise that resolves to a `SaveableVectorStore` instance
	* constructed from the saved data.
	*/
	static load(_directory, _embeddings) {
		throw new Error("Not implemented");
	}
};
//#endregion
exports.SaveableVectorStore = SaveableVectorStore;
exports.VectorStore = VectorStore;
exports.VectorStoreRetriever = VectorStoreRetriever;
Object.defineProperty(exports, "vectorstores_exports", {
	enumerable: true,
	get: function() {
		return vectorstores_exports;
	}
});

//# sourceMappingURL=vectorstores.cjs.map