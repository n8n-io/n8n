import { LoadersMapping, UnknownHandling } from "./directory.js";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/fs/multi_file.d.ts

/**
 * A document loader that loads documents from multiple files. It extends the
 * `BaseDocumentLoader` class and implements the `load()` method.
 * @example
 * ```typescript
 *
 * const multiFileLoader = new MultiFileLoader(
 *   ["path/to/file1.pdf", "path/to/file2.txt"],
 *   {
 *     ".pdf": (path: string) => new PDFLoader(path),
 *   },
 * );
 *
 * const docs = await multiFileLoader.load();
 * console.log({ docs });
 *
 * ```
 */
declare class MultiFileLoader extends BaseDocumentLoader {
  filePaths: string[];
  loaders: LoadersMapping;
  unknown: UnknownHandling;
  constructor(filePaths: string[], loaders: LoadersMapping, unknown?: UnknownHandling);
  /**
   * Loads the documents from the provided file paths. It checks if the file
   * is a directory and ignores it. If a file is a file, it checks if there
   * is a corresponding loader function for the file extension in the `loaders`
   * mapping. If there is, it loads the documents. If there is no
   * corresponding loader function and `unknown` is set to `Warn`, it logs a
   * warning message. If `unknown` is set to `Error`, it throws an error.
   * @returns A promise that resolves to an array of loaded documents.
   */
  load(): Promise<Document[]>;
}
//#endregion
export { MultiFileLoader };
//# sourceMappingURL=multi_file.d.ts.map