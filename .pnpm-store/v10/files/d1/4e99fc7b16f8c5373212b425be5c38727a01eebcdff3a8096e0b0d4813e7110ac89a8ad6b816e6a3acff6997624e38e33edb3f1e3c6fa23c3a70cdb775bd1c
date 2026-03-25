import { BaseHybridOptions, CollectionConfigCreate, FilterValue, GenerateOptions, GenerativeConfigRuntime, HybridOptions, Metadata, Vectors, WeaviateClient } from "weaviate-client";
import { MaxMarginalRelevanceSearchOptions, VectorStore } from "@langchain/core/vectorstores";
import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";

//#region src/vectorstores.d.ts
// Note this function is not generic, it is designed specifically for Weaviate
// https://weaviate.io/developers/weaviate/config-refs/datatypes#introduction
declare const flattenObjectForWeaviate: (obj: Record<string, unknown>) => Record<string, unknown>;
/**
 * Interface that defines the arguments required to create a new instance
 * of the `WeaviateStore` class. It includes the Weaviate client, the name
 * of the class in Weaviate, and optional keys for text and metadata.
 */
interface WeaviateLibArgs {
  client: WeaviateClient;
  /**
   * The name of the class in Weaviate. Must start with a capital letter.
   */
  indexName?: string;
  textKey?: string;
  metadataKeys?: string[];
  tenant?: string;
  schema?: CollectionConfigCreate;
}
declare class WeaviateDocument extends Document {
  generated?: string;
  additional: Partial<Metadata>;
  vectors: Vectors;
}
/**
 * Class that extends the `VectorStore` base class. It provides methods to
 * interact with a Weaviate index, including adding vectors and documents,
 * deleting data, and performing similarity searches.
 */
declare class WeaviateStore extends VectorStore {
  embeddings: EmbeddingsInterface;
  FilterType: FilterValue;
  private client;
  private indexName;
  private textKey;
  private queryAttrs;
  private tenant?;
  private schema?;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: WeaviateLibArgs);
  static initialize(embeddings: EmbeddingsInterface, config: WeaviateLibArgs & {
    dimensions?: number;
  }): Promise<WeaviateStore>;
  /**
   * Method to add vectors and corresponding documents to the Weaviate
   * index.
   * @param vectors Array of vectors to be added.
   * @param documents Array of documents corresponding to the vectors.
   * @param options Optional parameter that can include specific IDs for the documents.
   * @returns An array of document IDs.
   */
  addVectors(vectors: number[][], documents: Document[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  /**
   * Method to add documents to the Weaviate index. It first generates
   * vectors for the documents using the embeddings, then adds the vectors
   * and documents to the index.
   * @param documents Array of documents to be added.
   * @param options Optional parameter that can include specific IDs for the documents.
   * @returns An array of document IDs.
   */
  addDocuments(documents: Document[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  /**
   * Method to delete data from the Weaviate index. It can delete data based
   * on specific IDs or a filter.
   * @param params Object that includes either an array of IDs or a filter for the data to be deleted.
   * @returns Promise that resolves when the deletion is complete.
   */
  delete(params: {
    ids?: string[];
    filter?: FilterValue;
  }): Promise<void>;
  /**
   * Hybrid search combines the results of a vector search and a
   * keyword (BM25F) search by fusing the two result sets.
   * @param query The query to search for.
   * @param options available options for the search. Check docs for complete list
   * @returns Promise that resolves the result of the search within the fetched collection.
   */
  hybridSearch(query: string, options?: HybridOptions<undefined>): Promise<Document[]>;
  /**
   * Weaviate's Retrieval Augmented Generation (RAG) combines information retrieval
   * with generative AI models. It first performs the search, then passes both
   * the search results and your prompt to a generative AI model before returning the generated response.
   * @param query The query to search for.
   * @param generate available options for the generation. Check docs for complete list
   * @param options available options for performing the hybrid search
   * @returns Promise that resolves the result of the search including the generated data.
   */
  generate(query: string, generate: GenerateOptions<undefined, GenerativeConfigRuntime | undefined>, options?: BaseHybridOptions<undefined>): Promise<WeaviateDocument[]>;
  /**
   * Method to perform a similarity search on the stored vectors in the
   * Weaviate index. It returns the top k most similar documents and their
   * similarity scores.
   * @param query The query vector.
   * @param k The number of most similar documents to return.
   * @param filter Optional filter to apply to the search.
   * @returns An array of tuples, where each tuple contains a document and its similarity score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: FilterValue): Promise<[Document, number][]>;
  /**
   * Method to perform a similarity search on the stored vectors in the
   * Weaviate index. It returns the top k most similar documents, their
   * similarity scores and embedding vectors.
   * @param query The query vector.
   * @param k The number of most similar documents to return.
   * @param filter Optional filter to apply to the search.
   * @returns An array of tuples, where each tuple contains a document, its similarity score and its embedding vector.
   */
  similaritySearchVectorWithScoreAndEmbedding(query: number[], k: number, filter?: FilterValue): Promise<[Document, number, number, number[]][]>;
  /**
   * Return documents selected using the maximal marginal relevance.
   * Maximal marginal relevance optimizes for similarity to the query AND diversity
   * among selected documents.
   *
   * @param {string} query - Text to look up documents similar to.
   * @param {number} options.k - Number of documents to return.
   * @param {number} options.fetchK - Number of documents to fetch before passing to the MMR algorithm.
   * @param {number} options.lambda - Number between 0 and 1 that determines the degree of diversity among the results,
   *                 where 0 corresponds to maximum diversity and 1 to minimum diversity.
   * @param {this["FilterType"]} options.filter - Optional filter
   * @param _callbacks
   *
   * @returns {Promise<Document[]>} - List of documents selected by maximal marginal relevance.
   */
  maxMarginalRelevanceSearch(query: string, options: MaxMarginalRelevanceSearchOptions<this["FilterType"]>, _callbacks?: undefined): Promise<Document[]>;
  /**
   * Static method to create a new `WeaviateStore` instance from a list of
   * texts. It first creates documents from the texts and metadata, then
   * adds the documents to the Weaviate index.
   * @param texts Array of texts.
   * @param metadatas Metadata for the texts. Can be a single object or an array of objects.
   * @param embeddings Embeddings to be used for the texts.
   * @param args Arguments required to create a new `WeaviateStore` instance.
   * @returns A new `WeaviateStore` instance.
   */
  static fromTexts(texts: string[], metadatas: object | object[], embeddings: EmbeddingsInterface, args: WeaviateLibArgs): Promise<WeaviateStore>;
  /**
   * Static method to create a new `WeaviateStore` instance from a list of
   * documents. It adds the documents to the Weaviate index.
   * @param docs Array of documents.
   * @param embeddings Embeddings to be used for the documents.
   * @param args Arguments required to create a new `WeaviateStore` instance.
   * @returns A new `WeaviateStore` instance.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, args: WeaviateLibArgs): Promise<WeaviateStore>;
  /**
   * Static method to create a new `WeaviateStore` instance from an existing
   * Weaviate index.
   * @param embeddings Embeddings to be used for the Weaviate index.
   * @param args Arguments required to create a new `WeaviateStore` instance.
   * @returns A new `WeaviateStore` instance.
   */
  static fromExistingIndex(embeddings: EmbeddingsInterface, args: WeaviateLibArgs): Promise<WeaviateStore>;
}
//#endregion
export { WeaviateDocument, WeaviateLibArgs, WeaviateStore, flattenObjectForWeaviate };
//# sourceMappingURL=vectorstores.d.ts.map