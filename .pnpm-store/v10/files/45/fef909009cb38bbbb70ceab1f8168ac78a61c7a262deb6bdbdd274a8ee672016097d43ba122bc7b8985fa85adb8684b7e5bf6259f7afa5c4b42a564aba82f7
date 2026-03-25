import { HashKeyEncoder } from "../utils/hash.cjs";
import { DocumentInterface } from "../documents/document.cjs";
import { BaseDocumentLoader } from "../document_loaders/base.cjs";
import { VectorStore } from "../vectorstores.cjs";
import { RecordManagerInterface } from "./record_manager.cjs";

//#region src/indexing/base.d.ts
type Metadata = Record<string, unknown>;
type IndexingResult = {
  numAdded: number;
  numDeleted: number;
  numUpdated: number;
  numSkipped: number;
};
type StringOrDocFunc = string | ((doc: DocumentInterface) => string);
interface HashedDocumentInterface extends DocumentInterface {
  uid: string;
  hash_?: string;
  contentHash?: string;
  metadataHash?: string;
  pageContent: string;
  metadata: Metadata;
  calculateHashes(): void;
  toDocument(): DocumentInterface;
}
interface HashedDocumentArgs {
  pageContent: string;
  metadata: Metadata;
  uid: string;
}
/**
 * HashedDocument is a Document with hashes calculated.
 * Hashes are calculated based on page content and metadata.
 * It is used for indexing.
 */
declare class _HashedDocument implements HashedDocumentInterface {
  uid: string;
  hash_?: string;
  contentHash?: string;
  metadataHash?: string;
  pageContent: string;
  metadata: Metadata;
  private keyEncoder;
  constructor(fields: HashedDocumentArgs);
  makeDefaultKeyEncoder(keyEncoderFn: HashKeyEncoder): void;
  calculateHashes(): void;
  toDocument(): DocumentInterface;
  static fromDocument(document: DocumentInterface, uid?: string): _HashedDocument;
  private _hashStringToUUID;
  private _hashNestedDictToUUID;
}
type CleanupMode = "full" | "incremental";
type IndexOptions = {
  /**
   * The number of documents to index in one batch.
   */
  batchSize?: number;
  /**
   * The cleanup mode to use. Can be "full", "incremental" or undefined.
   * - **Incremental**: Cleans up all documents that haven't been updated AND
   *   that are associated with source ids that were seen
   *   during indexing.
   *   Clean up is done continuously during indexing helping
   *   to minimize the probability of users seeing duplicated
   *   content.
   * - **Full**: Delete all documents that haven to been returned by the loader.
   *   Clean up runs after all documents have been indexed.
   *   This means that users may see duplicated content during indexing.
   * - **undefined**: Do not delete any documents.
   */
  cleanup?: CleanupMode;
  /**
   * Optional key that helps identify the original source of the document.
   * Must either be a string representing the key of the source in the metadata
   * or a function that takes a document and returns a string representing the source.
   * **Required when cleanup is incremental**.
   */
  sourceIdKey?: StringOrDocFunc;
  /**
   * Batch size to use when cleaning up documents.
   */
  cleanupBatchSize?: number;
  /**
   * Force update documents even if they are present in the
   * record manager. Useful if you are re-indexing with updated embeddings.
   */
  forceUpdate?: boolean;
};
declare function _batch<T>(size: number, iterable: T[]): T[][];
declare function _deduplicateInOrder(hashedDocuments: HashedDocumentInterface[]): HashedDocumentInterface[];
declare function _getSourceIdAssigner(sourceIdKey: StringOrDocFunc | null): (doc: DocumentInterface) => string | null;
declare const _isBaseDocumentLoader: (arg: any) => arg is BaseDocumentLoader;
interface IndexArgs {
  docsSource: BaseDocumentLoader | DocumentInterface[];
  recordManager: RecordManagerInterface;
  vectorStore: VectorStore;
  options?: IndexOptions;
}
/**
 * Index data from the doc source into the vector store.
 *
 * Indexing functionality uses a manager to keep track of which documents
 * are in the vector store.
 *
 * This allows us to keep track of which documents were updated, and which
 * documents were deleted, which documents should be skipped.
 *
 * For the time being, documents are indexed using their hashes, and users
 *  are not able to specify the uid of the document.
 *
 * @param {IndexArgs} args
 * @param {BaseDocumentLoader | DocumentInterface[]} args.docsSource The source of documents to index. Can be a DocumentLoader or a list of Documents.
 * @param {RecordManagerInterface} args.recordManager The record manager to use for keeping track of indexed documents.
 * @param {VectorStore} args.vectorStore The vector store to use for storing the documents.
 * @param {IndexOptions | undefined} args.options Options for indexing.
 * @returns {Promise<IndexingResult>}
 */
declare function index(args: IndexArgs): Promise<IndexingResult>;
//#endregion
export { CleanupMode, HashedDocumentInterface, IndexOptions, _HashedDocument, _batch, _deduplicateInOrder, _getSourceIdAssigner, _isBaseDocumentLoader, index };
//# sourceMappingURL=base.d.cts.map