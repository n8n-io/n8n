import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/azion_edgesql.d.ts

/**
 * Represents a filter condition for querying the Azion database
 * @property operator - The comparison operator to use (e.g. =, !=, >, <, etc)
 * @property column - The database column to filter on
 * @property value - The value to compare against
 */
type AzionFilter = {
  operator: Operator;
  column: Column;
  value: string;
};
/**
 * Represents a database column name
 */
type Column = string;
/**
 * Valid SQL operators that can be used in filter conditions
 */
type Operator = "=" | "!=" | ">" | "<>" | "<" | ">=" | "<=" | "LIKE" | "NOT LIKE" | "IN" | "NOT IN" | "IS NULL" | "IS NOT NULL";
/**
 * Interface for configuring the Azion vector store setup
 * @property {string[]} columns - Additional columns to create in the database table. If expandedMetadata is true, this is required.
 * @property {"vector" | "hybrid"} mode - The search mode to enable:
 *                                       "vector" - Only vector similarity search
 *                                       "hybrid" - Both vector and full-text search capabilities
 */
interface AzionSetupOptions {
  columns?: string[];
  mode: "vector" | "hybrid";
}
/**
 * Interface for configuring hybrid search options that combines vector and full-text search
 * @property {number} kfts - Number of results to return from full-text search
 * @property {number} kvector - Number of results to return from vector similarity search
 * @property {AzionFilter[]} [filter] - Optional array of filters to apply to search results
 * @property {string[]} [metadataItems] - Optional array of metadata fields to include in results
 */
interface HybridSearchOptions {
  kfts: number;
  kvector: number;
  filter?: AzionFilter[];
  metadataItems?: string[];
}
/**
 * Interface for configuring full-text search options
 * @property {number} kfts - Number of results to return from full-text search
 * @property {AzionFilter[]} [filter] - Optional array of filters to apply to search results
 * @property {string[]} [metadataItems] - Optional array of metadata fields to include in results
 */
interface FullTextSearchOptions {
  kfts: number;
  filter?: AzionFilter[];
  metadataItems?: string[];
}
/**
 * Interface for configuring vector similarity search options
 * @property {number} kvector - Number of results to return from vector similarity search
 * @property {AzionFilter[]} [filter] - Optional array of filters to apply to search results
 * @property {string[]} [metadataItems] - Optional array of metadata fields to include in results
 */
interface SimilaritySearchOptions {
  kvector: number;
  filter?: AzionFilter[];
  metadataItems?: string[];
}
/**
 * Interface for the arguments required to initialize an Azion library.
 */
interface AzionVectorStoreArgs {
  tableName: string;
  filter?: AzionFilter[];
  dbName: string;
  expandedMetadata?: boolean;
}
/**
 * Example usage:
 * ```ts
 * // Initialize the vector store
 * const vectorStore = new AzionVectorStore(embeddings, {
 *   dbName: "mydb",
 *   tableName: "documents"
 * });
 *
 * // Setup database with hybrid search and metadata columns
 * await vectorStore.setupDatabase({
 *   columns: ["topic", "language"],
 *   mode: "hybrid"
 * });
 *
 *
 * // OR: Initialize using the static create method
 * const vectorStore = await AzionVectorStore.initialize(embeddings, {
 *   dbName: "mydb",
 *   tableName: "documents"
 * }, {
 *   columns: ["topic", "language"],
 *   mode: "hybrid"
 * });
 *
 * By default, the columns are not expanded, meaning that the metadata is stored in a single column:
 *
 * // Setup database with hybrid search and metadata columns
 * await vectorStore.setupDatabase({
 *   columns: ["*"],
 *   mode: "hybrid"
 * });
 *
 * // Add documents to the vector store
 * await vectorStore.addDocuments([
 *   new Document({
 *     pageContent: "Australia is known for its unique wildlife",
 *     metadata: { topic: "nature", language: "en" }
 *   })
 * ]);
 *
 * // Perform similarity search
 * const results = await vectorStore.similaritySearch(
 *   "coral reefs in Australia",
 *   2, // Return top 2 results
 *   { filter: [{ operator: "=", column: "topic", string: "biology" }] } // Optional AzionFilter
 * );
 *
 * // Perform full text search
 * const ftResults = await vectorStore.fullTextSearch(
 *   "Sydney Opera House",
 *   1, // Return top result
 *   { filter: [{ operator: "=", column: "language", string: "en" }] } // Optional AzionFilter
 * );
 * ```
 */
