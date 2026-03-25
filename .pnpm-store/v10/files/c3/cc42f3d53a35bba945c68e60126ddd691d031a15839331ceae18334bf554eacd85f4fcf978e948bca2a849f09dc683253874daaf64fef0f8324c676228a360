import { VercelKV } from "@vercel/kv";
import { BaseStore } from "@langchain/core/stores";

//#region src/storage/vercel_kv.d.ts

/**
 * Class that extends the BaseStore class to interact with a Vercel KV
 * database. It provides methods for getting, setting, and deleting data,
 * as well as yielding keys from the database.
 * @example
 * ```typescript
 * const store = new VercelKVStore({
 *   client: getClient(),
 * });
 * await store.mset([
 *   { key: "message:id:0", value: "encoded message 0" },
 *   { key: "message:id:1", value: "encoded message 1" },
 * ]);
 * const retrievedMessages = await store.mget(["message:id:0", "message:id:1"]);
 * const yieldedKeys = [];
 * for await (const key of store.yieldKeys("message:id:")) {
 *   yieldedKeys.push(key);
 * }
 * await store.mdelete(yieldedKeys);
 * ```
 */
declare class VercelKVStore extends BaseStore<string, Uint8Array> {
  lc_namespace: string[];
  protected client: VercelKV;
  protected ttl?: number;
  protected namespace?: string;
  protected yieldKeysScanBatchSize: number;
  constructor(fields?: {
    client?: VercelKV;
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
  mget(keys: string[]): Promise<(Uint8Array<ArrayBuffer> | undefined)[]>;
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
export { VercelKVStore };
//# sourceMappingURL=vercel_kv.d.ts.map