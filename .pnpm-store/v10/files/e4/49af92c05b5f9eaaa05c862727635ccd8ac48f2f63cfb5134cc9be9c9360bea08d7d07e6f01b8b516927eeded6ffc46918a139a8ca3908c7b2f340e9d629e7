import { BaseFileStore } from "./base.js";

//#region src/stores/file/node.d.ts

/**
 * Specific implementation of the `BaseFileStore` class for Node.js.
 * Provides methods to read and write files in a specific base path.
 */
declare class NodeFileStore extends BaseFileStore {
  basePath: string;
  lc_namespace: string[];
  constructor(basePath?: string);
  /**
   * Reads the contents of a file at the given path.
   * @param path Path of the file to read.
   * @returns The contents of the file as a string.
   */
  readFile(path: string): Promise<string>;
  /**
   * Writes the given contents to a file at the specified path.
   * @param path Path of the file to write to.
   * @param contents Contents to write to the file.
   * @returns Promise that resolves when the file has been written.
   */
  writeFile(path: string, contents: string): Promise<void>;
}
//#endregion
export { NodeFileStore };
//# sourceMappingURL=node.d.ts.map