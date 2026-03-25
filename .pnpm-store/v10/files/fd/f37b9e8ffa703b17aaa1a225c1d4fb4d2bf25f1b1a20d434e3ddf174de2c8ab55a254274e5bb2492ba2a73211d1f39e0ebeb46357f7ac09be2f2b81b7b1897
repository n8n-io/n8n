import { VectorStore, VectorStoreRetriever, VectorStoreRetrieverInput } from "@langchain/core/vectorstores";
import { DocumentInterface } from "@langchain/core/documents";
import { Embeddings } from "@langchain/core/embeddings";

//#region src/retrievers/matryoshka_retriever.d.ts

/**
 * Type for options when adding a document to the VectorStore.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AddDocumentOptions = Record<string, any>;
interface MatryoshkaRetrieverFields {
  /**
   * The number of documents to retrieve from the small store.
   * @default 50
   */
  smallK?: number;
  /**
   * The number of documents to retrieve from the large store.
   * @default 8
   */
  largeK?: number;
  /**
   * The metadata key to store the larger embeddings.
   * @default "lc_large_embedding"
   */
  largeEmbeddingKey?: string;
  /**
   * The embedding model to use when generating the large
   * embeddings.
   */
  largeEmbeddingModel: Embeddings;
  /**
   * The type of search to perform using the large embeddings.
   * @default "cosine"
   */
  searchType?: "cosine" | "innerProduct" | "euclidean";
}
/**
 * A retriever that uses two sets of embeddings to perform adaptive retrieval. Based
 * off of the "Matryoshka embeddings: faster OpenAI vector search using Adaptive Retrieval"
 * blog post {@link https://supabase.com/blog/matryoshka-embeddings}.
 *
 *
 * This class performs "Adaptive Retrieval" for searching text embeddings efficiently using the
 * Matryoshka Representation Learning (MRL) technique. It retrieves documents similar to a query
 * embedding in two steps:
 *
 * First-pass: Uses a lower dimensional sub-vector from the MRL embedding for an initial, fast,
 * but less accurate search.
 *
 * Second-pass: Re-ranks the top results from the first pass using the full, high-dimensional
 * embedding for higher accuracy.
 *
 *
 * This code implements MRL embeddings for efficient vector search by combining faster,
 * lower-dimensional initial search with accurate, high-dimensional re-ranking.
 */
declare class MatryoshkaRetriever<Store extends VectorStore = VectorStore> extends VectorStoreRetriever<Store> {
  smallK: number;
  largeK: number;
  largeEmbeddingKey: string;
  largeEmbeddingModel: Embeddings;
  searchType: "cosine" | "innerProduct" | "euclidean";
  constructor(fields: MatryoshkaRetrieverFields & VectorStoreRetrieverInput<Store>);
  /**
   * Ranks documents based on their similarity to a query embedding using larger embeddings.
   *
   * This method takes a query embedding and a list of documents (smallResults) as input. Each document
   * in the smallResults array has previously been associated with a large embedding stored in its metadata.
   * Depending on the `searchType` (cosine, innerProduct, or euclidean), it calculates the similarity scores
   * between the query embedding and each document's large embedding. It then ranks the documents based on
   * these similarity scores, from the most similar to the least similar.
   *
   * The method returns a promise that resolves to an array of the top `largeK` documents, where `largeK`
   * is a class property defining the number of documents to return. This subset of documents is determined
   * by sorting the entire list of documents based on their similarity scores and then selecting the top
   * `largeK` documents.
   *
   * @param {number[]} embeddedQuery The embedding of the query, represented as an array of numbers.
   * @param {DocumentInterface[]} smallResults An array of documents, each with metadata that includes a large embedding for similarity comparison.
   * @returns {Promise<DocumentInterface[]>} A promise that resolves to an array of the top `largeK` ranked documents based on their similarity to the query embedding.
   */
  private _rankByLargeEmbeddings;
  _getRelevantDocuments(query: string): Promise<DocumentInterface[]>;
  /**
   * Override the default `addDocuments` method to embed the documents twice,
   * once using the larger embeddings model, and then again using the default
   * embedding model linked to the vector store.
   *
   * @param {DocumentInterface[]} documents - An array of documents to add to the vector store.
   * @param {AddDocumentOptions} options - An optional object containing additional options for adding documents.
   * @returns {Promise<string[] | void>} A promise that resolves to an array of the document IDs that were added to the vector store.
   */
  addDocuments: (documents: DocumentInterface<Record<string, any>>[], options?: AddDocumentOptions | undefined) => Promise<void | string[]>;
}
//#endregion
export { MatryoshkaRetriever, MatryoshkaRetrieverFields };
//# sourceMappingURL=matryoshka_retriever.d.cts.map