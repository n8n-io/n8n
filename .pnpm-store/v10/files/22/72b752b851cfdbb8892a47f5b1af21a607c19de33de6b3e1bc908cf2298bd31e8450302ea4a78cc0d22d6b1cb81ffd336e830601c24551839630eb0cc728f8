import { KeyvStoreAdapter, StoredData, Keyv, StoredDataRaw } from 'keyv';
export { Keyv, KeyvHooks, KeyvOptions, KeyvStoreAdapter } from 'keyv';
import { Hookified } from 'hookified';

type CacheableOptions$1 = {
    enabled?: boolean;
};
declare class CacheableStats {
    private _hits;
    private _misses;
    private _gets;
    private _sets;
    private _deletes;
    private _clears;
    private _vsize;
    private _ksize;
    private _count;
    private _enabled;
    constructor(options?: CacheableOptions$1);
    /**
     * @returns {boolean} - Whether the stats are enabled
     */
    get enabled(): boolean;
    /**
     * @param {boolean} enabled - Whether to enable the stats
     */
    set enabled(enabled: boolean);
    /**
     * @returns {number} - The number of hits
     * @readonly
     */
    get hits(): number;
    /**
     * @returns {number} - The number of misses
     * @readonly
     */
    get misses(): number;
    /**
     * @returns {number} - The number of gets
     * @readonly
     */
    get gets(): number;
    /**
     * @returns {number} - The number of sets
     * @readonly
     */
    get sets(): number;
    /**
     * @returns {number} - The number of deletes
     * @readonly
     */
    get deletes(): number;
    /**
     * @returns {number} - The number of clears
     * @readonly
     */
    get clears(): number;
    /**
     * @returns {number} - The vsize (value size) of the cache instance
     * @readonly
     */
    get vsize(): number;
    /**
     * @returns {number} - The ksize (key size) of the cache instance
     * @readonly
     */
    get ksize(): number;
    /**
     * @returns {number} - The count of the cache instance
     * @readonly
     */
    get count(): number;
    incrementHits(): void;
    incrementMisses(): void;
    incrementGets(): void;
    incrementSets(): void;
    incrementDeletes(): void;
    incrementClears(): void;
    incrementVSize(value: any): void;
    decreaseVSize(value: any): void;
    incrementKSize(key: string): void;
    decreaseKSize(key: string): void;
    incrementCount(): void;
    decreaseCount(): void;
    setCount(count: number): void;
    roughSizeOfString(value: string): number;
    roughSizeOfObject(object: any): number;
    reset(): void;
    resetStoreValues(): void;
}

/**
 * CacheableItem
 * @typedef {Object} CacheableItem
 * @property {string} key - The key of the cacheable item
 * @property {any} value - The value of the cacheable item
 * @property {number|string} [ttl] - Time to Live - If you set a number it is miliseconds, if you set a string it is a human-readable
 * format such as `1s` for 1 second or `1h` for 1 hour. Setting undefined means that it will use the default time-to-live. If both are
 * undefined then it will not have a time-to-live.
 */
type CacheableItem = {
    key: string;
    value: any;
    ttl?: number | string;
};
type CacheableStoreItem = {
    key: string;
    value: any;
    expires?: number;
};

type GetOrSetKey = string | ((options?: GetOrSetOptions) => string);
type GetOrSetFunctionOptions = {
    ttl?: number | string;
    cacheErrors?: boolean;
    throwErrors?: boolean;
};
type GetOrSetOptions = GetOrSetFunctionOptions & {
    cacheId?: string;
    cache: Cacheable;
};
type CreateWrapKey = (function_: AnyFunction, arguments_: any[], options?: WrapFunctionOptions) => string;
type WrapFunctionOptions = {
    ttl?: number | string;
    keyPrefix?: string;
    createKey?: CreateWrapKey;
    cacheErrors?: boolean;
    cacheId?: string;
};
type WrapOptions = WrapFunctionOptions & {
    cache: Cacheable;
};
type WrapSyncOptions = WrapFunctionOptions & {
    cache: CacheableMemory;
};
type AnyFunction = (...arguments_: any[]) => any;
declare function wrapSync<T>(function_: AnyFunction, options: WrapSyncOptions): AnyFunction;
declare function getOrSet<T>(key: GetOrSetKey, function_: () => Promise<T>, options: GetOrSetOptions): Promise<T | undefined>;
declare function wrap<T>(function_: AnyFunction, options: WrapOptions): AnyFunction;

