import { Document } from "@langchain/core/documents";
import { extname, resolve } from "node:path";
import { readdir } from "node:fs/promises";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/fs/directory.d.ts
declare const UnknownHandling: {
  readonly Ignore: "ignore";
  readonly Warn: "warn";
  readonly Error: "error";
};
/**
 * An enumeration of possible handling strategies for unknown file types.
 */
type UnknownHandling = (typeof UnknownHandling)[keyof typeof UnknownHandling];
/**
 * A mapping of file extensions to loader functions. Each loader function
 * takes a file path as a parameter and returns a `BaseDocumentLoader`
 * instance.
 */
interface LoadersMapping {
  [extension: string]: (filePath: string) => BaseDocumentLoader;
}
/**
 * A document loader that loads documents from a directory. It extends the
 * `BaseDocumentLoader` class and implements the `load()` method.
 * @example
 * ```typescript
 *
 * const directoryLoader = new DirectoryLoader(
 *   "src/document_loaders/example_data/",
 *   {
 *     ".pdf": (path: string) => new PDFLoader(path),
 *   },
 * );
 *
 * const docs = await directoryLoader.load();
 * console.log({ docs });
 *
 * ```
 */
declare class DirectoryLoader extends BaseDocumentLoader {
  directoryPath: string;
  loaders: LoadersMapping;
  recursive: boolean;
  unknown: UnknownHandling;
  constructor(directoryPath: string, loaders: LoadersMapping, recursive?: boolean, unknown?: UnknownHandling);
  /**
   * Loads the documents from the directory. If a file is a directory and
   * `recursive` is `true`, it recursively loads documents from the
   * subdirectory. If a file is a file, it checks if there is a
   * corresponding loader function for the file extension in the `loaders`
   * mapping. If there is, it loads the documents. If there is no
   * corresponding loader function and `unknown` is set to `Warn`, it logs a
   * warning message. If `unknown` is set to `Error`, it throws an error.
   * @returns A promise that resolves to an array of loaded documents.
   */
  load(): Promise<Document[]>;
  /**
   * Imports the necessary functions from the `node:path` and
   * `node:fs/promises` modules. It is used to dynamically import the
   * functions when needed. If the import fails, it throws an error
   * indicating that the modules failed to load.
   * @returns A promise that resolves to an object containing the imported functions.
   */
  static imports(): Promise<{
    readdir: typeof readdir;
    extname: typeof extname;
    resolve: typeof resolve;
  }>;
}
//#endregion
export { DirectoryLoader, LoadersMapping, UnknownHandling };
//# sourceMappingURL=directory.d.ts.map