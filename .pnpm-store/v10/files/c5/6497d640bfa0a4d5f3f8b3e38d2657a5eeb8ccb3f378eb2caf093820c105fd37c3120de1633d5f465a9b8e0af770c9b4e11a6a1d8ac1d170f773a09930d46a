import { Redis } from "ioredis";
import { BaseCache } from "@langchain/core/caches";
import { Generation } from "@langchain/core/outputs";

//#region src/caches/ioredis.d.ts

/**
 * Cache LLM results using Redis.
 * @example
 * ```typescript
 * const model = new ChatOpenAI({
 *   model: "gpt-4o-mini",
 *   cache: new RedisCache(new Redis(), { ttl: 60 }),
 * });
 *
 * // Invoke the model with a prompt
 * const response = await model.invoke("Do something random!");
 * console.log(response);
 *
 * // Remember to disconnect the Redis client when done
 * await redisClient.disconnect();
 * ```
 */
declare class RedisCache extends BaseCache {
  protected redisClient: Redis;
  protected ttl?: number;
  constructor(redisClient: Redis, config?: {
    ttl?: number;
  });
  /**
   * Retrieves data from the Redis server using a prompt and an LLM key. If
   * the data is not found, it returns null.
   * @param prompt The prompt used to find the data.
   * @param llmKey The LLM key used to find the data.
   * @returns The corresponding data as an array of Generation objects, or null if not found.
   */
  lookup(prompt: string, llmKey: string): Promise<Generation[] | null>;
  /**
   * Updates the data in the Redis server using a prompt and an LLM key.
   * @param prompt The prompt used to store the data.
   * @param llmKey The LLM key used to store the data.
   * @param value The data to be stored, represented as an array of Generation objects.
   */
  update(prompt: string, llmKey: string, value: Generation[]): Promise<void>;
}
//#endregion
export { RedisCache };
//# sourceMappingURL=ioredis.d.cts.map