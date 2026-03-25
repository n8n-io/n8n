import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { SupabaseClient } from "@supabase/supabase-js";
import { MaxMarginalRelevanceSearchOptions, VectorStore } from "@langchain/core/vectorstores";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";

//#region src/vectorstores/supabase.d.ts
type SupabaseMetadata = Record<string, any>;
type SupabaseFilter = PostgrestFilterBuilder<any, any, any>;
type SupabaseFilterRPCCall = (rpcCall: SupabaseFilter) => SupabaseFilter;
/**
 * Interface for the response returned when searching embeddings.
 */
interface SearchEmbeddingsResponse {
  id: number;
  content: string;
  metadata: object;
  embedding: number[];
  similarity: number;
}
/**
 * Interface for the arguments required to initialize a Supabase library.
 */
interface SupabaseLibArgs {
  client: SupabaseClient;
  tableName?: string;
  queryName?: string;
  filter?: SupabaseMetadata | SupabaseFilterRPCCall;
  upsertBatchSize?: number;
}
/**
 * Supabase vector store integration.
 *
 * Setup:
 * Install `@langchain/community` and `@supabase/supabase-js`.
 *
 * ```bash
 * npm install @langchain/community @supabase/supabase-js
 * ```
 *
 * See https://js.langchain.com/docs/integrations/vectorstores/supabase for
 * instructions on how to set up your Supabase instance.
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/_langchain_community.vectorstores_supabase.SupabaseVectorStore.html#constructor)
 *
 * <details open>
 * <summary><strong>Instantiate</strong></summary>
 *
 * ```typescript
 * import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
 * import { OpenAIEmbeddings } from "@langchain/openai";
 *
 * import { createClient } from "@supabase/supabase-js";
 *
 * const embeddings = new OpenAIEmbeddings({
 *   model: "text-embedding-3-small",
 * });
 *
 * const supabaseClient = createClient(
 *   process.env.SUPABASE_URL,
 *   process.env.SUPABASE_PRIVATE_KEY
 * );
 *
 * const vectorStore = new SupabaseVectorStore(embeddings, {
 *   client: supabaseClient,
 *   tableName: "documents",
 *   queryName: "match_documents",
 * });
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Add documents</strong></summary>
 *
 * ```typescript
 * import type { Document } from '@langchain/core/documents';
 *
 * const document1 = { pageContent: "foo", metadata: { baz: "bar" } };
 * const document2 = { pageContent: "thud", metadata: { bar: "baz" } };
 * const document3 = { pageContent: "i will be deleted :(", metadata: {} };
 *
 * const documents: Document[] = [document1, document2, document3];
 * const ids = ["1", "2", "3"];
 * await vectorStore.addDocuments(documents, { ids });
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Delete documents</strong></summary>
 *
 * ```typescript
 * await vectorStore.delete({ ids: ["3"] });
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>Similarity search</strong></summary>
 *
 * ```typescript
 * const results = await vectorStore.similaritySearch("thud", 1);
 * for (const doc of results) {
 *   console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
 * }
 * // Output: * thud [{"baz":"bar"}]
 * ```
 * </details>
 *
 * <br />
 *
 *
 * <details>
 * <summary><strong>Similarity search with filter</strong></summary>
 *
 * ```typescript
 * const resultsWithFilter = await vectorStore.similaritySearch("thud", 1, { baz: "bar" });
 *
 * for (const doc of resultsWithFilter) {
 *   console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
 * }
 * // Output: * foo [{"baz":"bar"}]
 * ```
 * </details>
 *
 * <br />
 *
 *
 * <details>
 * <summary><strong>Similarity search with score</strong></summary>
 *
 * ```typescript
 * const resultsWithScore = await vectorStore.similaritySearchWithScore("qux", 1);
 * for (const [doc, score] of resultsWithScore) {
 *   console.log(`* [SIM=${score.toFixed(6)}] ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
 * }
 * // Output: * [SIM=0.000000] qux [{"bar":"baz","baz":"bar"}]
 * ```
 * </details>
 *
 * <br />
 *
 * <details>
 * <summary><strong>As a retriever</strong></summary>
 *
 * ```typescript
 * const retriever = vectorStore.asRetriever({
 *   searchType: "mmr", // Leave blank for standard similarity search
 *   k: 1,
 * });
 * const resultAsRetriever = await retriever.invoke("thud");
 * console.log(resultAsRetriever);
 *
 * // Output: [Document({ metadata: { "baz":"bar" }, pageContent: "thud" })]
 * ```
 * </details>
 *
 * <br />
 */
