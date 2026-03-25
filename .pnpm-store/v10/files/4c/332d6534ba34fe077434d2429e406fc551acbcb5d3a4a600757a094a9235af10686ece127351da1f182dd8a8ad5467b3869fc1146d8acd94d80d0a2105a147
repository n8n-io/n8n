import { BaseFileStore } from "./base.cjs";

//#region src/stores/file/in_memory.d.ts

/**
 * Class that provides an in-memory file storage system. It extends the
 * BaseFileStore class and implements its readFile and writeFile methods.
 * This class is typically used in scenarios where temporary, in-memory
 * file storage is needed, such as during testing or for caching files in
 * memory for quick access.
 */
declare class InMemoryFileStore extends BaseFileStore {
  lc_namespace: string[];
  private files;
  /**
   * Retrieves the contents of a file given its path. If the file does not
   * exist, it throws an error.
   * @param path The path of the file to read.
   * @returns The contents of the file as a string.
   */
  readFile(path: string): Promise<string>;
  /**
   * Writes contents to a file at a given path. If the file already exists,
   * it overwrites the existing contents.
   * @param path The path of the file to write.
   * @param contents The contents to write to the file.
   * @returns Void
   */
  writeFile(path: string, contents: string): Promise<void>;
}
//#endregion
export { InMemoryFileStore };
//# sourceMappingURL=in_memory.d.cts.map