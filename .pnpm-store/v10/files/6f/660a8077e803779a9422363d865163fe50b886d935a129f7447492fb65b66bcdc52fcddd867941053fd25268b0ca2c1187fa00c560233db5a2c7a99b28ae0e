import * as _pinecone_database_pinecone0 from "@pinecone-database/pinecone";
import { Index, RecordMetadata } from "@pinecone-database/pinecone";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { MaxMarginalRelevanceSearchOptions, VectorStore } from "@langchain/core/vectorstores";
import { Document, DocumentInterface } from "@langchain/core/documents";
import { AsyncCaller, AsyncCallerParams } from "@langchain/core/utils/async_caller";

//#region src/vectorstores.d.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PineconeMetadata = Record<string, any>;
type HTTPHeaders = {
  [key: string]: string;
};
/**
 * Database config for your vectorstore.
 */
interface PineconeStoreParams extends AsyncCallerParams {
  /**
   * The Pinecone index to use.
   * Either this or pineconeConfig must be provided.
   */
  pineconeIndex?: Index;
  textKey?: string;
  namespace?: string;
  filter?: PineconeMetadata;
  /**
   * Configuration for the Pinecone index.
   * Either this or pineconeIndex must be provided.
   */
  pineconeConfig?: {
    indexName: ConstructorParameters<typeof Index>[0];
    config: ConstructorParameters<typeof Index>[1];
    namespace?: string;
    indexHostUrl?: string;
    additionalHeaders?: HTTPHeaders;
  };
}
/**
 * Type that defines the parameters for the delete operation in the
 * PineconeStore class. It includes ids, filter, deleteAll flag, and namespace.
 */
type PineconeDeleteParams = {
  ids?: string[];
  deleteAll?: boolean;
  filter?: object;
  namespace?: string;
};
/**
 * Pinecone vector store integration.
 *
 * Setup:
 * Install `@langchain/pinecone` and `@pinecone-database/pinecone` to pass a client in.
 *
 * ```bash
 * npm install @langchain/pinecone @pinecone-database/pinecone
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/_langchain_pinecone.PineconeStore.html#constructor)
 *
 * <details open>
 * <summary><strong>Instantiate</strong></summary>
 *
 * ```typescript
 * import { PineconeStore } from '@langchain/pinecone';
 * // Or other embeddings
 * import { OpenAIEmbeddings } from '@langchain/openai';
 *
 * import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
 *
 * const pinecone = new PineconeClient();
 *
 * // Will automatically read the PINECONE_API_KEY env var
 * const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!);
 *
 * const embeddings = new OpenAIEmbeddings({
 *   model: "text-embedding-3-small",
 * });
 *
 * const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
 *   pineconeIndex,
 *   // Maximum number of batch requests to allow at once. Each batch is 1000 vectors.
 *   maxConcurrency: 5,
 *   // You can pass a namespace here too
 *   // namespace: "foo",
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
declare class PineconeStore extends VectorStore {
  FilterType: PineconeMetadata;
  textKey: string;
  namespace?: string;
  pineconeIndex: Index;
  filter?: PineconeMetadata;
  caller: AsyncCaller;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, params: PineconeStoreParams);
  /**
   * Method that adds documents to the Pinecone database.
   *
   * @param documents Array of documents to add to the Pinecone database.
   * @param options Optional ids for the documents.
   * @returns Promise that resolves with the ids of the added documents.
   */
  addDocuments(documents: Document[], options?: {
    ids?: string[];
    namespace?: string;
  } | string[]): Promise<string[]>;
  /**
   * Method that adds vectors to the Pinecone database.
   *
   * @param vectors Array of vectors to add to the Pinecone database.
   * @param documents Array of documents associated with the vectors.
   * @param options Optional ids for the vectors.
   * @returns Promise that resolves with the ids of the added vectors.
   */
  addVectors(vectors: number[][], documents: Document[], options?: {
    ids?: string[];
    namespace?: string;
  } | string[]): Promise<string[]>;
  /**
   * Method that deletes vectors from the Pinecone database.
   * @param params Parameters for the delete operation.
   * @returns Promise that resolves when the delete operation is complete.
   */
  delete(params: PineconeDeleteParams): Promise<void>;
  protected _runPineconeQuery(query: number[], k: number, filter?: PineconeMetadata, options?: {
    includeValues: boolean;
  }): Promise<_pinecone_database_pinecone0.QueryResponse<RecordMetadata>>;
  /**
   * Format the matching results from the Pinecone query.
   * @param matches Matching results from the Pinecone query.
   * @returns An array of arrays, where each inner array contains a document and its score.
   */
  private _formatMatches;
  /**
   * Method that performs a similarity search in the Pinecone database and
   * returns the results along with their scores.
   * @param query Query vector for the similarity search.
   * @param k Number of top results to return.
   * @param filter Optional filter to apply to the search.
   * @returns Promise that resolves with an array of documents and their scores.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: PineconeMetadata): Promise<[Document, number][]>;
  /**
   * Return documents selected using the maximal marginal relevance.
   * Maximal marginal relevance optimizes for similarity to the query AND diversity
   * among selected documents.
   *
   * @param {string} query - Text to look up documents similar to.
   * @param {number} options.k - Number of documents to return.
   * @param {number} options.fetchK=20 - Number of documents to fetch before passing to the MMR algorithm.
   * @param {number} options.lambda=0.5 - Number between 0 and 1 that determines the degree of diversity among the results,
   *                 where 0 corresponds to maximum diversity and 1 to minimum diversity.
   * @param {PineconeMetadata} options.filter - Optional filter to apply to the search.
   *
   * @returns {Promise<DocumentInterface[]>} - List of documents selected by maximal marginal relevance.
   */
  maxMarginalRelevanceSearch(query: string, options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>): Promise<DocumentInterface[]>;
  /**
   * Static method that creates a new instance of the PineconeStore class
   * from texts.
   * @param texts Array of texts to add to the Pinecone database.
   * @param metadatas Metadata associated with the texts.
   * @param embeddings Embeddings to use for the texts.
   * @param dbConfig Configuration for the Pinecone database.
   * @returns Promise that resolves with a new instance of the PineconeStore class.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: {
    pineconeIndex: Index;
    textKey?: string;
    namespace?: string | undefined;
  } | PineconeStoreParams): Promise<PineconeStore>;
  /**
   * Static method that creates a new instance of the PineconeStore class
   * from documents.
   * @param docs Array of documents to add to the Pinecone database.
   * @param embeddings Embeddings to use for the documents.
   * @param dbConfig Configuration for the Pinecone database.
   * @returns Promise that resolves with a new instance of the PineconeStore class.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: PineconeStoreParams): Promise<PineconeStore>;
  /**
   * Static method that creates a new instance of the PineconeStore class
   * from an existing index.
   * @param embeddings Embeddings to use for the documents.
   * @param dbConfig Configuration for the Pinecone database.
   * @returns Promise that resolves with a new instance of the PineconeStore class.
   */
  static fromExistingIndex(embeddings: EmbeddingsInterface, dbConfig: PineconeStoreParams): Promise<PineconeStore>;
}
//#endregion
export { PineconeDeleteParams, PineconeStore, PineconeStoreParams };
//# sourceMappingURL=vectorstores.d.cts.map