declare class SupabaseVectorStore extends VectorStore {
  FilterType: SupabaseMetadata | SupabaseFilterRPCCall;
  client: SupabaseClient;
  tableName: string;
  queryName: string;
  filter?: SupabaseMetadata | SupabaseFilterRPCCall;
  upsertBatchSize: number;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: SupabaseLibArgs);
  /**
   * Adds documents to the vector store.
   * @param documents The documents to add.
   * @param options Optional parameters for adding the documents.
   * @returns A promise that resolves when the documents have been added.
   */
  addDocuments(documents: Document[], options?: {
    ids?: string[] | number[];
  }): Promise<string[]>;
  /**
   * Adds vectors to the vector store.
   * @param vectors The vectors to add.
   * @param documents The documents associated with the vectors.
   * @param options Optional parameters for adding the vectors.
   * @returns A promise that resolves with the IDs of the added vectors when the vectors have been added.
   */
  addVectors(vectors: number[][], documents: Document[], options?: {
    ids?: string[] | number[];
  }): Promise<string[]>;
  /**
   * Deletes vectors from the vector store.
   * @param params The parameters for deleting vectors.
   * @returns A promise that resolves when the vectors have been deleted.
   */
  delete(params: {
    ids: string[] | number[];
  }): Promise<void>;
  protected _searchSupabase(query: number[], k: number, filter?: this["FilterType"]): Promise<SearchEmbeddingsResponse[]>;
  /**
   * Performs a similarity search on the vector store.
   * @param query The query vector.
   * @param k The number of results to return.
   * @param filter Optional filter to apply to the search.
   * @returns A promise that resolves with the search results when the search is complete.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document, number][]>;
  /**
   * Return documents selected using the maximal marginal relevance.
   * Maximal marginal relevance optimizes for similarity to the query AND diversity
   * among selected documents.
   *
   * @param {string} query - Text to look up documents similar to.
   * @param {number} options.k - Number of documents to return.
   * @param {number} options.fetchK=20- Number of documents to fetch before passing to the MMR algorithm.
   * @param {number} options.lambda=0.5 - Number between 0 and 1 that determines the degree of diversity among the results,
   *                 where 0 corresponds to maximum diversity and 1 to minimum diversity.
   * @param {SupabaseLibArgs} options.filter - Optional filter to apply to the search.
   *
   * @returns {Promise<Document[]>} - List of documents selected by maximal marginal relevance.
   */
  maxMarginalRelevanceSearch(query: string, options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>): Promise<Document[]>;
  /**
   * Creates a new SupabaseVectorStore instance from an array of texts.
   * @param texts The texts to create documents from.
   * @param metadatas The metadata for the documents.
   * @param embeddings The embeddings to use.
   * @param dbConfig The configuration for the Supabase database.
   * @returns A promise that resolves with a new SupabaseVectorStore instance when the instance has been created.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: SupabaseLibArgs): Promise<SupabaseVectorStore>;
  /**
   * Creates a new SupabaseVectorStore instance from an array of documents.
   * @param docs The documents to create the instance from.
   * @param embeddings The embeddings to use.
   * @param dbConfig The configuration for the Supabase database.
   * @returns A promise that resolves with a new SupabaseVectorStore instance when the instance has been created.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: SupabaseLibArgs): Promise<SupabaseVectorStore>;
  /**
   * Creates a new SupabaseVectorStore instance from an existing index.
   * @param embeddings The embeddings to use.
   * @param dbConfig The configuration for the Supabase database.
   * @returns A promise that resolves with a new SupabaseVectorStore instance when the instance has been created.
   */
  static fromExistingIndex(embeddings: EmbeddingsInterface, dbConfig: SupabaseLibArgs): Promise<SupabaseVectorStore>;
}
//#endregion
export { SupabaseFilter, SupabaseFilterRPCCall, SupabaseLibArgs, SupabaseMetadata, SupabaseVectorStore };
//# sourceMappingURL=supabase.d.cts.map