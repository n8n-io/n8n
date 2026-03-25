import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";

//#region src/retrievers/azion_edgesql.d.ts

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
 * Interface for the response returned when searching embeddings.
 */
interface SearchEmbeddingsResponse {
  id: number;
  content: string;
  metadata: {
    searchtype: string;
    [key: string]: unknown;
  };
}
/**
 * Interface for the arguments required to initialize an Azion library.
 */
interface AzionRetrieverArgs extends BaseRetrieverInput {
  /**
   * Search type to perform. Cosine similarity and hybrid (vector + FTS) are currently supported.
   */
  searchType?: "hybrid" | "similarity";
  /**
   * The number of documents retrieved with cosine similarity (vector) search. Minimum is 1.
   */
  similarityK?: number;
  /**
   * The number of documents retrieved with full text search. Minimum is 1.
   */
  ftsK?: number;
  /**
   * The name of the database to search for documents.
   */
  dbName?: string;
  /**
   * The prompt to the chatmodel to extract entities to perform Full text search on the database
   */
  promptEntityExtractor?: string;
  /**
   * The chatmodel to extract entities to perform Full text search on the database
   */
  entityExtractor?: BaseChatModel;
  /**
   * Max items to maintain per searchtype. Default is 3.
   */
  maxItemsSearch?: number;
  /**
   * The columns from the tables that metadata must contain
   */
  metadataItems?: string[];
  /**
   * Name of the table to perform vector similarity seach. Default is 'documents'
   */
  vectorTable?: string;
  /**
   * Name of the table to perform full text search. Default is 'document_fts'
   */
  ftsTable?: string;
  /**
   * Filters to apply to the search. Default is an empty array.
   */
  filters?: AzionFilter[];
  /** Whether the metadata is contained in a single column or multiple columns */
  expandedMetadata?: boolean;
}
/**
 * class for performing hybrid search operations on Azion's Edge SQL database.
 * It extends the 'BaseRetriever' class and implements methods for
 * similarity search and full-text search (FTS).
 */
/**
 * Example usage:
 * ```ts
 * // Initialize embeddings and chat model
 * const embeddings = new OpenAIEmbeddings();
 * const chatModel = new ChatOpenAI({ model: "gpt-4o-mini" });
 *
 * // Create retriever with hybrid search
 * const retriever = new AzionRetriever(embeddings, chatModel, {
 *   searchType: 'hybrid',
 *   similarityK: 3,
 *   ftsK: 2,
 *   dbName: 'my_docs',
 *   metadataItems: ['category', 'author'],
 *   vectorTable: 'documents',
 *   ftsTable: 'documents_fts',
 *   filters: [
 *     { operator: '=', column: 'status', value: 'published' }
 *   ]
 * });
 *
 * // Retrieve relevant documents
 * const docs = await retriever.invoke(
 *   "What are coral reefs in Australia?"
 * );
 *
 * // Create retriever with similarity search only
 * const simRetriever = new AzionRetriever(embeddings, chatModel, {
 *   searchType: 'similarity',
 *   similarityK: 5,
 *   dbName: 'my_docs',
 *   vectorTable: 'documents'
 * });
 *
 * // Customize entity extraction prompt
 * const customRetriever = new AzionRetriever(embeddings, chatModel, {
 *   searchType: 'hybrid',
 *   similarityK: 3,
 *   ftsK: 2,
 *   dbName: 'my_docs',
 *   promptEntityExtractor: "Extract key entities from: {{query}}"
 * });
 * ```
 */