declare enum StoreHashAlgorithm {
    SHA256 = "sha256",
    SHA1 = "sha1",
    MD5 = "md5",
    djb2Hash = "djb2Hash"
}
type StoreHashAlgorithmFunction = ((key: string, storeHashSize: number) => number);
/**
 * @typedef {Object} CacheableMemoryOptions
 * @property {number|string} [ttl] - Time to Live - If you set a number it is miliseconds, if you set a string it is a human-readable
 * format such as `1s` for 1 second or `1h` for 1 hour. Setting undefined means that it will use the default time-to-live. If both are
 * undefined then it will not have a time-to-live.
 * @property {boolean} [useClone] - If true, it will clone the value before returning it. If false, it will return the value directly. Default is true.
 * @property {number} [lruSize] - The size of the LRU cache. If set to 0, it will not use LRU cache. Default is 0. If you are using LRU then the limit is based on Map() size 17mm.
 * @property {number} [checkInterval] - The interval to check for expired items. If set to 0, it will not check for expired items. Default is 0.
 * @property {number} [storeHashSize] - The number of how many Map stores we have for the hash. Default is 10.
 */
type CacheableMemoryOptions = {
    ttl?: number | string;
    useClone?: boolean;
    lruSize?: number;
    checkInterval?: number;
    storeHashSize?: number;
    storeHashAlgorithm?: StoreHashAlgorithm | ((key: string, storeHashSize: number) => number);
};
type SetOptions = {
    ttl?: number | string;
    expire?: number | Date;
};
declare class CacheableMemory extends Hookified {
    private _lru;
    private _storeHashSize;
    private _storeHashAlgorithm;
    private _store;
    private _ttl;
    private _useClone;
    private _lruSize;
    private _checkInterval;
    private _interval;
    /**
     * @constructor
     * @param {CacheableMemoryOptions} [options] - The options for the CacheableMemory
     */
    constructor(options?: CacheableMemoryOptions);
    /**
     * Gets the time-to-live
     * @returns {number|string|undefined} - The time-to-live in miliseconds or a human-readable format. If undefined, it will not have a time-to-live.
     */
    get ttl(): number | string | undefined;
    /**
     * Sets the time-to-live
     * @param {number|string|undefined} value - The time-to-live in miliseconds or a human-readable format (example '1s' = 1 second, '1h' = 1 hour). If undefined, it will not have a time-to-live.
     */
    set ttl(value: number | string | undefined);
    /**
     * Gets whether to use clone
     * @returns {boolean} - If true, it will clone the value before returning it. If false, it will return the value directly. Default is true.
     */
    get useClone(): boolean;
    /**
     * Sets whether to use clone
     * @param {boolean} value - If true, it will clone the value before returning it. If false, it will return the value directly. Default is true.
     */
    set useClone(value: boolean);
    /**
     * Gets the size of the LRU cache
     * @returns {number} - The size of the LRU cache. If set to 0, it will not use LRU cache. Default is 0. If you are using LRU then the limit is based on Map() size 17mm.
     */
    get lruSize(): number;
    /**
     * Sets the size of the LRU cache
     * @param {number} value - The size of the LRU cache. If set to 0, it will not use LRU cache. Default is 0. If you are using LRU then the limit is based on Map() size 17mm.
     */
    set lruSize(value: number);
    /**
     * Gets the check interval
     * @returns {number} - The interval to check for expired items. If set to 0, it will not check for expired items. Default is 0.
     */
    get checkInterval(): number;
    /**
     * Sets the check interval
     * @param {number} value - The interval to check for expired items. If set to 0, it will not check for expired items. Default is 0.
     */
    set checkInterval(value: number);
    /**
     * Gets the size of the cache
     * @returns {number} - The size of the cache
     */
    get size(): number;
    /**
     * Gets the number of hash stores
     * @returns {number} - The number of hash stores
     */
    get storeHashSize(): number;
    /**
     * Sets the number of hash stores. This will recreate the store and all data will be cleared
     * @param {number} value - The number of hash stores
     */
    set storeHashSize(value: number);
    /**
     * Gets the store hash algorithm
     * @returns {StoreHashAlgorithm | StoreHashAlgorithmFunction} - The store hash algorithm
     */
    get storeHashAlgorithm(): StoreHashAlgorithm | StoreHashAlgorithmFunction;
    /**
     * Sets the store hash algorithm. This will recreate the store and all data will be cleared
     * @param {StoreHashAlgorithm | StoreHashAlgorithmFunction} value - The store hash algorithm
     */
    set storeHashAlgorithm(value: StoreHashAlgorithm | StoreHashAlgorithmFunction);
    /**
     * Gets the keys
     * @returns {IterableIterator<string>} - The keys
     */
    get keys(): IterableIterator<string>;
    /**
     * Gets the items
     * @returns {IterableIterator<CacheableStoreItem>} - The items
     */
    get items(): IterableIterator<CacheableStoreItem>;
    /**
     * Gets the store
     * @returns {Array<Map<string, CacheableStoreItem>>} - The store
     */
    get store(): Array<Map<string, CacheableStoreItem>>;
    /**
     * Gets the value of the key
     * @param {string} key - The key to get the value
     * @returns {T | undefined} - The value of the key
     */
    get<T>(key: string): T | undefined;
    /**
     * Gets the values of the keys
     * @param {string[]} keys - The keys to get the values
     * @returns {T[]} - The values of the keys
     */
    getMany<T>(keys: string[]): T[];
    /**
     * Gets the raw value of the key
     * @param {string} key - The key to get the value
     * @returns {CacheableStoreItem | undefined} - The raw value of the key
     */
    getRaw(key: string): CacheableStoreItem | undefined;
    /**
     * Gets the raw values of the keys
     * @param {string[]} keys - The keys to get the values
     * @returns {CacheableStoreItem[]} - The raw values of the keys
     */
    getManyRaw(keys: string[]): Array<CacheableStoreItem | undefined>;
    /**
     * Sets the value of the key
     * @param {string} key - The key to set the value
     * @param {any} value - The value to set
     * @param {number|string|SetOptions} [ttl] - Time to Live - If you set a number it is miliseconds, if you set a string it is a human-readable.
     * If you want to set expire directly you can do that by setting the expire property in the SetOptions.
     * If you set undefined, it will use the default time-to-live. If both are undefined then it will not have a time-to-live.
     * @returns {void}
     */
    set(key: string, value: any, ttl?: number | string | SetOptions): void;
    /**
     * Sets the values of the keys
     * @param {CacheableItem[]} items - The items to set
     * @returns {void}
     */
    setMany(items: CacheableItem[]): void;
    /**
     * Checks if the key exists
     * @param {string} key - The key to check
     * @returns {boolean} - If true, the key exists. If false, the key does not exist.
     */
    has(key: string): boolean;
    /**
     * @function hasMany
     * @param {string[]} keys - The keys to check
     * @returns {boolean[]} - If true, the key exists. If false, the key does not exist.
     */
    hasMany(keys: string[]): boolean[];
    /**
     * Take will get the key and delete the entry from cache
     * @param {string} key - The key to take
     * @returns {T | undefined} - The value of the key
     */
    take<T>(key: string): T | undefined;
    /**
     * TakeMany will get the keys and delete the entries from cache
     * @param {string[]} keys - The keys to take
     * @returns {T[]} - The values of the keys
     */
    takeMany<T>(keys: string[]): T[];
    /**
     * Delete the key
     * @param {string} key - The key to delete
     * @returns {void}
     */
    delete(key: string): void;
    /**
     * Delete the keys
     * @param {string[]} keys - The keys to delete
     * @returns {void}
     */
    deleteMany(keys: string[]): void;
    /**
     * Clear the cache
     * @returns {void}
     */
    clear(): void;
    /**
     * Get the store based on the key (internal use)
     * @param {string} key - The key to get the store
     * @returns {CacheableHashStore} - The store
     */
    getStore(key: string): Map<string, CacheableStoreItem>;
    /**
     * Hash the key for which store to go to (internal use)
     * @param {string} key - The key to hash
     * Available algorithms are: SHA256, SHA1, MD5, and djb2Hash.
     * @returns {number} - The hashed key as a number
     */
    getKeyStoreHash(key: string): number;
    /**
     * Clone the value. This is for internal use
     * @param {any} value - The value to clone
     * @returns {any} - The cloned value
     */
    clone(value: any): any;
    /**
     * Add to the front of the LRU cache. This is for internal use
     * @param {string} key - The key to add to the front
     * @returns {void}
     */
    lruAddToFront(key: string): void;
    /**
     * Move to the front of the LRU cache. This is for internal use
     * @param {string} key - The key to move to the front
     * @returns {void}
     */
    lruMoveToFront(key: string): void;
    /**
     * Resize the LRU cache. This is for internal use.
     * @returns {void}
     */
    lruResize(): void;
    /**
     * Check for expiration. This is for internal use
     * @returns {void}
     */
    checkExpiration(): void;
    /**
     * Start the interval check. This is for internal use
     * @returns {void}
     */
    startIntervalCheck(): void;
    /**
     * Stop the interval check. This is for internal use
     * @returns {void}
     */
    stopIntervalCheck(): void;
    /**
     * Wrap the function for caching
     * @param {Function} function_ - The function to wrap
     * @param {Object} [options] - The options to wrap
     * @returns {Function} - The wrapped function
     */
    wrap<T, Arguments extends any[]>(function_: (...arguments_: Arguments) => T, options?: WrapFunctionOptions): (...arguments_: Arguments) => T;
    private isPrimitive;
    private setTtl;
    private hasExpired;
}

