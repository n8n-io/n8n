import { Serializable } from "./load/serializable.cjs";
import { DocumentInterface } from "./documents/document.cjs";
import { CallbackManagerForRetrieverRun, Callbacks } from "./callbacks/manager.cjs";
import { EmbeddingsInterface } from "./embeddings.cjs";
import { BaseRetriever, BaseRetrieverInput, BaseRetrieverInterface } from "./retrievers/index.cjs";

//#region src/vectorstores.d.ts
/**
 * Type for options when adding a document to the VectorStore.
 */
type AddDocumentOptions = Record<string, any>;
/**
 * Options for configuring a maximal marginal relevance (MMR) search.
 *
 * MMR search optimizes for both similarity to the query and diversity
 * among the results, balancing the retrieval of relevant documents
 * with variation in the content returned.
 *
 * Fields:
 *
 * - `fetchK` (optional): The initial number of documents to retrieve from the
 *   vector store before applying the MMR algorithm. This larger set provides a
 *   pool of documents from which the algorithm can select the most diverse
 *   results based on relevance to the query.
 *
 * - `filter` (optional): A filter of type `FilterType` to refine the search
 *   results, allowing additional conditions to target specific subsets
 *   of documents.
 *
 * - `k`: The number of documents to return in the final results. This is the
 *   primary count of documents that are most relevant to the query.
 *
 * - `lambda` (optional): A value between 0 and 1 that determines the balance
 *   between relevance and diversity:
 *   - A `lambda` of 0 emphasizes diversity, maximizing content variation.
 *   - A `lambda` of 1 emphasizes similarity to the query, focusing on relevance.
 *    Values between 0 and 1 provide a mix of relevance and diversity.
 *
 * @template FilterType - The type used for filtering results, as defined
 *                        by the vector store.
 */
type MaxMarginalRelevanceSearchOptions<FilterType> = {
  k: number;
  fetchK?: number;
  lambda?: number;
  filter?: FilterType;
};
/**
 * Options for configuring a maximal marginal relevance (MMR) search
 * when using the `VectorStoreRetriever`.
 *
 * These parameters control how the MMR algorithm balances relevance to the
 * query and diversity among the retrieved documents.
 *
 * Fields:
 * - `fetchK` (optional): Specifies the initial number of documents to fetch
 *   before applying the MMR algorithm. This larger set provides a pool of
 *   documents from which the algorithm can select the most diverse results
 *   based on relevance to the query.
 *
 * - `lambda` (optional): A value between 0 and 1 that determines the balance
 *   between relevance and diversity:
 *   - A `lambda` of 0 maximizes diversity among the results, prioritizing varied content.
 *   - A `lambda` of 1 maximizes similarity to the query, prioritizing relevance.
 *   Values between 0 and 1 provide a mix of relevance and diversity.
 */
