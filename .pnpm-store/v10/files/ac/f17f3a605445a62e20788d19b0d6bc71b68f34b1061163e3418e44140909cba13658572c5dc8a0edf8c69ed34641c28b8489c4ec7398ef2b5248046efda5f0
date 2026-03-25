import { CohereClientOptions } from "./client.js";
import { CohereClient } from "cohere-ai";
import { BaseDocumentCompressor } from "@langchain/core/retrievers/document_compressors";
import { DocumentInterface } from "@langchain/core/documents";

//#region src/rerank.d.ts
interface BaseCohereRerankArgs {
  /**
   * The name of the model to use.
   * @default {"rerank-english-v2.0"}
   */
  model?: string;
  /**
   * How many documents to return.
   * @default {3}
   */
  topN?: number;
  /**
   * The maximum number of chunks per document.
   */
  maxChunksPerDoc?: number;
}
type CohereRerankArgs = BaseCohereRerankArgs & CohereClientOptions;
/**
 * Document compressor that uses `Cohere Rerank API`.
 */
declare class CohereRerank extends BaseDocumentCompressor {
  model: string | undefined;
  topN: number;
  client: CohereClient;
  maxChunksPerDoc: number | undefined;
  constructor(fields?: CohereRerankArgs);
  /**
   * Compress documents using Cohere's rerank API.
   *
   * @param {Array<DocumentInterface>} documents A sequence of documents to compress.
   * @param {string} query The query to use for compressing the documents.
   *
   * @returns {Promise<Array<DocumentInterface>>} A sequence of compressed documents.
   */
  compressDocuments(documents: Array<DocumentInterface>, query: string): Promise<Array<DocumentInterface>>;
  /**
   * Returns an ordered list of documents ordered by their relevance to the provided query.
   *
   * @param {Array<DocumentInterface | string | Record<string, string>>} documents A list of documents as strings, DocumentInterfaces or objects with a `pageContent` key.
   * @param {string} query The query to use for reranking the documents.
   * @param options
   * @param {string} options.model The name of the model to use.
   * @param {number} options.topN How many documents to return.
   * @param {number} options.maxChunksPerDoc The maximum number of chunks per document.
   *
   * @returns {Promise<Array<{ index: number; relevanceScore: number }>>} An ordered list of documents with relevance scores.
   */
  rerank(documents: Array<DocumentInterface | string | Record<string, string>>, query: string, options?: {
    model?: string;
    topN?: number;
    maxChunksPerDoc?: number;
  }): Promise<Array<{
    index: number;
    relevanceScore: number;
  }>>;
}
//#endregion
export { BaseCohereRerankArgs, CohereRerank };
//# sourceMappingURL=rerank.d.ts.map