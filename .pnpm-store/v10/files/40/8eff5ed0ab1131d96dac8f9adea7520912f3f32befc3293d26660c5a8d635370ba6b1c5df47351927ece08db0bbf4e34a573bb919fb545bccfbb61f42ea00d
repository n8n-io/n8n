import { cosine } from "../util/ml-distance/similarities.js";
import { Document, DocumentInterface } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { MaxMarginalRelevanceSearchOptions, VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/memory.d.ts

/**
 * Interface representing a vector in memory. It includes the content
 * (text), the corresponding embedding (vector), and any associated
 * metadata.
 */
interface MemoryVector {
  content: string;
  embedding: number[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
  id?: string;
}
/**
 * Interface for the arguments that can be passed to the
 * `MemoryVectorStore` constructor. It includes an optional `similarity`
 * function.
 */
interface MemoryVectorStoreArgs {
  similarity?: typeof cosine;
}
/**
 * In-memory, ephemeral vector store.
 *
 * Setup:
 * Install `langchain`:
 *
 * ```bash
 * npm install langchain
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/langchain.vectorstores_memory.MemoryVectorStore.html#constructor)
 *
 * <details open>
 * <summary><strong>Instantiate</strong></summary>
 *
 * ```typescript
 * import { MemoryVectorStore } from 'langchain/vectorstores/memory';
 * // Or other embeddings
 * import { OpenAIEmbeddings } from '@langchain/openai';
 *
 * const embeddings = new OpenAIEmbeddings({
 *   model: "text-embedding-3-small",
 * });
 *
 * const vectorStore = new MemoryVectorStore(embeddings);
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
 *
 * await vectorStore.addDocuments(documents);
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
declare class MemoryVectorStore extends VectorStore {
  FilterType: (doc: Document) => boolean;
  memoryVectors: MemoryVector[];
  similarity: typeof cosine;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, {
    similarity,
    ...rest
  }?: MemoryVectorStoreArgs);
  /**
   * Method to add documents to the memory vector store. It extracts the
   * text from each document, generates embeddings for them, and adds the
   * resulting vectors to the store.
   * @param documents Array of `Document` instances to be added to the store.
   * @returns Promise that resolves when all documents have been added.
   */
  addDocuments(documents: Document[]): Promise<void>;
  /**
   * Method to add vectors to the memory vector store. It creates
   * `MemoryVector` instances for each vector and document pair and adds
   * them to the store.
   * @param vectors Array of vectors to be added to the store.
   * @param documents Array of `Document` instances corresponding to the vectors.
   * @returns Promise that resolves when all vectors have been added.
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<void>;
  protected _queryVectors(query: number[], k: number, filter?: this["FilterType"]): Promise<{
    similarity: number;
    index: number;
    metadata: Record<string, any>;
    content: string;
    embedding: number[];
    id: string | undefined;
  }[]>;
  /**
   * Method to perform a similarity search in the memory vector store. It
   * calculates the similarity between the query vector and each vector in
   * the store, sorts the results by similarity, and returns the top `k`
   * results along with their scores.
   * @param query Query vector to compare against the vectors in the store.
   * @param k Number of top results to return.
   * @param filter Optional filter function to apply to the vectors before performing the search.
   * @returns Promise that resolves with an array of tuples, each containing a `Document` and its similarity score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document, number][]>;
  maxMarginalRelevanceSearch(query: string, options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>): Promise<DocumentInterface[]>;
  /**
   * Static method to create a `MemoryVectorStore` instance from an array of
   * texts. It creates a `Document` for each text and metadata pair, and
   * adds them to the store.
   * @param texts Array of texts to be added to the store.
   * @param metadatas Array or single object of metadata corresponding to the texts.
   * @param embeddings `Embeddings` instance used to generate embeddings for the texts.
   * @param dbConfig Optional `MemoryVectorStoreArgs` to configure the `MemoryVectorStore` instance.
   * @returns Promise that resolves with a new `MemoryVectorStore` instance.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig?: MemoryVectorStoreArgs): Promise<MemoryVectorStore>;
  /**
   * Static method to create a `MemoryVectorStore` instance from an array of
   * `Document` instances. It adds the documents to the store.
   * @param docs Array of `Document` instances to be added to the store.
   * @param embeddings `Embeddings` instance used to generate embeddings for the documents.
   * @param dbConfig Optional `MemoryVectorStoreArgs` to configure the `MemoryVectorStore` instance.
   * @returns Promise that resolves with a new `MemoryVectorStore` instance.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig?: MemoryVectorStoreArgs): Promise<MemoryVectorStore>;
  /**
   * Static method to create a `MemoryVectorStore` instance from an existing
   * index. It creates a new `MemoryVectorStore` instance without adding any
   * documents or vectors.
   * @param embeddings `Embeddings` instance used to generate embeddings for the documents.
   * @param dbConfig Optional `MemoryVectorStoreArgs` to configure the `MemoryVectorStore` instance.
   * @returns Promise that resolves with a new `MemoryVectorStore` instance.
   */
  static fromExistingIndex(embeddings: EmbeddingsInterface, dbConfig?: MemoryVectorStoreArgs): Promise<MemoryVectorStore>;
}
//#endregion
export { MemoryVectorStore, MemoryVectorStoreArgs };
//# sourceMappingURL=memory.d.ts.map