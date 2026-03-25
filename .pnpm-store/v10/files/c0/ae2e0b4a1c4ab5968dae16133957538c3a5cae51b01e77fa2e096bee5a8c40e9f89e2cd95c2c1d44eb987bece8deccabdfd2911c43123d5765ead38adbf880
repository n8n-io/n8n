import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { MaxMarginalRelevanceSearchOptions, VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/hanavector.d.ts
type DistanceStrategy = "euclidean" | "cosine";
type ComparisonRValue = string | number | boolean | Date | Array<ComparisonRValue>;
type Comparator = "$eq" | "$ne" | "$lt" | "$lte" | "$gt" | "$gte" | "$in" | "$nin" | "$between" | "$like";
type ComparatorFilter = { [K in Comparator]?: ComparisonRValue };
type LogicalOperator = "$and" | "$or";
type LogicalFilter = { [K in LogicalOperator]?: Filter[] };
type PropertyFilter = {
  [property: string]: string | number | boolean | Date | ComparatorFilter;
};
type Filter = PropertyFilter | LogicalFilter;
/**
 * Interface defining the arguments required to create an instance of
 * `HanaDB`.
 */
interface HanaDBArgs {
  connection: any;
  distanceStrategy?: DistanceStrategy;
  tableName?: string;
  contentColumn?: string;
  metadataColumn?: string;
  vectorColumn?: string;
  vectorColumnLength?: number;
  specificMetadataColumns?: string[];
}
declare class HanaDB extends VectorStore {
  private connection;
  private distanceStrategy;
  private static compiledPattern;
  private tableName;
  private contentColumn;
  private metadataColumn;
  private vectorColumn;
  private vectorColumnLength;
  FilterType: Filter;
  private specificMetadataColumns;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: HanaDBArgs);
  private executeQuery;
  private prepareQuery;
  private executeStatement;
  initialize(): Promise<void>;
  /**
   * Sanitizes the input string by removing characters that are not alphanumeric or underscores.
   * @param inputStr The string to be sanitized.
   * @returns The sanitized string.
   */
  static sanitizeName(inputStr: string): string;
  static escapeSqlIdentifier(inputStr: string): string;
  /**
   * Sanitizes the input to integer. Throws an error if the value is less than lower bound.
   * @param inputInt The input to be sanitized.
   * @returns The sanitized integer.
   */
  static sanitizeInt(inputInt: number | string, lowerBound?: number): number;
  /**
   * Sanitizes a list to ensure all elements are floats (numbers in TypeScript).
   * Throws an error if any element is not a number.
   *
   * @param {number[]} embedding - The array of numbers (floats) to be sanitized.
   * @returns {number[]} The sanitized array of numbers (floats).
   * @throws {Error} Throws an error if any element is not a number.
   */
  static sanitizeListFloat(embedding: number[]): number[];
  /**
   * Sanitizes the keys of the metadata object to ensure they match the required pattern.
   * Throws an error if any key does not match the pattern.
   *
   * @param {Record<string, any>} metadata - The metadata object with keys to be validated.
   * @returns {object[] | object} The original metadata object if all keys are valid.
   * @throws {Error} Throws an error if any metadata key is invalid.
   */
  private sanitizeMetadataKeys;
  /**
   * Parses a string representation of a float array and returns an array of numbers.
   * @param {string} arrayAsString - The string representation of the array.
   * @returns {number[]} An array of floats parsed from the string.
   */
  static parseFloatArrayFromString(arrayAsString: string): number[];
  /**
   * Checks if the specified column exists in the table and validates its data type and length.
   * @param tableName The name of the table.
   * @param columnName The name of the column to check.
   * @param columnType The expected data type(s) of the column.
   * @param columnLength The expected length of the column. Optional.
   */
  checkColumn(tableName: string, columnName: string, columnType: string | string[], columnLength?: number): Promise<void>;
  private createTableIfNotExists;
  tableExists(tableName: string): Promise<boolean>;
  /**
   * Creates a WHERE clause based on the provided filter object.
   * @param filter - A filter object with keys as metadata fields and values as filter values.
   * @returns A tuple containing the WHERE clause string and an array of query parameters.
   */
  private createWhereByFilter;
  /**
   * Processes a filter object to generate SQL WHERE clause components.
   * @param filter - A filter object with keys as metadata fields and values as filter values.
   * @returns A tuple containing the WHERE clause string and an array of query parameters.
   */
  private processFilterObject;
  /**
   * Creates an HNSW vector index on a specified table and vector column with
   * optional build and search configurations. If no configurations are provided,
   * default parameters from the database are used. If provided values exceed the
   * valid ranges, an error will be raised.
   * The index is always created in ONLINE mode.
   *
   * @param {object} options Object containing configuration options for the index
   * @param {number} [options.m] (Optional) Maximum number of neighbors per graph node (Valid Range: [4, 1000])
   * @param {number} [options.efConstruction] (Optional) Maximal candidates to consider when building the graph
   *                                           (Valid Range: [1, 100000])
   * @param {number} [options.efSearch] (Optional) Minimum candidates for top-k-nearest neighbor queries
   *                                     (Valid Range: [1, 100000])
   * @param {string} [options.indexName] (Optional) Custom index name. Defaults to <table_name>_<distance_strategy>_idx
   * @returns {Promise<void>} Promise that resolves when index is added.
   */
  createHnswIndex(options?: {
    m?: number;
    efConstruction?: number;
    efSearch?: number;
    indexName?: string;
  }): Promise<void>;
  /**
   * Deletes entries from the table based on the provided filter.
   * @param ids - Optional. Deletion by ids is not supported and will throw an error.
   * @param filter - Optional. A filter object to specify which entries to delete.
   * @throws Error if 'ids' parameter is provided, as deletion by ids is not supported.
   * @throws Error if 'filter' parameter is not provided, as it is required for deletion.
   * to do: adjust the call signature
   */
  delete(options: {
    ids?: string[];
    filter?: Filter;
  }): Promise<void>;
  /**
   * Static method to create a HanaDB instance from raw texts. This method embeds the documents,
   * creates a table if it does not exist, and adds the documents to the table.
   * @param texts Array of text documents to add.
   * @param metadatas metadata for each text document.
   * @param embedding EmbeddingsInterface instance for document embedding.
   * @param dbConfig Configuration for the HanaDB.
   * @returns A Promise that resolves to an instance of HanaDB.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: HanaDBArgs): Promise<HanaDB>;
  /**
   * Creates an instance of `HanaDB` from an array of
   * Document instances. The documents are added to the database.
   * @param docs List of documents to be converted to vectors.
   * @param embeddings Embeddings instance used to convert the documents to vectors.
   * @param dbConfig Configuration for the HanaDB.
   * @returns Promise that resolves to an instance of `HanaDB`.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: HanaDBArgs): Promise<HanaDB>;
  /**
   * Adds an array of documents to the table. The documents are first
   * converted to vectors using the `embedDocuments` method of the
   * `embeddings` instance.
   * @param documents Array of Document instances to be added to the table.
   * @returns Promise that resolves when the documents are added.
   */
  addDocuments(documents: Document[]): Promise<void>;
  /**
   * Adds an array of vectors and corresponding documents to the database.
   * The vectors and documents are batch inserted into the database.
   * @param vectors Array of vectors to be added to the table.
   * @param documents Array of Document instances corresponding to the vectors.
   * @returns Promise that resolves when the vectors and documents are added.
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<void>;
  /**
     * Return docs most similar to query.
     * @param query Query text for the similarity search.
     * @param k Number of Documents to return. Defaults to 4.
     * @param filter A dictionary of metadata fields and values to filter by.
                    Defaults to None.
     * @returns Promise that resolves to a list of documents and their corresponding similarity scores.
     */
  similaritySearch(query: string, k: number, filter?: this["FilterType"]): Promise<Document[]>;
  /**
     * Return documents and score values most similar to query.
     * @param query Query text for the similarity search.
     * @param k Number of Documents to return. Defaults to 4.
     * @param filter A dictionary of metadata fields and values to filter by.
                    Defaults to None.
     * @returns Promise that resolves to a list of documents and their corresponding similarity scores.
     */
  similaritySearchWithScore(query: string, k: number, filter?: this["FilterType"]): Promise<[Document, number][]>;
  /**
     * Return docs most similar to the given embedding.
     * @param query Query embedding for the similarity search.
     * @param k Number of Documents to return. Defaults to 4.
     * @param filter A dictionary of metadata fields and values to filter by.
                    Defaults to None.
     * @returns Promise that resolves to a list of documents and their corresponding similarity scores.
     */
  similaritySearchVectorWithScore(queryEmbedding: number[], k: number, filter?: this["FilterType"]): Promise<[Document, number][]>;
  /**
   * Performs a similarity search based on vector comparison and returns documents along with their similarity scores and vectors.
   * @param embedding The vector representation of the query for similarity comparison.
   * @param k The number of top similar documents to return.
   * @param filter Optional filter criteria to apply to the search query.
   * @returns A promise that resolves to an array of tuples, each containing a Document, its similarity score, and its vector.
   */
  similaritySearchWithScoreAndVectorByVector(embedding: number[], k: number, filter?: this["FilterType"]): Promise<Array<[Document, number, number[]]>>;
  /**
   * Return documents selected using the maximal marginal relevance.
   * Maximal marginal relevance optimizes for similarity to the query AND
   * diversity among selected documents.
   * @param query Text to look up documents similar to.
   * @param options.k Number of documents to return.
   * @param options.fetchK=20 Number of documents to fetch before passing to
   *     the MMR algorithm.
   * @param options.lambda=0.5 Number between 0 and 1 that determines the
   *     degree of diversity among the results, where 0 corresponds to maximum
   *     diversity and 1 to minimum diversity.
   * @returns List of documents selected by maximal marginal relevance.
   */
  maxMarginalRelevanceSearch(query: string, options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>): Promise<Document[]>;
}
//#endregion
export { DistanceStrategy, HanaDB, HanaDBArgs };
//# sourceMappingURL=hanavector.d.cts.map