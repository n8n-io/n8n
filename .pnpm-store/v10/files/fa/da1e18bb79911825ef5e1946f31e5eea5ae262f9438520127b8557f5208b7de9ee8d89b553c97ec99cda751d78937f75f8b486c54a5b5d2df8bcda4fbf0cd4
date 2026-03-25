import { Generation } from "@langchain/core/outputs";
import { BaseCache } from "@langchain/core/caches";

//#region src/cache/file_system.d.ts

/**
 * A cache that uses the local filesystem as the backing store.
 * This is useful for local development and testing. But it is not recommended for production use.
 */
declare class LocalFileCache extends BaseCache {
  private cacheDir;
  private constructor();
  /**
   * Create a new cache backed by the local filesystem.
   * It ensures that the cache directory exists before returning.
   * @param cacheDir
   */
  static create(cacheDir?: string): Promise<LocalFileCache>;
  /**
   * Retrieves data from the cache. It constructs a cache key from the given
   * `prompt` and `llmKey`, and retrieves the corresponding value from the
   * cache files.
   * @param prompt The prompt used to construct the cache key.
   * @param llmKey The LLM key used to construct the cache key.
   * @returns An array of Generations if found, null otherwise.
   */
  lookup(prompt: string, llmKey: string): Promise<any>;
  /**
   * Updates the cache with new data. It constructs a cache key from the
   * given `prompt` and `llmKey`, and stores the `value` in a specific
   * file in the cache directory.
   * @param prompt The prompt used to construct the cache key.
   * @param llmKey The LLM key used to construct the cache key.
   * @param generations The value to be stored in the cache.
   */
  update(prompt: string, llmKey: string, generations: Generation[]): Promise<void>;
}
//#endregion
export { LocalFileCache };
//# sourceMappingURL=file_system.d.ts.map