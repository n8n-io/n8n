import { CassandraClientArgs } from "../utils/cassandra.cjs";
import { BaseStore } from "@langchain/core/stores";

//#region src/storage/cassandra.d.ts

/**
 * Configuration options for initializing a CassandraKVStore.
 * These options extend generic Cassandra client arguments with specific settings
 * for key-value store operations.
 *
 * @interface CassandraKVOptions
 * @extends CassandraClientArgs Custom arguments for the Cassandra client, such as connection settings.
 *
 * @property {string} keyspace The name of the Cassandra keyspace to be used by the key-value store.
 *                The keyspace must exist.
 *
 * @property {string} table The name of the table within the specified keyspace dedicated to storing
 *                key-value pairs. The table will be created if it does not exist.
 *
 * @property {string} [keyDelimiter="/"] An optional delimiter used to structure complex keys. Defaults to '/'.
 *                This delimiter is used for parsing complex keys (e.g., hierarchical keys) when performing
 *                operations that involve key prefixes or segmentation.
 */
interface CassandraKVOptions extends CassandraClientArgs {
  keyspace: string;
  table: string;
  keyDelimiter?: string;
}
/**
 * A concrete implementation of BaseStore for interacting with a Cassandra database.
 * It provides methods to get, set, delete, and yield keys based on specified criteria.
 */
declare class CassandraKVStore extends BaseStore<string, Uint8Array> {
  lc_namespace: string[];
  private cassandraTable;
  private options;
  private colKey;
  private colKeyMap;
  private colVal;
  private keyDelimiter;
  protected inClauseSize: number;
  protected yieldKeysFetchSize: number;
  constructor(options: CassandraKVOptions);
  /**
   * Retrieves the values associated with an array of keys from the Cassandra database.
   * It chunks requests for large numbers of keys to manage performance and Cassandra limitations.
   * @param keys An array of keys for which to retrieve values.
   * @returns A promise that resolves with an array of Uint8Array or undefined, corresponding to each key.
   */
  mget(keys: string[]): Promise<(Uint8Array | undefined)[]>;
  /**
   * Sets multiple key-value pairs in the Cassandra database.
   * Each key-value pair is processed to ensure compatibility with Cassandra's storage requirements.
   * @param keyValuePairs An array of key-value pairs to set in the database.
   * @returns A promise that resolves when all key-value pairs have been set.
   */
  mset(keyValuePairs: [string, Uint8Array][]): Promise<void>;
  /**
   * Deletes multiple keys and their associated values from the Cassandra database.
   * @param keys An array of keys to delete from the database.
   * @returns A promise that resolves when all specified keys have been deleted.
   */
  mdelete(keys: string[]): Promise<void>;
  /**
   * Yields keys from the Cassandra database optionally based on a prefix, based
   * on the store's keyDelimiter. This method pages through results efficiently
   * for large datasets.
   * @param prefix An optional prefix to filter the keys to be yielded.
   * @returns An async generator that yields keys from the database.
   */
  yieldKeys(prefix?: string): AsyncGenerator<string>;
  private ensureTable;
  private processInChunks;
}
//#endregion
export { CassandraKVOptions, CassandraKVStore };
//# sourceMappingURL=cassandra.d.cts.map