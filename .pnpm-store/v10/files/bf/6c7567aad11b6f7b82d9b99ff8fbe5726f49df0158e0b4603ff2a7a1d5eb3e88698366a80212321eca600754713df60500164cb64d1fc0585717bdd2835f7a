import { Document } from "@langchain/core/documents";
import { ZepClient } from "@getzep/zep-js";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";

//#region src/retrievers/zep.d.ts

/**
 * Configuration interface for the ZepRetriever class. Extends the
 * BaseRetrieverInput interface.
 *
 * @argument {string} sessionId - The ID of the Zep session.
 * @argument {string} url - The URL of the Zep API.
 * @argument {number} [topK] - The number of results to return.
 * @argument {string} [apiKey] - The API key for the Zep API.
 * @argument [searchScope] [searchScope] - The scope of the search: "messages" or "summary".
 * @argument [searchType] [searchType] - The type of search to perform: "similarity" or "mmr".
 * @argument {number} [mmrLambda] - The lambda value for the MMR search.
 * @argument {Record<string, unknown>} [filter] - The metadata filter to apply to the search.
 */
interface ZepRetrieverConfig extends BaseRetrieverInput {
  sessionId: string;
  url: string;
  topK?: number;
  apiKey?: string;
  searchScope?: "messages" | "summary";
  searchType?: "similarity" | "mmr";
  mmrLambda?: number;
  filter?: Record<string, unknown>;
}
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
declare class ZepRetriever extends BaseRetriever {
  static lc_name(): string;
  lc_namespace: string[];
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_aliases(): {
    [key: string]: string;
  } | undefined;
  zepClientPromise: Promise<ZepClient>;
  private sessionId;
  private topK?;
  private searchScope?;
  private searchType?;
  private mmrLambda?;
  private filter?;
  constructor(config: ZepRetrieverConfig);
  /**
   *  Converts an array of message search results to an array of Document objects.
   *  @param {MemorySearchResult[]} results - The array of search results.
   *  @returns {Document[]} An array of Document objects representing the search results.
   */
  private searchMessageResultToDoc;
  /**
   *  Converts an array of summary search results to an array of Document objects.
   *  @param {MemorySearchResult[]} results - The array of search results.
   *  @returns {Document[]} An array of Document objects representing the search results.
   */
  private searchSummaryResultToDoc;
  /**
   *  Retrieves the relevant documents based on the given query.
   *  @param {string} query - The query string.
   *  @returns {Promise<Document[]>} A promise that resolves to an array of relevant Document objects.
   */
  _getRelevantDocuments(query: string): Promise<Document[]>;
}
//#endregion
export { ZepRetriever, ZepRetrieverConfig };
//# sourceMappingURL=zep.d.cts.map