type KeyvCacheableMemoryOptions = CacheableMemoryOptions & {
    namespace?: string;
};
declare class KeyvCacheableMemory implements KeyvStoreAdapter {
    opts: CacheableMemoryOptions;
    private readonly _defaultCache;
    private readonly _nCache;
    private _namespace?;
    constructor(options?: KeyvCacheableMemoryOptions);
    get namespace(): string | undefined;
    set namespace(value: string | undefined);
    get store(): CacheableMemory;
    get<Value>(key: string): Promise<StoredData<Value> | undefined>;
    getMany<Value>(keys: string[]): Promise<Array<StoredData<Value | undefined>>>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    setMany(values: Array<{
        key: string;
        value: any;
        ttl?: number;
    }>): Promise<void>;
    delete(key: string): Promise<boolean>;
    deleteMany?(key: string[]): Promise<boolean>;
    clear(): Promise<void>;
    has?(key: string): Promise<boolean>;
    on(event: string, listener: (...arguments_: any[]) => void): this;
    getStore(namespace?: string): CacheableMemory;
}
/**
 * Creates a new Keyv instance with a new KeyvCacheableMemory store. This also removes the serialize/deserialize methods from the Keyv instance for optimization.
 * @param options
 * @returns
 */
declare function createKeyv(options?: KeyvCacheableMemoryOptions): Keyv;

