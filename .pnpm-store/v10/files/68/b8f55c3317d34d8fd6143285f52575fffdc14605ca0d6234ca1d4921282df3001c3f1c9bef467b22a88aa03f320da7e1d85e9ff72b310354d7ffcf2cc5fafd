import { BaseStore } from "@langchain/core/stores";
import { Collection, Document } from "mongodb";

//#region src/storage.d.ts

/**
 * Type definition for the input parameters required to initialize an
 * instance of the MongoDBStoreInput class.
 */
interface MongoDBStoreInput {
  collection: Collection<Document>;
  /**
   * The amount of keys to retrieve per batch when yielding keys.
   * @default 1000
   */
  yieldKeysScanBatchSize?: number;
  /**
   * The namespace to use for the keys in the database.
   */
  namespace?: string;
  /**
   * The primary key to use for the database.
   * @default "_id"
   */
  primaryKey?: string;
}
/**
 * Class that extends the BaseStore class to interact with a MongoDB
 * database. It provides methods for getting, setting, and deleting data,
 * as well as yielding keys from the database.
 * @example
 * ```typescript
 * const client = new MongoClient(process.env.MONGODB_ATLAS_URI);
 * const collection = client.db("dbName").collection("collectionName");

 * const store = new MongoDBStore({
 *   collection,
 * });
 *
 * const docs = [
 *   [uuidv4(), "Dogs are tough."],
 *   [uuidv4(), "Cats are tough."],
 * ];
 * const encoder = new TextEncoder();
 * const docsAsKVPairs: Array<[string, Uint8Array]> = docs.map(
 *   (doc) => [doc[0], encoder.encode(doc[1])]
 * );
 * await store.mset(docsAsKVPairs);
 * ```
 */
declare class MongoDBStore extends BaseStore<string, Uint8Array> {
  lc_namespace: string[];
  collection: Collection<Document>;
  protected namespace?: string;
  protected yieldKeysScanBatchSize: number;
  primaryKey: string;
  constructor(fields: MongoDBStoreInput);
  _getPrefixedKey(key: string): string;
  _getDeprefixedKey(key: string): string;
  /**
   * Gets multiple keys from the MongoDB database.
   * @param keys Array of keys to be retrieved.
   * @returns An array of retrieved values.
   */
  mget(keys: string[]): Promise<(Uint8Array<ArrayBufferLike> | undefined)[]>;
  /**
   * Sets multiple keys in the MongoDB database.
   * @param keyValuePairs Array of key-value pairs to be set.
   * @returns Promise that resolves when all keys have been set.
   */
  mset(keyValuePairs: [string, Uint8Array][]): Promise<void>;
  /**
   * Deletes multiple keys from the MongoDB database.
   * @param keys Array of keys to be deleted.
   * @returns Promise that resolves when all keys have been deleted.
   */
  mdelete(keys: string[]): Promise<void>;
  /**
   * Yields keys from the MongoDB database.
   * @param prefix Optional prefix to filter the keys. A wildcard (*) is always appended to the end.
   * @returns An AsyncGenerator that yields keys from the MongoDB database.
   */
  yieldKeys(prefix?: string): AsyncGenerator<string>;
}
//#endregion
export { MongoDBStore, MongoDBStoreInput };
//# sourceMappingURL=storage.d.ts.map