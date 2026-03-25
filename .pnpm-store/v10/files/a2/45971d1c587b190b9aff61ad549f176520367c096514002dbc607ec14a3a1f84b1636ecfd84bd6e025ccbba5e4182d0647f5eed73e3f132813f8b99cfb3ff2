export type CacheOptions<Key = unknown, Value = unknown> = {
    /** Maximum number of items the cache can hold. */
    max: number;
    /** Function called when an item is evicted from the cache. */
    onEviction?: (key: Key, value: Value) => unknown;
};
export declare const createLRU: <Key, Value>(options: CacheOptions<Key, Value>) => {
    /** Adds a key-value pair to the cache. Updates the value if the key already exists. */
    set(key: Key, value: Value): undefined;
    /** Retrieves the value for a given key and moves the key to the most recent position. */
    get(key: Key): Value | undefined;
    /** Retrieves the value for a given key without changing its position. */
    peek: (key: Key) => Value | undefined;
    /** Checks if a key exists in the cache. */
    has: (key: Key) => boolean;
    /** Iterates over all keys in the cache, from most recent to least recent. */
    keys(): IterableIterator<Key>;
    /** Iterates over all values in the cache, from most recent to least recent. */
    values(): IterableIterator<Value>;
    /** Iterates over `[key, value]` pairs in the cache, from most recent to least recent. */
    entries(): IterableIterator<[Key, Value]>;
    /** Iterates over each value-key pair in the cache, from most recent to least recent. */
    forEach: (callback: (value: Value, key: Key) => unknown) => undefined;
    /** Deletes a key-value pair from the cache. */
    delete(key: Key): boolean;
    /** Evicts the oldest item or the specified number of the oldest items from the cache. */
    evict: (number: number) => undefined;
    /** Clears all key-value pairs from the cache. */
    clear(): undefined;
    /** Resizes the cache to a new maximum size, evicting items if necessary. */
    resize: (newMax: number) => undefined;
    /** Returns the maximum number of items that can be stored in the cache. */
    readonly max: number;
    /** Returns the number of items currently stored in the cache. */
    readonly size: number;
    /** Returns the number of currently available slots in the cache before reaching the maximum size. */
    readonly available: number;
};
