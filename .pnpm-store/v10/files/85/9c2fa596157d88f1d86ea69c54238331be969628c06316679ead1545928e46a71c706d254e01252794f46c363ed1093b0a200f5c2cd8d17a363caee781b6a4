import { BaseDocumentCompressor } from "./index.cjs";
import { DocumentInterface } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { cosineSimilarity } from "@langchain/core/utils/math";

//#region src/retrievers/document_compressors/embeddings_filter.d.ts

/**
 * Interface for the parameters of the `EmbeddingsFilter` class.
 */
interface EmbeddingsFilterParams {
  embeddings: EmbeddingsInterface;
  similarityFn?: (x: number[][], y: number[][]) => number[][];
  similarityThreshold?: number;
  k?: number;
}
/**
 * Class that represents a document compressor that uses embeddings to
 * drop documents unrelated to the query.
 * @example
 * ```typescript
 * const embeddingsFilter = new EmbeddingsFilter({
 *   embeddings: new OpenAIEmbeddings(),
 *   similarityThreshold: 0.8,
 *   k: 5,
 * });
 * const retrievedDocs = await embeddingsFilter.filterDocuments(
 *   getDocuments(),
 *   "What did the speaker say about Justice Breyer in the 2022 State of the Union?",
 * );
 * console.log({ retrievedDocs });
 * ```
 */
declare class EmbeddingsFilter extends BaseDocumentCompressor {
  /**
   * Embeddings to use for embedding document contents and queries.
   */
  embeddings: EmbeddingsInterface;
  /**
   * Similarity function for comparing documents.
   */
  similarityFn: typeof cosineSimilarity;
  /**
   * Threshold for determining when two documents are similar enough
   * to be considered redundant. Must be specified if `k` is not set.
   */
  similarityThreshold?: number;
  /**
   * The number of relevant documents to return. Can be explicitly set to undefined, in which case
   * similarity_threshold` must be specified. Defaults to 20
   */
  k?: number | undefined;
  constructor(params: EmbeddingsFilterParams);
  compressDocuments(documents: DocumentInterface[], query: string): Promise<DocumentInterface[]>;
}
//#endregion
export { EmbeddingsFilter, EmbeddingsFilterParams };
//# sourceMappingURL=embeddings_filter.d.cts.map