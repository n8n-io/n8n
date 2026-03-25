import { Document } from "@langchain/core/documents";
import { BufferLoader } from "@langchain/classic/document_loaders/fs/buffer";

//#region src/document_loaders/fs/docx.d.ts
type DocxLoaderOptions = {
  type: "docx" | "doc";
};
/**
 * A class that extends the `BufferLoader` class. It represents a document
 * loader that loads documents from DOCX files.
 * It has a constructor that takes a `filePathOrBlob` parameter representing the path to the word
 * file or a Blob object, and an optional `options` parameter of type
 * `DocxLoaderOptions`
 */
declare class DocxLoader extends BufferLoader {
  protected options: DocxLoaderOptions;
  constructor(filePathOrBlob: string | Blob, options?: DocxLoaderOptions);
  /**
   * A method that takes a `raw` buffer and `metadata` as parameters and
   * returns a promise that resolves to an array of `Document` instances. It
   * uses the `extractRawText` function from the `mammoth` module or
   * `extract` method from the `word-extractor` module to extract
   * the raw text content from the buffer. If the extracted text content is
   * empty, it returns an empty array. Otherwise, it creates a new
   * `Document` instance with the extracted text content and the provided
   * metadata, and returns it as an array.
   * @param raw The raw buffer from which to extract text content.
   * @param metadata The metadata to be associated with the created `Document` instance.
   * @returns A promise that resolves to an array of `Document` instances.
   */
  parse(raw: Buffer, metadata: Document["metadata"]): Promise<Document[]>;
  private parseDocx;
  private parseDoc;
}
//#endregion
export { DocxLoader };
//# sourceMappingURL=docx.d.cts.map