import { SerializerProtocol } from "../serde/base.js";

//#region src/cache/base.d.ts
type CacheNamespace = string[];
type CacheFullKey = [namespace: CacheNamespace, key: string];
declare abstract class BaseCache<V = unknown> {
  serde: SerializerProtocol;
  /**
   * Initialize the cache with a serializer.
   *
   * @param serde - The serializer to use.
   */
  constructor(serde?: SerializerProtocol);
  /**
   * Get the cached values for the given keys.
   *
   * @param keys - The keys to get.
   */
  abstract get(keys: CacheFullKey[]): Promise<{
    key: CacheFullKey;
    value: V;
  }[]>;
  /**
   * Set the cached values for the given keys and TTLs.
   *
   * @param pairs - The pairs to set.
   */
  abstract set(pairs: {
    key: CacheFullKey;
    value: V;
    ttl?: number;
  }[]): Promise<void>;
  /**
   * Delete the cached values for the given namespaces.
   * If no namespaces are provided, clear all cached values.
   *
   * @param namespaces - The namespaces to clear.
   */
  abstract clear(namespaces: CacheNamespace[]): Promise<void>;
}
//#endregion
export { BaseCache, CacheFullKey, CacheNamespace };
//# sourceMappingURL=base.d.ts.map