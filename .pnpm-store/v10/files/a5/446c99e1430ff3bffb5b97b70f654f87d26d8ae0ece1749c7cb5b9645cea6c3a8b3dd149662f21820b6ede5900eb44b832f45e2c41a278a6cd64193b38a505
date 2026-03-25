import { Document } from "@langchain/core/documents";
import { BaseStore } from "@langchain/core/stores";

//#region src/storage/encoder_backed.d.ts

/**
 * Class that provides a layer of abstraction over the base storage,
 * allowing for the encoding and decoding of keys and values. It extends
 * the BaseStore class.
 */
declare class EncoderBackedStore<K, V, SerializedType = any> extends BaseStore<K, V> {
  lc_namespace: string[];
  store: BaseStore<string, SerializedType>;
  keyEncoder: (key: K) => string;
  valueSerializer: (value: V) => SerializedType;
  valueDeserializer: (value: SerializedType) => V;
  constructor(fields: {
    store: BaseStore<string, SerializedType>;
    keyEncoder: (key: K) => string;
    valueSerializer: (value: V) => SerializedType;
    valueDeserializer: (value: SerializedType) => V;
  });
  /**
   * Method to get multiple keys at once. It works with the encoded keys and
   * serialized values.
   * @param keys Array of keys to get
   * @returns Promise that resolves with an array of values or undefined for each key
   */
  mget(keys: K[]): Promise<(V | undefined)[]>;
  /**
   * Method to set multiple keys at once. It works with the encoded keys and
   * serialized values.
   * @param keyValuePairs Array of key-value pairs to set
   * @returns Promise that resolves when the operation is complete
   */
  mset(keyValuePairs: [K, V][]): Promise<void>;
  /**
   * Method to delete multiple keys at once. It works with the encoded keys.
   * @param keys Array of keys to delete
   * @returns Promise that resolves when the operation is complete
   */
  mdelete(keys: K[]): Promise<void>;
  /**
   * Method to yield keys. It works with the encoded keys.
   * @param prefix Optional prefix to filter keys
   * @returns AsyncGenerator that yields keys
   */
  yieldKeys(prefix?: string | undefined): AsyncGenerator<string | K>;
}
declare function createDocumentStoreFromByteStore(store: BaseStore<string, Uint8Array>): EncoderBackedStore<string, Document<Record<string, any>>, Uint8Array<ArrayBufferLike>>;
//#endregion
export { EncoderBackedStore, createDocumentStoreFromByteStore };
//# sourceMappingURL=encoder_backed.d.ts.map