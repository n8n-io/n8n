import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import * as pdf_parse_lib_pdf_js_v1_10_100_build_pdf_js0 from "pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js";

//#region src/document_loaders/web/pdf.d.ts

/**
 * A document loader for loading data from PDFs.
 * @example
 * ```typescript
 * const loader = new WebPDFLoader(new Blob());
 * const docs = await loader.load();
 * console.log({ docs });
 * ```
 */
declare class WebPDFLoader extends BaseDocumentLoader {
  protected blob: Blob;
  protected splitPages: boolean;
  private pdfjs;
  protected parsedItemSeparator: string;
  constructor(blob: Blob, {
    splitPages,
    pdfjs,
    parsedItemSeparator
  }?: {
    parsedItemSeparator?: string | undefined;
    pdfjs?: typeof PDFLoaderImports | undefined;
    splitPages?: boolean | undefined;
  });
  /**
   * Loads the contents of the PDF as documents.
   * @returns An array of Documents representing the retrieved data.
   */
  load(): Promise<Document[]>;
}
declare function PDFLoaderImports(): Promise<{
  getDocument: typeof pdf_parse_lib_pdf_js_v1_10_100_build_pdf_js0.getDocument;
  version: string;
}>;
//#endregion
export { WebPDFLoader };
//# sourceMappingURL=pdf.d.cts.map