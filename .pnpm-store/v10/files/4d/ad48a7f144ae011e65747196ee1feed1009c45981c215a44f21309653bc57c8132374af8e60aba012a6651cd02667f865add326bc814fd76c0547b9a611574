import { Callbacks } from "@langchain/core/callbacks/manager";
import { BaseDocumentTransformer, DocumentInterface } from "@langchain/core/documents";

//#region src/retrievers/document_compressors/index.d.ts

/**
 * Base Document Compression class. All compressors should extend this class.
 */
declare abstract class BaseDocumentCompressor {
  /**
   * Abstract method that must be implemented by any class that extends
   * `BaseDocumentCompressor`. This method takes an array of `Document`
   * objects and a query string as parameters and returns a Promise that
   * resolves with an array of compressed `Document` objects.
   * @param documents An array of `Document` objects to be compressed.
   * @param query A query string.
   * @returns A Promise that resolves with an array of compressed `Document` objects.
   */
  abstract compressDocuments(documents: DocumentInterface[], query: string, callbacks?: Callbacks): Promise<DocumentInterface[]>;
  static isBaseDocumentCompressor(x: any): x is BaseDocumentCompressor;
}
/**
 * Document compressor that uses a pipeline of Transformers.
 * @example
 * ```typescript
 * const compressorPipeline = new DocumentCompressorPipeline({
 *   transformers: [
 *     new RecursiveCharacterTextSplitter({
 *       chunkSize: 200,
 *       chunkOverlap: 0,
 *     }),
 *     new EmbeddingsFilter({
 *       embeddings: new OpenAIEmbeddings(),
 *       similarityThreshold: 0.8,
 *       k: 5,
 *     }),
 *   ],
 * });
 * const retriever = new ContextualCompressionRetriever({
 *   baseCompressor: compressorPipeline,
 *   baseRetriever: new TavilySearchAPIRetriever({
 *     includeRawContent: true,
 *   }),
 * });
 * const retrievedDocs = await retriever.invoke(
 *   "What did the speaker say about Justice Breyer in the 2022 State of the Union?",
 * );
 * console.log({ retrievedDocs });
 * ```
 */
declare class DocumentCompressorPipeline extends BaseDocumentCompressor {
  transformers: (BaseDocumentTransformer | BaseDocumentCompressor)[];
  constructor(fields: {
    transformers: (BaseDocumentTransformer | BaseDocumentCompressor)[];
  });
  compressDocuments(documents: DocumentInterface[], query: string, callbacks?: Callbacks): Promise<DocumentInterface[]>;
}
//#endregion
export { BaseDocumentCompressor, DocumentCompressorPipeline };
//# sourceMappingURL=index.d.cts.map