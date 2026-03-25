import { BaseCache } from "@langchain/core/caches";
import { Redis, RedisConfigNodejs } from "@upstash/redis";
import { Generation } from "@langchain/core/outputs";

//#region src/caches/upstash_redis.d.ts
type UpstashRedisCacheProps = {
  /**
   * The config to use to instantiate an Upstash Redis client.
   */
  config?: RedisConfigNodejs;
  /**
   * An existing Upstash Redis client.
   */
  client?: Redis;
  /**
   * Time-to-live (TTL) for cached items in seconds.
   */
  ttl?: number;
};
/**
 * A cache that uses Upstash as the backing store.
 * See https://docs.upstash.com/redis.
 * @example
 * ```typescript
 * const cache = new UpstashRedisCache({
 *   config: {
 *     url: "UPSTASH_REDIS_REST_URL",
 *     token: "UPSTASH_REDIS_REST_TOKEN",
 *   },
 *   ttl: 3600, // Optional: Cache entries will expire after 1 hour
 * });
 * // Initialize the OpenAI model with Upstash Redis cache for caching responses
 * const model = new ChatOpenAI({
 *   model: "gpt-4o-mini",
 *   cache,
 * });
 * await model.invoke("How are you today?");
 * const cachedValues = await cache.lookup("How are you today?", "llmKey");
 * ```
 */
declare class UpstashRedisCache extends BaseCache {
  private redisClient;
  private ttl?;
  constructor(props: UpstashRedisCacheProps);
  /**
   * Lookup LLM generations in cache by prompt and associated LLM key.
   */
  lookup(prompt: string, llmKey: string): Promise<Generation[] | null>;
  /**
   * Update the cache with the given generations.
   *
   * Note this overwrites any existing generations for the given prompt and LLM key.
   */
  update(prompt: string, llmKey: string, value: Generation[]): Promise<void>;
}
//#endregion
export { UpstashRedisCache, UpstashRedisCacheProps };
//# sourceMappingURL=upstash_redis.d.ts.map