declare class AzionVectorStore extends VectorStore {
  /** Type declaration for filter type */
  FilterType: AzionFilter[];
  /** Name of the main table to store vectors and documents */
  tableName: string;
  /** Name of the database to use */
  dbName: string;
  /** Whether the metadata is contained in a single column or multiple columns */
  expandedMetadata: boolean;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: AzionVectorStoreArgs);
  /**
   * Creates a new vector store instance and sets up the database.
   * @param {EmbeddingsInterface} embeddings - The embeddings interface to use for vectorizing documents
   * @param {AzionVectorStoreArgs} args - Configuration options:
   *   @param {string} args.dbName - Name of the database to create/use
   *   @param {string} args.tableName - Name of the table to create/use
   * @param {AzionSetupOptions} setupOptions - Database setup options:
   *   @param {string[]} setupOptions.columns - Additional columns to create in the table beyond the required ones. If expandedMetadata is true, this is required.
   *   @param {"vector"|"hybrid"} setupOptions.mode - The search mode to enable:
   *     - "vector": Only vector similarity search capabilities
   *     - "hybrid": Both vector and full-text search capabilities
   * @returns {Promise<AzionVectorStore>} A promise that resolves with the configured vector store instance
   */
  static initialize(embeddings: EmbeddingsInterface, args: AzionVectorStoreArgs, setupOptions: AzionSetupOptions): Promise<AzionVectorStore>;
  /**
   * Adds documents to the vector store.
   * @param {Document[]} documents The documents to add.
   * @param {Object} options Optional parameters for adding the documents.
   * @returns A promise that resolves when the documents have been added.
   */
  addDocuments(documents: Document[]): Promise<void>;
  /**
   * Adds vectors to the vector store.
   * @param {number[][]} vectors The vectors to add.
   * @param {Document[]} documents The documents associated with the vectors.
   * @param {Object} options Optional parameters for adding the vectors.
   * @returns A promise that resolves with the IDs of the added vectors when the vectors have been added.
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<void>;
  private getEmbeddingsDimensions;
  private mapRowsFromDocuments;
  /**
   * Sets up the database and tables.
   * @param {AzionSetupOptions} setupOptions The setup options:
   *   - columns: string[] - The metadata columns to add to the table
   *   - mode: "vector" | "hybrid" - The mode to use for the table. "vector" for vector search only, "hybrid" for vector and full-text search
   * @returns {Promise<void>} A promise that resolves when the database and tables have been set up.
   */
  setupDatabase(setupOptions: AzionSetupOptions): Promise<void>;
  private handleTables;
  /**
   * Handles the error.
   * @param {Object} error The error object.
   * @param {string} message The message to display.
   * @returns {void} A void value.
   */
  private errorHandler;
  /**
   * Checks if the tables are setup.
   * @param {string | number | string[] | number[]} tables The tables.
   * @param {string} mode The mode.
   * @returns {boolean} Whether the tables are setup.
   */
  private areTablesSetup;
  private handleDatabase;
  private waitDatabaseCreation;
  private setupTables;
  private insertChunks;
  /**
   * Extracts the metadata columns from the rows.
   * @param {RowsInterface[]} rows The rows to extract the metadata columns from.
   * @returns {string[]} The metadata columns.
   */
  private extractMetadataColumns;
  /**
   * Creates the insert statement for a row.
   * @param {RowsInterface} row The row to create the insert statement for.
   * @param {string[]} metadataColumns The metadata columns.
   * @returns {string} The insert statement.
   */
  private createInsertStatement;
  /**
   * Creates the insert statements for the rows.
   * @param {RowsInterface[]} rows The rows to create the insert statements for.
   * @returns {string[]} The insert statements.
   */
  private createStatements;
  /**
   * Creates the insert chunks for the statements.
   * @param {string[]} statements The statements to create the insert chunks for.
   * @returns {string[][]} The insert chunks.
   */
  private createInsertChunks;
  /**
   * Gets the number of bytes in a string.
   * @param {string} str The string to get the number of bytes for.
   * @returns {number} The number of bytes in the string.
   */
  private getStringBytes;
  /**
   * Performs a similarity search on the vector store and returns the top 'similarityK' similar documents.
   * @param {number[]} vector The vector to search for.
   * @param {number} k The number of documents to return.
   * @param {AzionFilter[]} filter Optional filters to apply to the search.
   * @param {string[]} metadataItems Optional metadata items to include in the search.
   * @returns {Promise<[Document, number][]>} A promise that resolves with the similarity search results when the search is complete.
   */
  similaritySearchVectorWithScore(vector: number[], k: number, filter?: AzionFilter[], metadataItems?: string[]): Promise<[Document, number][]>;
  /**
   * Performs a full-text search on the vector store and returns the top 'k' similar documents.
   * @param query The query string to search for
   * @param options The options for the full-text search, including:
   *                - kfts: The number of full-text search results to return
   *                - filter: Optional filters to apply to narrow down the search results
   *                - metadataItems: Optional metadata fields to include in the results
   * @returns A promise that resolves with the full-text search results when the search is complete.
   */
  azionFullTextSearch(query: string, options: FullTextSearchOptions): Promise<[Document<Record<string, any>>, number][]>;
  /**
   * Performs a hybrid search on the vector store and returns the top 'k' similar documents.
   * @param query The query string to search for
   * @param options The options for the hybrid search, including:
   *                - kfts: The number of full-text search results to return
   *                - kvector: The number of vector search results to return
   *                - filter: Optional filters to apply to narrow down the search results
   *                - metadataItems: Optional metadata fields to include in the results
   * @returns A promise that resolves with the hybrid search results when the search is complete.
   */
  azionHybridSearch(query: string, hybridSearchOptions: HybridSearchOptions): Promise<[Document, number][]>;
  /**
   * Performs a similarity search on the vector store and returns the top 'k' similar documents.
   * @param query The query string.
   * @param options The options for the similarity search, including:
   *                - kvector: The number of vector search results to return
   *                - filter: Optional filters to apply to the search
   *                - metadataItems: Optional metadata fields to include in results
   * @returns A promise that resolves with the similarity search results when the search is complete.
   */
  azionSimilaritySearch(query: string, options: SimilaritySearchOptions): Promise<[Document, number][]>;
  /**
   * Generates an error document based on the provided error information
   * @param {Object} error The error object containing details about the issue
   * @returns {Promise<[Document, number][]>} A promise that resolves to an array containing a single Document representing the error
   */
  private searchError;
  /**
   * Deletes documents from the vector store.
   * @param {string[]} ids The IDs of the documents to delete.
   * @returns {Promise<void>} A promise that resolves when the documents have been deleted.
   */
  delete(ids: string[]): Promise<void>;
  /**
   * Removes duplicate results from the search results, prioritizing a mix of similarity and FTS results.
   * @param {[Document, number][]} results - The array of search results to process, containing document and score pairs
   * @param {number} kfts - Maximum number of full-text search results to include
   * @param {number} kvector - Maximum number of vector similarity search results to include
   * @returns {[Document, number][]} An array of unique search results, limited by kfts and kvector parameters
   */
  private removeDuplicates;
  /**
   * Converts query results to SearchEmbeddingsResponse objects.
   * @param {QueryResult[]} results - The raw query results from the database.
   * @returns {SearchEmbeddingsResponse[]} An array of SearchEmbeddingsResponse objects.
   */
  private mapRows;
  /**
   * Maps search results to Document objects.
   * @param {SearchEmbeddingsResponse[]} searches An array of SearchEmbeddingsResponse objects.
   * @returns An array of tuples, each containing a single Document object.
   */
  private mapSearches;
  /**
   * Generates the metadata string for the SQL query.
   * @param {string[]} metadataItems - The metadata items to include in the query.
   * @param {string} searchType - The type of search.
   * @returns {string} The metadata string.
   */
  private generateMetadata;
  /**
   * Generates the filters string for the SQL query.
   * @param {AzionFilter[]} filters The filters to apply to the query.
   * @returns {string} The filters string.
   */
  private generateFilters;
  /**
   * Creates the insert sql query for a row.
   * @param {string[]} columnNames The column names.
   * @param {string[]} values The values.
   * @returns {string} The insert sql query.
   */
  private createInsertString;
  /**
   * Escapes the quotes in the value.
   * @param {string} value The value to escape the quotes in.
   * @returns {string} The value with the quotes escaped.
   */
  private escapeQuotes;
  /**
   * Sanitizes an item by removing non-alphanumeric characters.
   * @param {string} item The item to sanitize.
   * @returns {string} The sanitized item.
   */
  private sanitizeItem;
  /**
   * Converts a query to a FTS query.
   * @param query The user query
   * @returns The converted FTS query
   */
  protected convert2FTSQuery(query: string): string;
}
//#endregion
export { AzionFilter, AzionVectorStore, AzionVectorStoreArgs, Column, Operator };
//# sourceMappingURL=azion_edgesql.d.cts.map