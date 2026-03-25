import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { readFile } from "node:fs/promises";

//#region src/document_loaders/fs/buffer.d.ts

/**
 * Abstract class that extends the `BaseDocumentLoader` class. It
 * represents a document loader that loads documents from a buffer. The
 * `load()` method is implemented to read the buffer contents and metadata
 * based on the type of `filePathOrBlob`, and then calls the `parse()`
 * method to parse the buffer and return the documents.
 */
declare abstract class BufferLoader extends BaseDocumentLoader {
  filePathOrBlob: string | Blob;
  constructor(filePathOrBlob: string | Blob);
  /**
   * Abstract method that needs to be implemented by subclasses. It is used
   * to parse the buffer and return the documents.
   * @param raw The buffer to be parsed.
   * @param metadata Metadata of the document.
   * @returns Promise that resolves with an array of `Document` objects.
   */
  protected abstract parse(raw: Buffer, metadata: Document["metadata"]): Promise<Document[]>;
  /**
   * Method that reads the buffer contents and metadata based on the type of
   * `filePathOrBlob`, and then calls the `parse()` method to parse the
   * buffer and return the documents.
   * @returns Promise that resolves with an array of `Document` objects.
   */
  load(): Promise<Document[]>;
  /**
   * Static method that imports the `readFile` function from the
   * `fs/promises` module in Node.js. It is used to dynamically import the
   * function when needed. If the import fails, it throws an error
   * indicating that the `fs/promises` module is not available in the
   * current environment.
   * @returns Promise that resolves with an object containing the `readFile` function.
   */
  static imports(): Promise<{
    readFile: typeof readFile;
  }>;
}
//#endregion
export { BufferLoader };
//# sourceMappingURL=buffer.d.cts.map