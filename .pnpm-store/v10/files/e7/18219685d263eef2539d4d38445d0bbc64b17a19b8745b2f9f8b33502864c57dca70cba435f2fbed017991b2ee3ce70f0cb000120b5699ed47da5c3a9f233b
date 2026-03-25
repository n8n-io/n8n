import { BaseDocumentCompressor } from "./document_compressors/index.cjs";
import { MultiVectorRetriever, MultiVectorRetrieverInput } from "./multi_vector.cjs";
import { VectorStoreInterface, VectorStoreRetrieverInterface } from "@langchain/core/vectorstores";
import { Document } from "@langchain/core/documents";
import { TextSplitter, TextSplitterChunkHeaderOptions } from "@langchain/textsplitters";

//#region src/retrievers/parent_document.d.ts
type SubDocs = Document<Record<string, any>>[];
/**
 * Interface for the fields required to initialize a
 * ParentDocumentRetriever instance.
 */
type ParentDocumentRetrieverFields = MultiVectorRetrieverInput & {
  childSplitter: TextSplitter;
  parentSplitter?: TextSplitter;
  /**
   * A custom retriever to use when retrieving instead of
   * the `.similaritySearch` method of the vectorstore.
   */
  childDocumentRetriever?: VectorStoreRetrieverInterface<VectorStoreInterface>;
  documentCompressor?: BaseDocumentCompressor | undefined;
  documentCompressorFilteringFn?: (docs: SubDocs) => SubDocs;
};
/**
 * A type of document retriever that splits input documents into smaller chunks
 * while separately storing and preserving the original documents.
 * The small chunks are embedded, then on retrieval, the original
 * "parent" documents are retrieved.
 *
 * This strikes a balance between better targeted retrieval with small documents
 * and the more context-rich larger documents.
 * @example
 * ```typescript
 * const retriever = new ParentDocumentRetriever({
 *   vectorstore: new MemoryVectorStore(new OpenAIEmbeddings()),
 *   byteStore: new InMemoryStore<Uint8Array>(),
 *   parentSplitter: new RecursiveCharacterTextSplitter({
 *     chunkOverlap: 0,
 *     chunkSize: 500,
 *   }),
 *   childSplitter: new RecursiveCharacterTextSplitter({
 *     chunkOverlap: 0,
 *     chunkSize: 50,
 *   }),
 *   childK: 20,
 *   parentK: 5,
 * });
 *
 * const parentDocuments = await getDocuments();
 * await retriever.addDocuments(parentDocuments);
 * const retrievedDocs = await retriever.invoke("justice breyer");
 * ```
 */
declare class ParentDocumentRetriever extends MultiVectorRetriever {
  static lc_name(): string;
  lc_namespace: string[];
  vectorstore: VectorStoreInterface;
  protected childSplitter: TextSplitter;
  protected parentSplitter?: TextSplitter;
  protected idKey: string;
  protected childK?: number;
  protected parentK?: number;
  childDocumentRetriever: VectorStoreRetrieverInterface<VectorStoreInterface> | undefined;
  documentCompressor: BaseDocumentCompressor | undefined;
  documentCompressorFilteringFn?: ParentDocumentRetrieverFields["documentCompressorFilteringFn"];
  constructor(fields: ParentDocumentRetrieverFields);
  _getRelevantDocuments(query: string): Promise<Document[]>;
  _storeDocuments(parentDoc: Record<string, Document>, childDocs: Document[], addToDocstore: boolean): Promise<void>;
  /**
   * Adds documents to the docstore and vectorstores.
   * If a retriever is provided, it will be used to add documents instead of the vectorstore.
   * @param docs The documents to add
   * @param config.ids Optional list of ids for documents. If provided should be the same
   *   length as the list of documents. Can provided if parent documents
   *   are already in the document store and you don't want to re-add
   *   to the docstore. If not provided, random UUIDs will be used as ids.
   * @param config.addToDocstore Boolean of whether to add documents to docstore.
   * This can be false if and only if `ids` are provided. You may want
   *   to set this to False if the documents are already in the docstore
   *   and you don't want to re-add them.
   * @param config.chunkHeaderOptions Object with options for adding Contextual chunk headers
   */
  addDocuments(docs: Document[], config?: {
    ids?: string[];
    addToDocstore?: boolean;
    childDocChunkHeaderOptions?: TextSplitterChunkHeaderOptions;
  }): Promise<void>;
}
//#endregion
export { ParentDocumentRetriever, ParentDocumentRetrieverFields, SubDocs };
//# sourceMappingURL=parent_document.d.cts.map