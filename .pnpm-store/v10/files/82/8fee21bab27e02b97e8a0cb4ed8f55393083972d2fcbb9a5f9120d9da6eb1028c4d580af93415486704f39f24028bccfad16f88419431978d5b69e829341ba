import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";
import { CallbackManagerForRetrieverRun, Callbacks } from "@langchain/core/callbacks/manager";
import { SupabaseClient } from "@supabase/supabase-js";

//#region src/retrievers/supabase.d.ts
type SearchResult = [Document, number, number];
interface SupabaseLibArgs extends BaseRetrieverInput {
  client: SupabaseClient;
  /**
   * The table name on Supabase. Defaults to "documents".
   */
  tableName?: string;
  /**
   * The name of the Similarity search function on Supabase. Defaults to "match_documents".
   */
  similarityQueryName?: string;
  /**
   * The name of the Keyword search function on Supabase. Defaults to "kw_match_documents".
   */
  keywordQueryName?: string;
  /**
   * The number of documents to return from the similarity search. Defaults to 2.
   */
  similarityK?: number;
  /**
   * The number of documents to return from the keyword search. Defaults to 2.
   */
  keywordK?: number;
}
interface SupabaseHybridSearchParams {
  query: string;
  similarityK: number;
  keywordK: number;
}
/**
 * Class for performing hybrid search operations on a Supabase database.
 * It extends the `BaseRetriever` class and implements methods for
 * similarity search, keyword search, and hybrid search.
 */
declare class SupabaseHybridSearch extends BaseRetriever {
  static lc_name(): string;
  lc_namespace: string[];
  similarityK: number;
  query: string;
  keywordK: number;
  similarityQueryName: string;
  client: SupabaseClient;
  tableName: string;
  keywordQueryName: string;
  embeddings: EmbeddingsInterface;
  constructor(embeddings: EmbeddingsInterface, args: SupabaseLibArgs);
  /**
   * Performs a similarity search on the Supabase database using the
   * provided query and returns the top 'k' similar documents.
   * @param query The query to use for the similarity search.
   * @param k The number of top similar documents to return.
   * @param _callbacks Optional callbacks to pass to the embedQuery method.
   * @returns A promise that resolves to an array of search results. Each result is a tuple containing a Document, its similarity score, and its ID.
   */
  protected similaritySearch(query: string, k: number, _callbacks?: Callbacks): Promise<SearchResult[]>;
  /**
   * Performs a keyword search on the Supabase database using the provided
   * query and returns the top 'k' documents that match the keywords.
   * @param query The query to use for the keyword search.
   * @param k The number of top documents to return that match the keywords.
   * @returns A promise that resolves to an array of search results. Each result is a tuple containing a Document, its similarity score multiplied by 10, and its ID.
   */
  protected keywordSearch(query: string, k: number): Promise<SearchResult[]>;
  /**
   * Combines the results of the `similaritySearch` and `keywordSearch`
   * methods and returns the top 'k' documents based on a combination of
   * similarity and keyword matching.
   * @param query The query to use for the hybrid search.
   * @param similarityK The number of top similar documents to return.
   * @param keywordK The number of top documents to return that match the keywords.
   * @param callbacks Optional callbacks to pass to the similaritySearch method.
   * @returns A promise that resolves to an array of search results. Each result is a tuple containing a Document, its combined score, and its ID.
   */
  protected hybridSearch(query: string, similarityK: number, keywordK: number, callbacks?: Callbacks): Promise<SearchResult[]>;
  _getRelevantDocuments(query: string, runManager?: CallbackManagerForRetrieverRun): Promise<Document[]>;
}
//#endregion
export { SupabaseHybridSearch, SupabaseHybridSearchParams, SupabaseLibArgs };
//# sourceMappingURL=supabase.d.ts.map