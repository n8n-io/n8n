import { Redis } from "ioredis";
import { BaseStore } from "@langchain/core/stores";

//#region src/storage/ioredis.d.ts

/**
 * Class that extends the BaseStore class to interact with a Redis
 * database. It provides methods for getting, setting, and deleting data,
 * as well as yielding keys from the database.
 * @example
 * ```typescript
 * const store = new RedisByteStore({ client: new Redis({}) });
 * await store.mset([
 *   [
 *     "message:id:0",
 *     new TextEncoder().encode(JSON.stringify(new AIMessage("ai stuff..."))),
 *   ],
 *   [
 *     "message:id:1",
 *     new TextEncoder().encode(
 *       JSON.stringify(new HumanMessage("human stuff...")),
 *     ),
 *   ],
 * ]);
 * const retrievedMessages = await store.mget(["message:id:0", "message:id:1"]);
 * console.log(retrievedMessages.map((v) => new TextDecoder().decode(v)));
 * const yieldedKeys = [];
 * for await (const key of store.yieldKeys("message:id:")) {
 *   yieldedKeys.push(key);
 * }
 * console.log(yieldedKeys);
 * await store.mdelete(yieldedKeys);
 * ```
 */
declare class RedisByteStore extends BaseStore<string, Uint8Array> {
  lc_namespace: string[];
  protected client: Redis;
  protected ttl?: number;
  protected namespace?: string;
  protected yieldKeysScanBatchSize: number;
  constructor(fields: {
    client: Redis;
    ttl?: number;
    namespace?: string;
    yieldKeysScanBatchSize?: number;
  });
  _getPrefixedKey(key: string): string;
  _getDeprefixedKey(key: string): string;
  /**
   * Gets multiple keys from the Redis database.
   * @param keys Array of keys to be retrieved.
   * @returns An array of retrieved values.
   */
  mget(keys: string[]): Promise<(Buffer<ArrayBufferLike> | undefined)[]>;
  /**
   * Sets multiple keys in the Redis database.
   * @param keyValuePairs Array of key-value pairs to be set.
   * @returns Promise that resolves when all keys have been set.
   */
  mset(keyValuePairs: [string, Uint8Array][]): Promise<void>;
  /**
   * Deletes multiple keys from the Redis database.
   * @param keys Array of keys to be deleted.
   * @returns Promise that resolves when all keys have been deleted.
   */
  mdelete(keys: string[]): Promise<void>;
  /**
   * Yields keys from the Redis database.
   * @param prefix Optional prefix to filter the keys.
   * @returns An AsyncGenerator that yields keys from the Redis database.
   */
  yieldKeys(prefix?: string): AsyncGenerator<string>;
}
//#endregion
export { RedisByteStore };
//# sourceMappingURL=ioredis.d.cts.map