import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { ChromaClient, ChromaClientArgs, Collection, CollectionConfiguration, CollectionMetadata, Where } from "chromadb";

//#region src/vectorstores/chroma.d.ts
type SharedChromaLibArgs = {
  numDimensions?: number;
  collectionName?: string;
  filter?: object;
  collectionMetadata?: CollectionMetadata;
  collectionConfiguration?: CollectionConfiguration;
  chromaCloudAPIKey?: string;
  clientParams?: Omit<ChromaClientArgs, "path">;
};
/**
 * Defines the arguments that can be passed to the `Chroma` class
 * constructor. It can either contain a `url` for the Chroma database, the
 * number of dimensions for the vectors (`numDimensions`), a
 * `collectionName` for the collection to be used in the database, and a
 * `filter` object; or it can contain an `index` which is an instance of
 * `ChromaClientT`, along with the `numDimensions`, `collectionName`, and
 * `filter`.
 */
type ChromaLibArgs = ({
  url?: string;
} & SharedChromaLibArgs) | ({
  index?: ChromaClient;
} & SharedChromaLibArgs);
/**
 * Defines the parameters for the `delete` method in the `Chroma` class.
 * It can either contain an array of `ids` of the documents to be deleted
 * or a `filter` object to specify the documents to be deleted.
 */
interface ChromaDeleteParams<T> {
  ids?: string[];
  filter?: T;
}
/**
 * Chroma vector store integration.
 *
 * Setup:
 * Install `@langchain/community` and `chromadb`.
 *
 * ```bash
 * npm install @langchain/community chromadb
 * ```
 *
 * ## [Constructor args](https://api.js.langchain.com/classes/langchain_community_vectorstores_chroma.Chroma.html#constructor)
 *
 * <details open>
 * <summary><strong>Instantiate</strong></summary>
 *
 * ```typescript
 * import { Chroma } from '@langchain/community/vectorstores/chroma';
 * // Or other embeddings
 * import { OpenAIEmbeddings } from '@langchain/openai';
 *
 * const embeddings = new OpenAIEmbeddings({
 *   model: "text-embedding-3-small",
 * })
 *
 * const vectorStore = new Chroma(
 *   embeddings,
 *   {
 *     collectionName: "foo",
 *     host: "localhost",
 *   }
 * );
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
 * const document3 = { pageContent: "I will be deleted :(", metadata: {} };
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
declare class Chroma extends VectorStore {
  FilterType: Where;
  index?: ChromaClient;
  collection?: Collection;
  collectionName: string;
  collectionMetadata?: CollectionMetadata;
  numDimensions?: number;
  clientParams?: Omit<ChromaClientArgs, "path">;
  url: string;
  filter?: object;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: ChromaLibArgs);
  /**
   * Adds documents to the Chroma database. The documents are first
   * converted to vectors using the `embeddings` instance, and then added to
   * the database.
   * @param documents An array of `Document` instances to be added to the database.
   * @param options Optional. An object containing an array of `ids` for the documents.
   * @returns A promise that resolves when the documents have been added to the database.
   */
  addDocuments(documents: Document[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  /**
   * Ensures that a collection exists in the Chroma database. If the
   * collection does not exist, it is created.
   * @returns A promise that resolves with the `Collection` instance.
   */
  ensureCollection(): Promise<Collection>;
  /**
   * Adds vectors to the Chroma database. The vectors are associated with
   * the provided documents.
   * @param vectors An array of vectors to be added to the database.
   * @param documents An array of `Document` instances associated with the vectors.
   * @param options Optional. An object containing an array of `ids` for the vectors.
   * @returns A promise that resolves with an array of document IDs when the vectors have been added to the database.
   */
  addVectors(vectors: number[][], documents: Document[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  /**
   * Deletes documents from the Chroma database. The documents to be deleted
   * can be specified by providing an array of `ids` or a `filter` object.
   * @param params An object containing either an array of `ids` of the documents to be deleted or a `filter` object to specify the documents to be deleted.
   * @returns A promise that resolves when the specified documents have been deleted from the database.
   */
  delete(params: ChromaDeleteParams<this["FilterType"]>): Promise<void>;
  /**
   * Searches for vectors in the Chroma database that are similar to the
   * provided query vector. The search can be filtered using the provided
   * `filter` object or the `filter` property of the `Chroma` instance.
   * @param query The query vector.
   * @param k The number of similar vectors to return.
   * @param filter Optional. A `filter` object to filter the search results.
   * @returns A promise that resolves with an array of tuples, each containing a `Document` instance and a similarity score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document<Record<string, any>>, number][]>;
  /**
   * Creates a new `Chroma` instance from an array of text strings. The text
   * strings are converted to `Document` instances and added to the Chroma
   * database.
   * @param texts An array of text strings.
   * @param metadatas An array of metadata objects or a single metadata object. If an array is provided, it must have the same length as the `texts` array.
   * @param embeddings An `Embeddings` instance used to generate embeddings for the documents.
   * @param dbConfig A `ChromaLibArgs` object containing the configuration for the Chroma database.
   * @returns A promise that resolves with a new `Chroma` instance.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: ChromaLibArgs): Promise<Chroma>;
  /**
   * Creates a new `Chroma` instance from an array of `Document` instances.
   * The documents are added to the Chroma database.
   * @param docs An array of `Document` instances.
   * @param embeddings An `Embeddings` instance used to generate embeddings for the documents.
   * @param dbConfig A `ChromaLibArgs` object containing the configuration for the Chroma database.
   * @returns A promise that resolves with a new `Chroma` instance.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: ChromaLibArgs): Promise<Chroma>;
  /**
   * Creates a new `Chroma` instance from an existing collection in the
   * Chroma database.
   * @param embeddings An `Embeddings` instance used to generate embeddings for the documents.
   * @param dbConfig A `ChromaLibArgs` object containing the configuration for the Chroma database.
   * @returns A promise that resolves with a new `Chroma` instance.
   */
  static fromExistingCollection(embeddings: EmbeddingsInterface, dbConfig: ChromaLibArgs): Promise<Chroma>;
  /** @ignore */
  static imports(): Promise<{
    ChromaClient: typeof ChromaClient;
  }>;
}
//#endregion
export { Chroma, ChromaDeleteParams, ChromaLibArgs };
//# sourceMappingURL=chroma.d.ts.map