import { Document } from "@langchain/core/documents";
import { BufferLoader } from "@langchain/classic/document_loaders/fs/buffer";
import * as pdf_parse_lib_pdf_js_v1_10_100_build_pdf_js0 from "pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js";

//#region src/document_loaders/fs/pdf.d.ts

/**
 * A class that extends the `BufferLoader` class. It represents a document
 * loader that loads documents from PDF files.
 * @example
 * ```typescript
 * const loader = new PDFLoader("path/to/bitcoin.pdf");
 * const docs = await loader.load();
 * console.log({ docs });
 * ```
 */
declare class PDFLoader extends BufferLoader {
  private splitPages;
  private pdfjs;
  protected parsedItemSeparator: string;
  constructor(filePathOrBlob: string | Blob, {
    splitPages,
    pdfjs,
    parsedItemSeparator
  }?: {
    parsedItemSeparator?: string | undefined;
    pdfjs?: typeof PDFLoaderImports | undefined;
    splitPages?: boolean | undefined;
  });
  /**
   * A method that takes a `raw` buffer and `metadata` as parameters and
   * returns a promise that resolves to an array of `Document` instances. It
   * uses the `getDocument` function from the PDF.js library to load the PDF
   * from the buffer. It then iterates over each page of the PDF, retrieves
   * the text content using the `getTextContent` method, and joins the text
   * items to form the page content. It creates a new `Document` instance
   * for each page with the extracted text content and metadata, and adds it
   * to the `documents` array. If `splitPages` is `true`, it returns the
   * array of `Document` instances. Otherwise, if there are no documents, it
   * returns an empty array. Otherwise, it concatenates the page content of
   * all documents and creates a single `Document` instance with the
   * concatenated content.
   * @param raw The buffer to be parsed.
   * @param metadata The metadata of the document.
   * @returns A promise that resolves to an array of `Document` instances.
   */
  parse(raw: Buffer, metadata: Document["metadata"]): Promise<Document[]>;
}
declare function PDFLoaderImports(): Promise<{
  getDocument: typeof pdf_parse_lib_pdf_js_v1_10_100_build_pdf_js0.getDocument;
  version: string;
}>;
//#endregion
export { PDFLoader };
//# sourceMappingURL=pdf.d.cts.map