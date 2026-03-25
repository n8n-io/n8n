import { BaseStore } from "@langchain/core/stores";

//#region src/storage/file_system.d.ts

/**
 * File system implementation of the BaseStore using a dictionary. Used for
 * storing key-value pairs in the file system.
 * @example
 * ```typescript
 * const store = await LocalFileStore.fromPath("./messages");
 * await store.mset(
 *   Array.from({ length: 5 }).map((_, index) => [
 *     `message:id:${index}`,
 *     new TextEncoder().encode(
 *       JSON.stringify(
 *         index % 2 === 0
 *           ? new AIMessage("ai stuff...")
 *           : new HumanMessage("human stuff..."),
 *       ),
 *     ),
 *   ]),
 * );
 * const retrievedMessages = await store.mget(["message:id:0", "message:id:1"]);
 * console.log(retrievedMessages.map((v) => new TextDecoder().decode(v)));
 * for await (const key of store.yieldKeys("message:id:")) {
 *   await store.mdelete([key]);
 * }
 * ```
 *
 * @security **Security Notice** This file store
 * can alter any text file in the provided directory and any subfolders.
 * Make sure that the path you specify when initializing the store is free
 * of other files.
 */
declare class LocalFileStore extends BaseStore<string, Uint8Array> {
  lc_namespace: string[];
  rootPath: string;
  constructor(fields: {
    rootPath: string;
  });
  private getParsedFile;
  private setFileContent;
  /**
   * Returns the full path of the file where the value of the given key is stored.
   * @param key the key to get the full path for
   */
  private getFullPath;
  /**
   * Retrieves the values associated with the given keys from the store.
   * @param keys Keys to retrieve values for.
   * @returns Array of values associated with the given keys.
   */
  mget(keys: string[]): Promise<(Uint8Array<ArrayBufferLike> | undefined)[]>;
  /**
   * Sets the values for the given keys in the store.
   * @param keyValuePairs Array of key-value pairs to set in the store.
   * @returns Promise that resolves when all key-value pairs have been set.
   */
  mset(keyValuePairs: [string, Uint8Array][]): Promise<void>;
  /**
   * Deletes the given keys and their associated values from the store.
   * @param keys Keys to delete from the store.
   * @returns Promise that resolves when all keys have been deleted.
   */
  mdelete(keys: string[]): Promise<void>;
  /**
   * Asynchronous generator that yields keys from the store. If a prefix is
   * provided, it only yields keys that start with the prefix.
   * @param prefix Optional prefix to filter keys.
   * @returns AsyncGenerator that yields keys from the store.
   */
  yieldKeys(prefix?: string): AsyncGenerator<string>;
  /**
   * Static method for initializing the class.
   * Preforms a check to see if the directory exists, and if not, creates it.
   * @param path Path to the directory.
   * @returns Promise that resolves to an instance of the class.
   */
  static fromPath(rootPath: string): Promise<LocalFileStore>;
}
//#endregion
export { LocalFileStore };
//# sourceMappingURL=file_system.d.ts.map