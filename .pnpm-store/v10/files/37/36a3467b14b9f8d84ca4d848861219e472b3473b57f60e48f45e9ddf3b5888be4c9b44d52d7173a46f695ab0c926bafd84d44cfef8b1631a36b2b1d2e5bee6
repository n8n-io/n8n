import { Serializable } from "./load/serializable.js";

//#region src/stores.d.ts
/**
 * Abstract interface for a key-value store.
 */
declare abstract class BaseStore<K, V> extends Serializable {
  /**
   * Abstract method to get multiple values for a set of keys.
   * @param {K[]} keys - An array of keys.
   * @returns {Promise<(V | undefined)[]>} - A Promise that resolves with array of values or undefined if key not found.
   */
  abstract mget(keys: K[]): Promise<(V | undefined)[]>;
  /**
   * Abstract method to set a value for multiple keys.
   * @param {[K, V][]} keyValuePairs - An array of key-value pairs.
   * @returns {Promise<void>} - A Promise that resolves when the operation is complete.
   */
  abstract mset(keyValuePairs: [K, V][]): Promise<void>;
  /**
   * Abstract method to delete multiple keys.
   * @param {K[]} keys - An array of keys to delete.
   * @returns {Promise<void>} - A Promise that resolves when the operation is complete.
   */
  abstract mdelete(keys: K[]): Promise<void>;
  /**
   * Abstract method to yield keys optionally based on a prefix.
   * @param {string} prefix - Optional prefix to filter keys.
   * @returns {AsyncGenerator<K | string>} - An asynchronous generator that yields keys on iteration.
   */
  abstract yieldKeys(prefix?: string): AsyncGenerator<K | string>;
}
/**
 * In-memory implementation of the BaseStore using a dictionary. Used for
 * storing key-value pairs in memory.
 * @example
 * ```typescript
 * const store = new InMemoryStore<BaseMessage>();
 * await store.mset(
 *   Array.from({ length: 5 }).map((_, index) => [
 *     `message:id:${index}`,
 *     index % 2 === 0
 *       ? new AIMessage("ai stuff...")
 *       : new HumanMessage("human stuff..."),
 *   ]),
 * );
 *
 * const retrievedMessages = await store.mget(["message:id:0", "message:id:1"]);
 * await store.mdelete(await store.yieldKeys("message:id:").toArray());
 * ```
 */
declare class InMemoryStore<T = any> extends BaseStore<string, T> {
  lc_namespace: string[];
  protected store: Record<string, T>;
  /**
   * Retrieves the values associated with the given keys from the store.
   * @param keys Keys to retrieve values for.
   * @returns Array of values associated with the given keys.
   */
  mget(keys: string[]): Promise<T[]>;
  /**
   * Sets the values for the given keys in the store.
   * @param keyValuePairs Array of key-value pairs to set in the store.
   * @returns Promise that resolves when all key-value pairs have been set.
   */
  mset(keyValuePairs: [string, T][]): Promise<void>;
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
  yieldKeys(prefix?: string | undefined): AsyncGenerator<string>;
}
//#endregion
export { BaseStore, InMemoryStore };
//# sourceMappingURL=stores.d.ts.map