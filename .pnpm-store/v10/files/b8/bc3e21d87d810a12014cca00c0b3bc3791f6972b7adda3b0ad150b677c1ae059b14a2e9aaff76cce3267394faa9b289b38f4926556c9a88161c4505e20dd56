import { createClient, createCluster } from "redis";
import { BaseCache } from "@langchain/core/caches";
import { Generation } from "@langchain/core/outputs";

//#region src/caches.d.ts

/**
 * Represents the type of the Redis client used to interact with the Redis
 * database.
 */
type RedisClientType$1 = ReturnType<typeof createClient> | ReturnType<typeof createCluster>;
/**
 * @deprecated Import from "@langchain/community/caches/ioredis" instead.
 * Represents a specific implementation of a caching mechanism using Redis
 * as the underlying storage system. It extends the `BaseCache` class and
 * overrides its methods to provide the Redis-specific logic.
 *
 * @example
 * ```typescript
 * const model = new ChatOpenAI({
 *   model: "gpt-4o-mini",
 *   cache: new RedisCache(new Redis(), { ttl: 60 }),
 * });
 *
 * // Invoke the model to perform an action
 * const response = await model.invoke("Do something random!");
 * console.log(response);
 * ```
 */
declare class RedisCache extends BaseCache {
  private redisClient;
  constructor(redisClient: RedisClientType$1);
  /**
   * Retrieves data from the cache. It constructs a cache key from the given
   * `prompt` and `llmKey`, and retrieves the corresponding value from the
   * Redis database.
   *
   * @param prompt The prompt used to construct the cache key.
   * @param llmKey The LLM key used to construct the cache key.
   * @returns An array of Generations if found, null otherwise.
   */
  lookup(prompt: string, llmKey: string): Promise<Generation[] | null>;
  /**
   * Updates the cache with new data. It constructs a cache key from the
   * given `prompt` and `llmKey`, and stores the `value` in the Redis
   * database.
   * @param prompt The prompt used to construct the cache key.
   * @param llmKey The LLM key used to construct the cache key.
   * @param value The value to be stored in the cache.
   */
  update(prompt: string, llmKey: string, value: Generation[]): Promise<void>;
}
//#endregion
export { RedisCache };
//# sourceMappingURL=caches.d.ts.map