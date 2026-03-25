import { DocumentInterface } from "../../documents/document.cjs";
import { Callbacks } from "../../callbacks/manager.cjs";

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
//#endregion
export { BaseDocumentCompressor };
//# sourceMappingURL=index.d.cts.map