declare const shorthandToMilliseconds: (shorthand?: string | number) => number | undefined;
declare const shorthandToTime: (shorthand?: string | number, fromDate?: Date) => number;

declare enum CacheableHooks {
    BEFORE_SET = "BEFORE_SET",
    AFTER_SET = "AFTER_SET",
    BEFORE_SET_MANY = "BEFORE_SET_MANY",
    AFTER_SET_MANY = "AFTER_SET_MANY",
    BEFORE_GET = "BEFORE_GET",
    AFTER_GET = "AFTER_GET",
    BEFORE_GET_MANY = "BEFORE_GET_MANY",
    AFTER_GET_MANY = "AFTER_GET_MANY",
    BEFORE_SECONDARY_SETS_PRIMARY = "BEFORE_SECONDARY_SETS_PRIMARY"
}
declare enum CacheableEvents {
    ERROR = "error"
}
type CacheableOptions = {
    /**
     * The primary store for the cacheable instance
     */
    primary?: Keyv | KeyvStoreAdapter;
    /**
     * The secondary store for the cacheable instance
     */
    secondary?: Keyv | KeyvStoreAdapter;
    /**
     * Whether to enable statistics for the cacheable instance
     */
    stats?: boolean;
    /**
     * Whether the secondary store is non-blocking mode. It is set to false by default.
     * If it is set to true then the secondary store will not block the primary store.
     */
    nonBlocking?: boolean;
    /**
     * The time-to-live for the cacheable instance and will be used as the default value.
     * can be a number in milliseconds or a human-readable format such as `1s` for 1 second or `1h` for 1 hour
     * or undefined if there is no time-to-live.
     */
    ttl?: number | string;
    /**
     * The namespace for the cacheable instance. It can be a string or a function that returns a string.
     */
    namespace?: string | (() => string);
    /**
     * The cacheId for the cacheable instance. This is primarily used for the wrap function to not have conflicts.
     * If it is not set then it will be a random string that is generated
     */
    cacheId?: string;
};
declare class Cacheable extends Hookified {
    private _primary;
    private _secondary;
    private _nonBlocking;
    private _ttl?;
    private readonly _stats;
    private _namespace?;
    private _cacheId;
    /**
     * Creates a new cacheable instance
     * @param {CacheableOptions} [options] The options for the cacheable instance
     */
    constructor(options?: CacheableOptions);
    /**
     * The namespace for the cacheable instance
     * @returns {string | (() => string) | undefined} The namespace for the cacheable instance
     */
    get namespace(): string | (() => string) | undefined;
    /**
     * Sets the namespace for the cacheable instance
     * @param {string | (() => string) | undefined} namespace The namespace for the cacheable instance
     * @returns {void}
     */
    set namespace(namespace: string | (() => string) | undefined);
    /**
     * The statistics for the cacheable instance
     * @returns {CacheableStats} The statistics for the cacheable instance
     */
    get stats(): CacheableStats;
    /**
     * The primary store for the cacheable instance
     * @returns {Keyv} The primary store for the cacheable instance
     */
    get primary(): Keyv;
    /**
     * Sets the primary store for the cacheable instance
     * @param {Keyv} primary The primary store for the cacheable instance
     */
    set primary(primary: Keyv);
    /**
     * The secondary store for the cacheable instance
     * @returns {Keyv | undefined} The secondary store for the cacheable instance
     */
    get secondary(): Keyv | undefined;
    /**
     * Sets the secondary store for the cacheable instance. If it is set to undefined then the secondary store is disabled.
     * @param {Keyv | undefined} secondary The secondary store for the cacheable instance
     * @returns {void}
     */
    set secondary(secondary: Keyv | undefined);
    /**
     * Gets whether the secondary store is non-blocking mode. It is set to false by default.
     * If it is set to true then the secondary store will not block the primary store.
     *
     * [Learn more about non-blocking mode](https://cacheable.org/docs/cacheable/#non-blocking-operations).
     *
     * @returns {boolean} Whether the cacheable instance is non-blocking
     */
    get nonBlocking(): boolean;
    /**
     * Sets whether the secondary store is non-blocking mode. It is set to false by default.
     * If it is set to true then the secondary store will not block the primary store.
     *
     * [Learn more about non-blocking mode](https://cacheable.org/docs/cacheable/#non-blocking-operations).
     *
     * @param {boolean} nonBlocking Whether the cacheable instance is non-blocking
     * @returns {void}
     */
    set nonBlocking(nonBlocking: boolean);
    /**
     * The time-to-live for the cacheable instance and will be used as the default value.
     * can be a number in milliseconds or a human-readable format such as `1s` for 1 second or `1h` for 1 hour
     * or undefined if there is no time-to-live.
     *
     * [Learn more about time-to-live](https://cacheable.org/docs/cacheable/#shorthand-for-time-to-live-ttl).
     *
     * @returns {number | string | undefined} The time-to-live for the cacheable instance in milliseconds, human-readable format or undefined
     * @example
     * ```typescript
     * const cacheable = new Cacheable({ ttl: '1h' });
     * console.log(cacheable.ttl); // 1h
     * ```
     */
    get ttl(): number | string | undefined;
    /**
     * Sets the time-to-live for the cacheable instance and will be used as the default value.
     * If you set a number it is miliseconds, if you set a string it is a human-readable
     * format such as `1s` for 1 second or `1h` for 1 hour. Setting undefined means that
     * there is no time-to-live.
     *
     * [Learn more about time-to-live](https://cacheable.org/docs/cacheable/#shorthand-for-time-to-live-ttl).
     *
     * @param {number | string | undefined} ttl The time-to-live for the cacheable instance
     * @example
     * ```typescript
     * const cacheable = new Cacheable();
     * cacheable.ttl = '1h'; // Set the time-to-live to 1 hour
     * ```
     * or setting the time-to-live in milliseconds
     * ```typescript
     * const cacheable = new Cacheable();
     * cacheable.ttl = 3600000; // Set the time-to-live to 1 hour
     * ```
     */
    set ttl(ttl: number | string | undefined);
    /**
     * The cacheId for the cacheable instance. This is primarily used for the wrap function to not have conflicts.
     * If it is not set then it will be a random string that is generated
     * @returns {string} The cacheId for the cacheable instance
     */
    get cacheId(): string;
    /**
     * Sets the cacheId for the cacheable instance. This is primarily used for the wrap function to not have conflicts.
     * If it is not set then it will be a random string that is generated
     * @param {string} cacheId The cacheId for the cacheable instance
     */
    set cacheId(cacheId: string);
    /**
     * Sets the primary store for the cacheable instance
     * @param {Keyv | KeyvStoreAdapter} primary The primary store for the cacheable instance
     * @returns {void}
     */
    setPrimary(primary: Keyv | KeyvStoreAdapter): void;
    /**
     * Sets the secondary store for the cacheable instance. If it is set to undefined then the secondary store is disabled.
     * @param {Keyv | KeyvStoreAdapter} secondary The secondary store for the cacheable instance
     * @returns {void}
     */
    setSecondary(secondary: Keyv | KeyvStoreAdapter): void;
    isKeyvInstance(keyv: any): boolean;
    getNameSpace(): string | undefined;
    /**
   * Retrieves an entry from the cache, with an optional “raw” mode.
   *
   * Checks the primary store first; if not found and a secondary store is configured,
   * it will fetch from the secondary, repopulate the primary, and return the result.
   *
   * @typeParam T - The expected type of the stored value.
   * @param {string} key - The cache key to retrieve.
   * @param {{ raw?: boolean }} [opts] - Options for retrieval.
   * @param {boolean} [opts.raw=false] - If `true`, returns the full raw data object
   *                                      (`StoredDataRaw<T>`); otherwise returns just the value.
   * @returns {Promise<T | StoredDataRaw<T> | undefined>}
   *   A promise that resolves to the cached value (or raw data) if found, or `undefined`.
   */
    get<T>(key: string, options?: {
        raw?: false;
    }): Promise<T | undefined>;
    get<T>(key: string, options: {
        raw: true;
    }): Promise<StoredDataRaw<T>>;
    /**
   * Retrieves multiple entries from the cache.
   * Checks the primary store for each key; if a key is missing and a secondary store is configured,
   * it will fetch from the secondary store, repopulate the primary store, and return the results.
   *
   * @typeParam T - The expected type of the stored values.
   * @param {string[]} keys - The cache keys to retrieve.
   * @param {{ raw?: boolean }} [options] - Options for retrieval.
   * @param {boolean} [options.raw=false] - When `true`, returns an array of raw data objects (`StoredDataRaw<T>`);
   *                                        when `false`, returns an array of unwrapped values (`T`) or `undefined` for misses.
   * @returns {Promise<Array<T | undefined>> | Promise<Array<StoredDataRaw<T>>>}
   *   A promise that resolves to:
   *   - `Array<T | undefined>` if `raw` is `false` (default).
   *   - `Array<StoredDataRaw<T>>` if `raw` is `true`.
   */
    getMany<T>(keys: string[], options?: {
        raw?: false;
    }): Promise<Array<T | undefined>>;
    getMany<T>(keys: string[], options: {
        raw: true;
    }): Promise<Array<StoredDataRaw<T>>>;
    /**
     * Sets the value of the key. If the secondary store is set then it will also set the value in the secondary store.
     * @param {string} key the key to set the value of
     * @param {T} value The value to set
     * @param {number | string} [ttl] set a number it is miliseconds, set a string it is a human-readable
     * format such as `1s` for 1 second or `1h` for 1 hour. Setting undefined means that it will use the default time-to-live.
     * @returns {boolean} Whether the value was set
     */
    set<T>(key: string, value: T, ttl?: number | string): Promise<boolean>;
    /**
     * Sets the values of the keys. If the secondary store is set then it will also set the values in the secondary store.
     * @param {CacheableItem[]} items The items to set
     * @returns {boolean} Whether the values were set
     */
    setMany(items: CacheableItem[]): Promise<boolean>;
    /**
     * Takes the value of the key and deletes the key. If the key does not exist then it will return undefined.
     * @param {string} key The key to take the value of
     * @returns {Promise<T | undefined>} The value of the key or undefined if the key does not exist
     */
    take<T>(key: string): Promise<T | undefined>;
    /**
     * Takes the values of the keys and deletes the keys. If the key does not exist then it will return undefined.
     * @param {string[]} keys The keys to take the values of
     * @returns {Promise<Array<T | undefined>>} The values of the keys or undefined if the key does not exist
     */
    takeMany<T>(keys: string[]): Promise<Array<T | undefined>>;
    /**
     * Checks if the key exists in the primary store. If it does not exist then it will check the secondary store.
     * @param {string} key The key to check
     * @returns {Promise<boolean>} Whether the key exists
     */
    has(key: string): Promise<boolean>;
    /**
     * Checks if the keys exist in the primary store. If it does not exist then it will check the secondary store.
     * @param {string[]} keys The keys to check
     * @returns {Promise<boolean[]>} Whether the keys exist
     */
    hasMany(keys: string[]): Promise<boolean[]>;
    /**
     * Deletes the key from the primary store. If the secondary store is set then it will also delete the key from the secondary store.
     * @param {string} key The key to delete
     * @returns {Promise<boolean>} Whether the key was deleted
     */
    delete(key: string): Promise<boolean>;
    /**
     * Deletes the keys from the primary store. If the secondary store is set then it will also delete the keys from the secondary store.
     * @param {string[]} keys The keys to delete
     * @returns {Promise<boolean>} Whether the keys were deleted
     */
    deleteMany(keys: string[]): Promise<boolean>;
    /**
     * Clears the primary store. If the secondary store is set then it will also clear the secondary store.
     * @returns {Promise<void>}
     */
    clear(): Promise<void>;
    /**
     * Disconnects the primary store. If the secondary store is set then it will also disconnect the secondary store.
     * @returns {Promise<void>}
     */
    disconnect(): Promise<void>;
    /**
     * Wraps a function with caching
     *
     * [Learn more about wrapping functions](https://cacheable.org/docs/cacheable/#wrap--memoization-for-sync-and-async-functions).
     * @param {Function} function_ The function to wrap
     * @param {WrapOptions} [options] The options for the wrap function
     * @returns {Function} The wrapped function
     */
    wrap<T, Arguments extends any[]>(function_: (...arguments_: Arguments) => T, options?: WrapFunctionOptions): (...arguments_: Arguments) => T;
    /**
     * Retrieves the value associated with the given key from the cache. If the key is not found,
     * invokes the provided function to calculate the value, stores it in the cache, and then returns it.
     *
     * @param {GetOrSetKey} key - The key to retrieve or set in the cache. This can also be a function that returns a string key.
     * If a function is provided, it will be called with the cache options to generate the key.
     * @param {() => Promise<T>} function_ - The asynchronous function that computes the value to be cached if the key does not exist.
     * @param {GetOrSetFunctionOptions} [options] - Optional settings for caching, such as the time to live (TTL) or whether to cache errors.
     * @return {Promise<T | undefined>} - A promise that resolves to the cached or newly computed value, or undefined if an error occurs and caching is not configured for errors.
     */
    getOrSet<T>(key: GetOrSetKey, function_: () => Promise<T>, options?: GetOrSetFunctionOptions): Promise<T | undefined>;
    /**
     * Will hash an object using the specified algorithm. The default algorithm is 'sha256'.
     * @param {any} object the object to hash
     * @param {string} algorithm the hash algorithm to use. The default is 'sha256'
     * @returns {string} the hash of the object
     */
    hash(object: any, algorithm?: string): string;
    private getSecondaryRawResults;
    private getManySecondaryRawResults;
    private deleteManyKeyv;
    private setManyKeyv;
    private hasManyKeyv;
    private setTtl;
}

export { Cacheable, CacheableEvents, CacheableHooks, type CacheableItem, CacheableMemory, type CacheableMemoryOptions, type CacheableOptions, CacheableStats, type GetOrSetFunctionOptions, type GetOrSetKey, type GetOrSetOptions, KeyvCacheableMemory, type WrapOptions, type WrapSyncOptions, createKeyv, getOrSet, shorthandToMilliseconds, shorthandToTime, wrap, wrapSync };
