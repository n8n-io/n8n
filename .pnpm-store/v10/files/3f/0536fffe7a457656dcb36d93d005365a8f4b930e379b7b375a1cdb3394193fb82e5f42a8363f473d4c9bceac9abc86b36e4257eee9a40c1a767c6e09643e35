import { Docstore } from "./base.cjs";
import { Document } from "@langchain/core/documents";
import { BaseStoreInterface } from "@langchain/core/stores";

//#region src/stores/doc/in_memory.d.ts

/**
 * Class for storing and retrieving documents in memory asynchronously.
 * Extends the Docstore class.
 */
declare class InMemoryDocstore extends Docstore implements BaseStoreInterface<string, Document> {
  _docs: Map<string, Document>;
  constructor(docs?: Map<string, Document>);
  /**
   * Searches for a document in the store based on its ID.
   * @param search The ID of the document to search for.
   * @returns The document with the given ID.
   */
  search(search: string): Promise<Document>;
  /**
   * Adds new documents to the store.
   * @param texts An object where the keys are document IDs and the values are the documents themselves.
   * @returns Void
   */
  add(texts: Record<string, Document>): Promise<void>;
  mget(keys: string[]): Promise<Document[]>;
  mset(keyValuePairs: [string, Document][]): Promise<void>;
  mdelete(_keys: string[]): Promise<void>;
  // eslint-disable-next-line require-yield
  yieldKeys(_prefix?: string): AsyncGenerator<string>;
}
/**
 * Class for storing and retrieving documents in memory synchronously.
 */
declare class SynchronousInMemoryDocstore {
  _docs: Map<string, Document>;
  constructor(docs?: Map<string, Document>);
  /**
   * Searches for a document in the store based on its ID.
   * @param search The ID of the document to search for.
   * @returns The document with the given ID.
   */
  search(search: string): Document;
  /**
   * Adds new documents to the store.
   * @param texts An object where the keys are document IDs and the values are the documents themselves.
   * @returns Void
   */
  add(texts: Record<string, Document>): void;
}
//#endregion
export { InMemoryDocstore, SynchronousInMemoryDocstore };
//# sourceMappingURL=in_memory.d.cts.map