/**
 * Same as Partial<T> but goes deeper and makes Partial<T> all its properties and sub-properties.
 */
export type DeepPartial<T> = T | (T extends Array<infer U> ? DeepPartial<U>[] : T extends Map<infer K, infer V> ? Map<DeepPartial<K>, DeepPartial<V>> : T extends Set<infer M> ? Set<DeepPartial<M>> : T extends object ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : T);