type VectorStoreRetrieverMMRSearchKwargs = {
  fetchK?: number;
  lambda?: number;
};
/**
 * Input configuration options for creating a `VectorStoreRetriever` instance.
 *
 * This type combines properties from `BaseRetrieverInput` with specific settings
 * for the `VectorStoreRetriever`, including options for similarity or maximal
 * marginal relevance (MMR) search types.
 *
 * Fields:
 *
 * - `callbacks` (optional): An array of callback functions that handle various
 *   events during retrieval, such as logging, error handling, or progress updates.
 *
 * - `tags` (optional): An array of strings used to add contextual tags to
 *   retrieval operations, allowing for easier categorization and tracking.
 *
 * - `metadata` (optional): A record of key-value pairs to store additional
 *   contextual information for retrieval operations, which can be useful
 *   for logging or auditing purposes.
 *
 * - `verbose` (optional): A boolean flag that, if set to `true`, enables
 *   detailed logging and output during the retrieval process. Defaults to `false`.
 *
 * - `vectorStore`: The `VectorStore` instance implementing `VectorStoreInterface`
 *   that will be used for document storage and retrieval.
 *
 * - `k` (optional): Specifies the number of documents to retrieve per search
 *   query. Defaults to 4 if not specified.
 *
 * - `filter` (optional): A filter of type `FilterType` (defined by the vector store)
 *   to refine the set of documents returned, allowing for targeted search results.
 *
 * - `searchType`: Determines the type of search to perform:
 *   - `"similarity"`: Executes a similarity search, retrieving documents based purely
 *     on vector similarity to the query.
 *   - `"mmr"`: Executes a maximal marginal relevance (MMR) search, balancing similarity
 *     and diversity in the search results.
 *
 * - `searchKwargs` (optional): Used only if `searchType` is `"mmr"`, this object
 *   provides additional options for MMR search, including:
 *   - `fetchK`: Specifies the number of documents to initially fetch before applying
 *     the MMR algorithm, providing a pool from which the most diverse results are selected.
 *   - `lambda`: A diversity parameter, where 0 emphasizes diversity and 1 emphasizes
 *     relevance to the query. Values between 0 and 1 provide a balance of relevance and diversity.
 *
 * @template V - The type of vector store implementing `VectorStoreInterface`.
 */
type VectorStoreRetrieverInput<V extends VectorStoreInterface> = BaseRetrieverInput & ({
  vectorStore: V;
  k?: number;
  filter?: V["FilterType"];
  searchType?: "similarity";
} | {
  vectorStore: V;
  k?: number;
  filter?: V["FilterType"];
  searchType: "mmr";
  searchKwargs?: VectorStoreRetrieverMMRSearchKwargs;
});
/**
 * Interface for a retriever that uses a vector store to store and retrieve
 * document embeddings. This retriever interface allows for adding documents
 * to the underlying vector store and conducting retrieval operations.
 *
 * `VectorStoreRetrieverInterface` extends `BaseRetrieverInterface` to provide
 * document retrieval capabilities based on vector similarity.
 *
 * @interface VectorStoreRetrieverInterface
 * @extends BaseRetrieverInterface
 */
interface VectorStoreRetrieverInterface<V extends VectorStoreInterface = VectorStoreInterface> extends BaseRetrieverInterface {
  vectorStore: V;
  /**
   * Adds an array of documents to the vector store.
   *
   * This method embeds the provided documents and stores them within the
   * vector store. Additional options can be specified for custom behavior
   * during the addition process.
   *
   * @param documents - An array of documents to embed and add to the vector store.
   * @param options - Optional settings to customize document addition.
   * @returns A promise that resolves to an array of document IDs or `void`,
   *          depending on the implementation.
   */
  addDocuments(documents: DocumentInterface[], options?: AddDocumentOptions): Promise<string[] | void>;
}
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
declare class VectorStoreRetriever<V extends VectorStoreInterface = VectorStoreInterface> extends BaseRetriever implements VectorStoreRetrieverInterface {
  static lc_name(): string;
  get lc_namespace(): string[];
  /**
   * The instance of `VectorStore` used for storing and retrieving document embeddings.
   * This vector store must implement the `VectorStoreInterface` to be compatible
   * with the retriever’s operations.
   */
  vectorStore: V;
  /**
   * Specifies the number of documents to retrieve for each search query.
   * Defaults to 4 if not specified, providing a basic result count for similarity or MMR searches.
   */
  k: number;
  /**
   * Determines the type of search operation to perform on the vector store.
   *
   * - `"similarity"` (default): Conducts a similarity search based purely on vector similarity
   *   to the query.
   * - `"mmr"`: Executes a maximal marginal relevance (MMR) search, balancing relevance and
   *   diversity in the retrieved results.
   */
  searchType: string;
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
  searchKwargs?: VectorStoreRetrieverMMRSearchKwargs;
  /**
   * Optional filter applied to search results, defined by the `FilterType` of the vector store.
   * Allows for refined, targeted results by restricting the returned documents based
   * on specified filter criteria.
   */
  filter?: V["FilterType"];
  /**
   * Returns the type of vector store, as defined by the `vectorStore` instance.
   *
   * @returns {string} The vector store type.
   */
  _vectorstoreType(): string;
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
  constructor(fields: VectorStoreRetrieverInput<V>);
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
  _getRelevantDocuments(query: string, runManager?: CallbackManagerForRetrieverRun): Promise<DocumentInterface[]>;
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
  addDocuments(documents: DocumentInterface[], options?: AddDocumentOptions): Promise<string[] | void>;
}
/**
 * Interface defining the structure and operations of a vector store, which
 * facilitates the storage, retrieval, and similarity search of document vectors.
 *
 * `VectorStoreInterface` provides methods for adding, deleting, and searching
 * documents based on vector embeddings, including support for similarity
 * search with optional filtering and relevance-based retrieval.
 *
 * @extends Serializable
 */
