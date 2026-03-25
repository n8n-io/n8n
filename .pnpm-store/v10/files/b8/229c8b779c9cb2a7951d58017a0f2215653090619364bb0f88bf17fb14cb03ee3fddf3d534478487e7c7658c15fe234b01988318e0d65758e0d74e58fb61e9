import { DocumentInterface } from "./document.js";
import { BaseCallbackConfig } from "../callbacks/manager.js";
import { Runnable } from "../runnables/base.js";

//#region src/documents/transformers.d.ts
/**
 * Abstract base class for document transformation systems.
 *
 * A document transformation system takes an array of Documents and returns an
 * array of transformed Documents. These arrays do not necessarily have to have
 * the same length.
 *
 * One example of this is a text splitter that splits a large document into
 * many smaller documents.
 */
declare abstract class BaseDocumentTransformer<RunInput extends DocumentInterface[] = DocumentInterface[], RunOutput extends DocumentInterface[] = DocumentInterface[]> extends Runnable<RunInput, RunOutput> {
  lc_namespace: string[];
  /**
   * Transform a list of documents.
   * @param documents A sequence of documents to be transformed.
   * @returns A list of transformed documents.
   */
  abstract transformDocuments(documents: RunInput): Promise<RunOutput>;
  /**
   * Method to invoke the document transformation. This method calls the
   * transformDocuments method with the provided input.
   * @param input The input documents to be transformed.
   * @param _options Optional configuration object to customize the behavior of callbacks.
   * @returns A Promise that resolves to the transformed documents.
   */
  invoke(input: RunInput, _options?: BaseCallbackConfig): Promise<RunOutput>;
}
/**
 * Class for document transformers that return exactly one transformed document
 * for each input document.
 */
declare abstract class MappingDocumentTransformer extends BaseDocumentTransformer {
  transformDocuments(documents: DocumentInterface[]): Promise<DocumentInterface[]>;
  abstract _transformDocument(document: DocumentInterface): Promise<DocumentInterface>;
}
//#endregion
export { BaseDocumentTransformer, MappingDocumentTransformer };
//# sourceMappingURL=transformers.d.ts.map