import { VectorStoreInterface } from "@langchain/core/vectorstores";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import { BaseStore, BaseStoreInterface } from "@langchain/core/stores";

//#region src/retrievers/multi_vector.d.ts

/**
 * Arguments for the MultiVectorRetriever class.
 */
interface MultiVectorRetrieverInput extends BaseRetrieverInput {
  vectorstore: VectorStoreInterface;
  /** @deprecated Prefer `byteStore`. */
  docstore?: BaseStoreInterface<string, Document>;
  byteStore?: BaseStore<string, Uint8Array>;
  idKey?: string;
  childK?: number;
  parentK?: number;
}
/**
 * A retriever that retrieves documents from a vector store and a document
 * store. It uses the vector store to find relevant documents based on a
 * query, and then retrieves the full documents from the document store.
 * @example
 * ```typescript
 * const retriever = new MultiVectorRetriever({
 *   vectorstore: new FaissStore(),
 *   byteStore: new InMemoryStore<Unit8Array>(),
 *   idKey: "doc_id",
 *   childK: 20,
 *   parentK: 5,
 * });
 *
 * const retrieverResult = await retriever.invoke("justice breyer");
 * console.log(retrieverResult[0].pageContent.length);
 * ```
 */
declare class MultiVectorRetriever extends BaseRetriever {
  static lc_name(): string;
  lc_namespace: string[];
  vectorstore: VectorStoreInterface;
  docstore: BaseStoreInterface<string, Document>;
  protected idKey: string;
  protected childK?: number;
  protected parentK?: number;
  constructor(args: MultiVectorRetrieverInput);
  _getRelevantDocuments(query: string): Promise<Document[]>;
}
//#endregion
export { MultiVectorRetriever, MultiVectorRetrieverInput };
//# sourceMappingURL=multi_vector.d.cts.map