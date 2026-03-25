import { Document } from "@langchain/core/documents";
import { BufferLoader } from "@langchain/classic/document_loaders/fs/buffer";

//#region src/document_loaders/fs/pptx.d.ts

/**
 * A class that extends the `BufferLoader` class. It represents a document
 * loader that loads documents from PDF files.
 */
declare class PPTXLoader extends BufferLoader {
  constructor(filePathOrBlob: string | Blob);
  /**
   * A method that takes a `raw` buffer and `metadata` as parameters and
   * returns a promise that resolves to an array of `Document` instances. It
   * uses the `parseOfficeAsync` function from the `officeparser` module to extract
   * the raw text content from the buffer. If the extracted powerpoint content is
   * empty, it returns an empty array. Otherwise, it creates a new
   * `Document` instance with the extracted powerpoint content and the provided
   * metadata, and returns it as an array.
   * @param raw The buffer to be parsed.
   * @param metadata The metadata of the document.
   * @returns A promise that resolves to an array of `Document` instances.
   */
  parse(raw: Buffer, metadata: Document["metadata"]): Promise<Document[]>;
}
//#endregion
export { PPTXLoader };
//# sourceMappingURL=pptx.d.ts.map