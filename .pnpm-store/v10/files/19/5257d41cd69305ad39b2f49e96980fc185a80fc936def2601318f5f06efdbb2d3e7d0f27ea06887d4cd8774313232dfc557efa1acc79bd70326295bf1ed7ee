import { BaseCache, CacheFullKey, CacheNamespace } from "./base.cjs";

//#region src/cache/memory.d.ts
declare class InMemoryCache<V = unknown> extends BaseCache<V> {
  private cache;
  get(keys: CacheFullKey[]): Promise<{
    key: CacheFullKey;
    value: V;
  }[]>;
  set(pairs: {
    key: CacheFullKey;
    value: V;
    ttl?: number;
  }[]): Promise<void>;
  clear(namespaces: CacheNamespace[]): Promise<void>;
}
//#endregion
export { InMemoryCache };
//# sourceMappingURL=memory.d.cts.map