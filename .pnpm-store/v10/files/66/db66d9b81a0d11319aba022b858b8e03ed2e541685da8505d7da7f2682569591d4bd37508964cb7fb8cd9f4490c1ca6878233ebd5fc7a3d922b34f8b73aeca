import { BaseCache, CacheEntry } from "./BaseCache";

export class LLMCache extends BaseCache<CacheEntry> {
  constructor(
    logger: (message: {
      category?: string;
      message: string;
      level?: number;
    }) => void,
    cacheDir?: string,
    cacheFile?: string,
  ) {
    super(logger, cacheDir, cacheFile || "llm_calls.json");
  }

  /**
   * Overrides the get method to track used hashes by requestId.
   * @param options - The options used to generate the cache key.
   * @param requestId - The identifier for the current request.
   * @returns The cached data if available, otherwise null.
   */
  public async get<T>(
    options: Record<string, unknown>,
    requestId: string,
  ): Promise<T | null> {
    const data = await super.get(options, requestId);
    return data as T | null; // TODO: remove this cast
  }

  /**
   * Overrides the set method to include cache cleanup logic.
   * @param options - The options used to generate the cache key.
   * @param data - The data to be cached.
   * @param requestId - The identifier for the current request.
   */
  public async set(
    options: Record<string, unknown>,
    data: unknown,
    requestId: string,
  ): Promise<void> {
    await super.set(options, data, requestId);
    this.logger({
      category: "llm_cache",
      message: "Cache miss - saved new response",
      level: 1,
    });
  }
}
