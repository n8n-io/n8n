import { Document } from "../documents/document.js";

//#region src/document_loaders/base.d.ts
/**
 * Interface that defines the methods for loading and splitting documents.
 */
interface DocumentLoader {
  load(): Promise<Document[]>;
}
/**
 * Abstract class that provides a default implementation for the
 * loadAndSplit() method from the DocumentLoader interface. The load()
 * method is left abstract and needs to be implemented by subclasses.
 */
declare abstract class BaseDocumentLoader implements DocumentLoader {
  /**
   * Loads the documents.
   * @returns A Promise that resolves with an array of Document instances.
   */
  abstract load(): Promise<Document[]>;
}
//#endregion
export { BaseDocumentLoader, DocumentLoader };
//# sourceMappingURL=base.d.ts.map