declare class AzionRetriever extends BaseRetriever {
  static lc_name(): string;
  /** Namespace for the retriever in LangChain */
  lc_namespace: string[];
  /** Type of search to perform - either hybrid (combining vector + FTS) or similarity only */
  searchType?: "hybrid" | "similarity";
  /** Number of results to return from similarity search. Minimum is 1. */
  similarityK: number;
  /** Number of results to return from full text search. Minimum is 1. */
  ftsK: number;
  /** Interface for generating embeddings from text */
  embeddings: EmbeddingsInterface;
  /** Name of the database to search */
  dbName: string;
  /** Optional ChatModel used to extract entities from queries */
  entityExtractor?: BaseChatModel;
  /** Prompt template for entity extraction */
  promptEntityExtractor: string;
  /** Optional metadata columns to include in results */
  metadataItems?: string[];
  /** Name of table containing vector embeddings for similarity search */
  vectorTable: string;
  /** Name of table containing documents for full text search */
  ftsTable: string;
  /** Array of filters to apply to search results */
  filters: AzionFilter[];
  /** Whether the metadata is contained in a single column or multiple columns */
  expandedMetadata: boolean;
  constructor(embeddings: EmbeddingsInterface, args: AzionRetrieverArgs);
  /**
   * Generates a string of filters for the SQL query.
   * @param {AzionFilter[]} filters - The filters to apply to the search.
   * @returns {string} A string of filters for the SQL query.
   */
  protected generateFilters(filters: AzionFilter[]): string;
  /**
   * Generates SQL queries for full-text search and similarity search.
   * @param {number[]} embeddedQuery - The embedded query vector.
   * @param {string} queryEntities - The entities extracted from the query for full-text search.
   * @param {string} metadata - Additional metadata columns to be included in the results.
   * @returns An object containing the FTS query and similarity query strings.
   */
  protected generateSqlQueries(embeddedQuery: number[], queryEntities: string, metadata: string): {
    ftsQuery: string;
    similarityQuery: string;
  };
  /**
   * Generates the SQL statements for the similarity search and full-text search.
   * @param query The user query.
   * @returns An array of SQL statements.
   */
  protected generateStatements(query: string): Promise<string[]>;
  /**
   * Generates the metadata string for the SQL query.
   * @returns {string} The metadata string.
   */
  protected generateMetadata(): string;
  /**
   * Performs a similarity search on the vector store and returns the top 'similarityK' similar documents.
   * @param query The query string.
   * @returns A promise that resolves with the similarity search results when the search is complete.
   */
  protected similaritySearchWithScore(query: string): Promise<[Document][]>;
  /**
   * Extracts entities from a user query using the entityExtractor model.
   * @param query The user query
   * @returns A promise that resolves with the extracted entities when the extraction is complete.
   */
  protected extractEntities(query: string): Promise<string>;
  /**
   * Converts a query to a FTS query.
   * @param query The user query
   * @returns The converted FTS query
   */
  protected convert2FTSQuery(query: string): string;
  /**
   * Performs a hybrid search on the vector store, using cosine similarity and FTS search, and
   * returns the top 'similarityK' + 'ftsK' similar documents.
   * @param query The user query
   * @returns A promise that resolves with the hybrid search results when the search is complete.
   */
  protected hybridSearchAzion(query: string): Promise<[Document][]>;
  /**
   * Generates an error document based on the provided error information
   * @param error The error object containing details about the issue
   * @returns A promise that resolves to an array containing a single Document representing the error
   */
  protected searchError(error: {
    message: string;
    operation: string;
  } | undefined): Error;
  /**
   * Performs the selected search and returns the documents retrieved.
   * @param query The user query
   * @returns A promise that resolves with the completion of the search results.
   */
  _getRelevantDocuments(query: string): Promise<Document[]>;
  /**
   * Removes duplicate results from the search results, prioritizing a mix of similarity and FTS results.
   * @param {SearchEmbeddingsResponse[]} results - The array of search results to process.
   * @returns {SearchEmbeddingsResponse[]} An array of unique search results, with a maximum of 3 similarity and 3 FTS results.
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
  protected mapSearches(searches: SearchEmbeddingsResponse[]): [Document][];
  /**
   * Sanitizes an item by removing non-alphanumeric characters.
   * @param {string} item The item to sanitize.
   * @returns {string} The sanitized item.
   */
  private sanitizeItem;
}
//#endregion
export { AzionFilter, AzionRetriever, AzionRetrieverArgs, Column, Operator };
//# sourceMappingURL=azion_edgesql.d.ts.map