interface VectorStoreInterface extends Serializable {
  /**
   * Defines the filter type used in search and delete operations. Can be an
   * object for structured conditions or a string for simpler filtering.
   */
  FilterType: object | string;
  /**
   * Instance of `EmbeddingsInterface` used to generate vector embeddings for
   * documents, enabling vector-based search operations.
   */
  embeddings: EmbeddingsInterface;
  /**
   * Returns a string identifying the type of vector store implementation,
   * useful for distinguishing between different vector storage backends.
   *
   * @returns {string} A string indicating the vector store type.
   */
  _vectorstoreType(): string;
  /**
   * Adds precomputed vectors and their corresponding documents to the vector store.
   *
   * @param vectors - An array of vectors, with each vector representing a document.
   * @param documents - An array of `DocumentInterface` instances corresponding to each vector.
   * @param options - Optional configurations for adding documents, potentially covering indexing or metadata handling.
   * @returns A promise that resolves to an array of document IDs or void, depending on implementation.
   */
  addVectors(vectors: number[][], documents: DocumentInterface[], options?: AddDocumentOptions): Promise<string[] | void>;
  /**
   * Adds an array of documents to the vector store.
   *
   * @param documents - An array of documents to be embedded and stored in the vector store.
   * @param options - Optional configurations for embedding and storage operations.
   * @returns A promise that resolves to an array of document IDs or void, depending on implementation.
   */
  addDocuments(documents: DocumentInterface[], options?: AddDocumentOptions): Promise<string[] | void>;
  /**
   * Deletes documents from the vector store based on the specified parameters.
   *
   * @param _params - A flexible object containing key-value pairs that define
   *                  the conditions for selecting documents to delete.
   * @returns A promise that resolves once the deletion operation is complete.
   */
  delete(_params?: Record<string, any>): Promise<void>;
  /**
   * Searches for documents similar to a given vector query and returns them
   * with similarity scores.
   *
   * @param query - A vector representing the query for similarity search.
   * @param k - The number of similar documents to return.
   * @param filter - Optional filter based on `FilterType` to restrict results.
   * @returns A promise that resolves to an array of tuples, each containing a
   *          `DocumentInterface` and its corresponding similarity score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[DocumentInterface, number][]>;
  /**
   * Searches for documents similar to a text query, embedding the query
   * and retrieving documents based on vector similarity.
   *
   * @param query - The text query to search for.
   * @param k - Optional number of similar documents to return.
   * @param filter - Optional filter based on `FilterType` to restrict results.
   * @param callbacks - Optional callbacks for tracking progress or events
   *                    during the search process.
   * @returns A promise that resolves to an array of `DocumentInterface`
   *          instances representing similar documents.
   */
  similaritySearch(query: string, k?: number, filter?: this["FilterType"], callbacks?: Callbacks): Promise<DocumentInterface[]>;
  /**
   * Searches for documents similar to a text query and includes similarity
   * scores in the result.
   *
   * @param query - The text query to search for.
   * @param k - Optional number of similar documents to return.
   * @param filter - Optional filter based on `FilterType` to restrict results.
   * @param callbacks - Optional callbacks for tracking progress or events
   *                    during the search process.
   * @returns A promise that resolves to an array of tuples, each containing
   *          a `DocumentInterface` and its similarity score.
   */
  similaritySearchWithScore(query: string, k?: number, filter?: this["FilterType"], callbacks?: Callbacks): Promise<[DocumentInterface, number][]>;
  /**
   * Return documents selected using the maximal marginal relevance.
   * Maximal marginal relevance optimizes for similarity to the query AND diversity
   * among selected documents.
   *
   * @param {string} query - Text to look up documents similar to.
   * @param {number} options.k - Number of documents to return.
   * @param {number} options.fetchK - Number of documents to fetch before passing to the MMR algorithm.
   * @param {number} options.lambda - Number between 0 and 1 that determines the degree of diversity among the results,
   *                 where 0 corresponds to maximum diversity and 1 to minimum diversity.
   * @param {this["FilterType"]} options.filter - Optional filter
   * @param _callbacks
   *
   * @returns {Promise<DocumentInterface[]>} - List of documents selected by maximal marginal relevance.
   */
  maxMarginalRelevanceSearch?(query: string, options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>, callbacks: Callbacks | undefined): Promise<DocumentInterface[]>;
  /**
   * Converts the vector store into a retriever, making it suitable for use in
   * retrieval-based workflows and allowing additional configuration.
   *
   * @param kOrFields - Optional parameter for specifying either the number of
   *                    documents to retrieve or partial retriever configurations.
   * @param filter - Optional filter based on `FilterType` for retrieval restriction.
   * @param callbacks - Optional callbacks for tracking retrieval events or progress.
   * @param tags - General-purpose tags to add contextual information to the retriever.
   * @param metadata - General-purpose metadata providing additional context
   *                   for retrieval.
   * @param verbose - If `true`, enables detailed logging during retrieval.
   * @returns An instance of `VectorStoreRetriever` configured with the specified options.
   */
  asRetriever(kOrFields?: number | Partial<VectorStoreRetrieverInput<this>>, filter?: this["FilterType"], callbacks?: Callbacks, tags?: string[], metadata?: Record<string, unknown>, verbose?: boolean): VectorStoreRetriever<this>;
}
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
declare abstract class VectorStore extends Serializable implements VectorStoreInterface {
  FilterType: object | string;
  /**
   * Namespace within LangChain to uniquely identify this vector store's
   * location, based on the vector store type.
   *
   * @internal
   */
  lc_namespace: string[];
  /**
   * Embeddings interface for generating vector embeddings from text queries,
   * enabling vector-based similarity searches.
   */
  embeddings: EmbeddingsInterface;
  /**
   * Initializes a new vector store with embeddings and database configuration.
   *
   * @param embeddings - Instance of `EmbeddingsInterface` used to embed queries.
   * @param dbConfig - Configuration settings for the database or storage system.
   */
  constructor(embeddings: EmbeddingsInterface, dbConfig: Record<string, any>);
  /**
   * Returns a string representing the type of vector store, which subclasses
   * must implement to identify their specific vector storage type.
   *
   * @returns {string} A string indicating the vector store type.
   * @abstract
   */
  abstract _vectorstoreType(): string;
  /**
   * Adds precomputed vectors and corresponding documents to the vector store.
   *
   * @param vectors - An array of vectors representing each document.
   * @param documents - Array of documents associated with each vector.
   * @param options - Optional configuration for adding vectors, such as indexing.
   * @returns A promise resolving to an array of document IDs or void, based on implementation.
   * @abstract
   */
  abstract addVectors(vectors: number[][], documents: DocumentInterface[], options?: AddDocumentOptions): Promise<string[] | void>;
  /**
   * Adds documents to the vector store, embedding them first through the
   * `embeddings` instance.
   *
   * @param documents - Array of documents to embed and add.
   * @param options - Optional configuration for embedding and storing documents.
   * @returns A promise resolving to an array of document IDs or void, based on implementation.
   * @abstract
   */
  abstract addDocuments(documents: DocumentInterface[], options?: AddDocumentOptions): Promise<string[] | void>;
  /**
   * Deletes documents from the vector store based on the specified parameters.
   *
   * @param _params - Flexible key-value pairs defining conditions for document deletion.
   * @returns A promise that resolves once the deletion is complete.
   */
  delete(_params?: Record<string, any>): Promise<void>;
  /**
   * Performs a similarity search using a vector query and returns results
   * along with their similarity scores.
   *
   * @param query - Vector representing the search query.
   * @param k - Number of similar results to return.
   * @param filter - Optional filter based on `FilterType` to restrict results.
   * @returns A promise resolving to an array of tuples containing documents and their similarity scores.
   * @abstract
   */
  abstract similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[DocumentInterface, number][]>;
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
  similaritySearch(query: string, k?: number, filter?: this["FilterType"] | undefined, _callbacks?: Callbacks | undefined): Promise<DocumentInterface[]>;
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
  similaritySearchWithScore(query: string, k?: number, filter?: this["FilterType"] | undefined, _callbacks?: Callbacks | undefined): Promise<[DocumentInterface, number][]>;
  /**
   * Return documents selected using the maximal marginal relevance.
   * Maximal marginal relevance optimizes for similarity to the query AND diversity
   * among selected documents.
   *
   * @param {string} query - Text to look up documents similar to.
   * @param {number} options.k - Number of documents to return.
   * @param {number} options.fetchK - Number of documents to fetch before passing to the MMR algorithm.
   * @param {number} options.lambda - Number between 0 and 1 that determines the degree of diversity among the results,
   *                 where 0 corresponds to maximum diversity and 1 to minimum diversity.
   * @param {this["FilterType"]} options.filter - Optional filter
   * @param _callbacks
   *
   * @returns {Promise<DocumentInterface[]>} - List of documents selected by maximal marginal relevance.
   */
  maxMarginalRelevanceSearch?(query: string, options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>, _callbacks: Callbacks | undefined): Promise<DocumentInterface[]>;
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
  static fromTexts(_texts: string[], _metadatas: object[] | object, _embeddings: EmbeddingsInterface, _dbConfig: Record<string, any>): Promise<VectorStore>;
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
  static fromDocuments(_docs: DocumentInterface[], _embeddings: EmbeddingsInterface, _dbConfig: Record<string, any>): Promise<VectorStore>;
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
  asRetriever(kOrFields?: number | Partial<VectorStoreRetrieverInput<this>>, filter?: this["FilterType"], callbacks?: Callbacks, tags?: string[], metadata?: Record<string, unknown>, verbose?: boolean): VectorStoreRetriever<this>;
}
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
declare abstract class SaveableVectorStore extends VectorStore {
  /**
   * Saves the current state of the vector store to the specified directory.
   *
   * This method must be implemented by subclasses to define their own
   * serialization process for persisting vector data. The implementation
   * determines the structure and format of the saved data.
   *
   * @param directory - The directory path where the vector store data
   * will be saved.
   * @abstract
   */
  abstract save(directory: string): Promise<void>;
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
  static load(_directory: string, _embeddings: EmbeddingsInterface): Promise<SaveableVectorStore>;
}
//#endregion
export { MaxMarginalRelevanceSearchOptions, SaveableVectorStore, VectorStore, VectorStoreInterface, VectorStoreRetriever, VectorStoreRetrieverInput, VectorStoreRetrieverInterface, VectorStoreRetrieverMMRSearchKwargs };
//# sourceMappingURL=vectorstores.d.cts.map