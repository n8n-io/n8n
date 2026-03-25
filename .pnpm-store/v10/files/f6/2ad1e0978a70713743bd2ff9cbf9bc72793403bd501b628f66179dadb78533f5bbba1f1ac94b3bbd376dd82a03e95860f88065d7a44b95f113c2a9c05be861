import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { EPub } from "epub2";

//#region src/document_loaders/fs/epub.d.ts

/**
 * A class that extends the `BaseDocumentLoader` class. It represents a
 * document loader that loads documents from EPUB files.
 */
declare class EPubLoader extends BaseDocumentLoader {
  filePath: string;
  private splitChapters;
  constructor(filePath: string, {
    splitChapters
  }?: {
    splitChapters?: boolean | undefined;
  });
  /**
   * A protected method that takes an EPUB object as a parameter and returns
   * a promise that resolves to an array of objects representing the content
   * and metadata of each chapter.
   * @param epub The EPUB object to parse.
   * @returns A promise that resolves to an array of objects representing the content and metadata of each chapter.
   */
  protected parse(epub: EPub): Promise<{
    pageContent: string;
    metadata?: object;
  }[]>;
  /**
   * A method that loads the EPUB file and returns a promise that resolves
   * to an array of `Document` instances.
   * @returns A promise that resolves to an array of `Document` instances.
   */
  load(): Promise<Document[]>;
}
//#endregion
export { EPubLoader };
//# sourceMappingURL=epub.d.ts.map