import { Redis, RedisConfigNodejs } from "@upstash/redis";
import { BaseStore } from "@langchain/core/stores";

//#region src/storage/upstash_redis.d.ts

/**
 * Type definition for the input parameters required to initialize an
 * instance of the UpstashStoreInput class.
 */
interface UpstashRedisStoreInput {
  sessionTTL?: number;
  config?: RedisConfigNodejs;
  client?: Redis;
  /**
   * The amount of keys to retrieve per batch when yielding keys.
   * @default 1000
   */
  yieldKeysScanBatchSize?: number;
  /**
   * The namespace to use for the keys in the database.
   */
  namespace?: string;
}
/**
 * Class that extends the BaseStore class to interact with an Upstash Redis
 * database. It provides methods for getting, setting, and deleting data,
 * as well as yielding keys from the database.
 * @example
 * ```typescript
 * const store = new UpstashRedisStore({
 *   client: new Redis({
 *     url: "your-upstash-redis-url",
 *     token: "your-upstash-redis-token",
 *   }),
 * });
 * await store.mset([
 *   ["message:id:0", "encoded-ai-message"],
 *   ["message:id:1", "encoded-human-message"],
 * ]);
 * const retrievedMessages = await store.mget(["message:id:0", "message:id:1"]);
 * const yieldedKeys = [];
 * for await (const key of store.yieldKeys("message:id")) {
 *   yieldedKeys.push(key);
 * }
 * await store.mdelete(yieldedKeys);
 * ```
 */
declare class UpstashRedisStore extends BaseStore<string, Uint8Array> {
  lc_namespace: string[];
  protected client: Redis;
  protected namespace?: string;
  protected yieldKeysScanBatchSize: number;
  private sessionTTL?;
  constructor(fields: UpstashRedisStoreInput);
  _getPrefixedKey(key: string): string;
  _getDeprefixedKey(key: string): string;
  /**
   * Gets multiple keys from the Upstash Redis database.
   * @param keys Array of keys to be retrieved.
   * @returns An array of retrieved values.
   */
  mget(keys: string[]): Promise<(Uint8Array<ArrayBuffer> | undefined)[]>;
  /**
   * Sets multiple keys in the Upstash Redis database.
   * @param keyValuePairs Array of key-value pairs to be set.
   * @returns Promise that resolves when all keys have been set.
   */
  mset(keyValuePairs: [string, Uint8Array][]): Promise<void>;
  /**
   * Deletes multiple keys from the Upstash Redis database.
   * @param keys Array of keys to be deleted.
   * @returns Promise that resolves when all keys have been deleted.
   */
  mdelete(keys: string[]): Promise<void>;
  /**
   * Yields keys from the Upstash Redis database.
   * @param prefix Optional prefix to filter the keys. A wildcard (*) is always appended to the end.
   * @returns An AsyncGenerator that yields keys from the Upstash Redis database.
   */
  yieldKeys(prefix?: string): AsyncGenerator<string>;
}
//#endregion
export { UpstashRedisStore, UpstashRedisStoreInput };
//# sourceMappingURL=upstash_redis.d.ts.map