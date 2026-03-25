/**
 * @module LRUCache
 */
declare const TYPE: unique symbol;
type Index = number & {
    [TYPE]: 'LRUCache Index';
};
type UintArray = Uint8Array | Uint16Array | Uint32Array;
type NumberArray = UintArray | number[];
declare class ZeroArray extends Array<number> {
    constructor(size: number);
}
type StackLike = Stack | Index[];
declare class Stack {
    #private;
    heap: NumberArray;
    length: number;
    static create(max: number): StackLike;
    constructor(max: number, HeapCls: {
        new (n: number): NumberArray;
    });
    push(n: Index): void;
    pop(): Index;
}
/**
 * Promise representing an in-progress {@link LRUCache#fetch} call
 */
export type BackgroundFetch<V> = Promise<V | undefined | void> & {
    __returned: BackgroundFetch<V> | undefined;
    __abortController: AbortController;
    __staleWhileFetching: V | undefined;
};
export declare namespace LRUCache {
    /**
     * An integer greater than 0, reflecting the calculated size of items
     */
    type Size = number;
    /**
     * Integer greater than 0, representing some number of milliseconds, or the
     * time at which a TTL started counting from.
     */
    type Milliseconds = number;
    /**
     * An integer greater than 0, reflecting a number of items
     */
    type Count = number;
    /**
     * The reason why an item was removed from the cache, passed
     * to the {@link Disposer} methods.
     */
    type DisposeReason = 'evict' | 'set' | 'delete';
    /**
     * A method called upon item removal, passed as the
     * {@link OptionsBase.dispose} and/or
     * {@link OptionsBase.disposeAfter} options.
     */
    type Disposer<K, V> = (value: V, key: K, reason: DisposeReason) => void;
    /**
     * A function that returns the effective calculated size
     * of an entry in the cache.
     */
    type SizeCalculator<K, V> = (value: V, key: K) => Size;
    /**
     * Options provided to the
     * {@link OptionsBase.fetchMethod} function.
     */
    interface FetcherOptions<K, V, FC = unknown> {
        signal: AbortSignal;
        options: FetcherFetchOptions<K, V, FC>;
        /**
         * Object provided in the {@link FetchOptions.context} option to
         * {@link LRUCache#fetch}
         */
        context: FC;
    }
    /**
     * Status object that may be passed to {@link LRUCache#fetch},
     * {@link LRUCache#get}, {@link LRUCache#set}, and {@link LRUCache#has}.
     */
    interface Status<V> {
        /**
         * The status of a set() operation.
         *
         * - add: the item was not found in the cache, and was added
         * - update: the item was in the cache, with the same value provided
         * - replace: the item was in the cache, and replaced
         * - miss: the item was not added to the cache for some reason
         */
        set?: 'add' | 'update' | 'replace' | 'miss';
        /**
         * the ttl stored for the item, or undefined if ttls are not used.
         */
        ttl?: Milliseconds;
        /**
         * the start time for the item, or undefined if ttls are not used.
         */
        start?: Milliseconds;
        /**
         * The timestamp used for TTL calculation
         */
        now?: Milliseconds;
        /**
         * the remaining ttl for the item, or undefined if ttls are not used.
         */
        remainingTTL?: Milliseconds;
        /**
         * The calculated size for the item, if sizes are used.
         */
        entrySize?: Size;
        /**
         * The total calculated size of the cache, if sizes are used.
         */
        totalCalculatedSize?: Size;
        /**
         * A flag indicating that the item was not stored, due to exceeding the
         * {@link OptionsBase.maxEntrySize}
         */
        maxEntrySizeExceeded?: true;
        /**
         * The old value, specified in the case of `set:'update'` or
         * `set:'replace'`
         */
        oldValue?: V;
        /**
         * The results of a {@link LRUCache#has} operation
         *
         * - hit: the item was found in the cache
         * - stale: the item was found in the cache, but is stale
         * - miss: the item was not found in the cache
         */
        has?: 'hit' | 'stale' | 'miss';
        /**
         * The status of a {@link LRUCache#fetch} operation.
         * Note that this can change as the underlying fetch() moves through
         * various states.
         *
         * - inflight: there is another fetch() for this key which is in process
         * - get: there is no fetchMethod, so {@link LRUCache#get} was called.
         * - miss: the item is not in cache, and will be fetched.
         * - hit: the item is in the cache, and was resolved immediately.
         * - stale: the item is in the cache, but stale.
         * - refresh: the item is in the cache, and not stale, but
         *   {@link FetchOptions.forceRefresh} was specified.
         */
        fetch?: 'get' | 'inflight' | 'miss' | 'hit' | 'stale' | 'refresh';
        /**
         * The {@link OptionsBase.fetchMethod} was called
         */
        fetchDispatched?: true;
        /**
         * The cached value was updated after a successful call to
         * {@link OptionsBase.fetchMethod}
         */
        fetchUpdated?: true;
        /**
         * The reason for a fetch() rejection.  Either the error raised by the
         * {@link OptionsBase.fetchMethod}, or the reason for an
         * AbortSignal.
         */
        fetchError?: Error;
        /**
         * The fetch received an abort signal
         */
        fetchAborted?: true;
        /**
         * The abort signal received was ignored, and the fetch was allowed to
         * continue.
         */
        fetchAbortIgnored?: true;
        /**
         * The fetchMethod promise resolved successfully
         */
        fetchResolved?: true;
        /**
         * The fetchMethod promise was rejected
         */
        fetchRejected?: true;
        /**
         * The status of a {@link LRUCache#get} operation.
         *
         * - fetching: The item is currently being fetched.  If a previous value
         *   is present and allowed, that will be returned.
         * - stale: The item is in the cache, and is stale.
         * - hit: the item is in the cache
         * - miss: the item is not in the cache
         */
        get?: 'stale' | 'hit' | 'miss';
        /**
         * A fetch or get operation returned a stale value.
         */
        returnedStale?: true;
    }
    /**
     * options which override the options set in the LRUCache constructor
     * when calling {@link LRUCache#fetch}.
     *
     * This is the union of {@link GetOptions} and {@link SetOptions}, plus
     * {@link OptionsBase.noDeleteOnFetchRejection},
     * {@link OptionsBase.allowStaleOnFetchRejection},
     * {@link FetchOptions.forceRefresh}, and
     * {@link OptionsBase.context}
     *
     * Any of these may be modified in the {@link OptionsBase.fetchMethod}
     * function, but the {@link GetOptions} fields will of course have no
     * effect, as the {@link LRUCache#get} call already happened by the time
     * the fetchMethod is called.
     */
    interface FetcherFetchOptions<K, V, FC = unknown> extends Pick<OptionsBase<K, V, FC>, 'allowStale' | 'updateAgeOnGet' | 'noDeleteOnStaleGet' | 'sizeCalculation' | 'ttl' | 'noDisposeOnSet' | 'noUpdateTTL' | 'noDeleteOnFetchRejection' | 'allowStaleOnFetchRejection' | 'ignoreFetchAbort' | 'allowStaleOnFetchAbort'> {
        status?: Status<V>;
        size?: Size;
    }
    /**
     * Options that may be passed to the {@link LRUCache#fetch} method.
     */
    interface FetchOptions<K, V, FC> extends FetcherFetchOptions<K, V, FC> {
        /**
         * Set to true to force a re-load of the existing data, even if it
         * is not yet stale.
         */
        forceRefresh?: boolean;
        /**
         * Context provided to the {@link OptionsBase.fetchMethod} as
         * the {@link FetcherOptions.context} param.
         *
         * If the FC type is specified as unknown (the default),
         * undefined or void, then this is optional.  Otherwise, it will
         * be required.
         */
        context?: FC;
        signal?: AbortSignal;
        status?: Status<V>;
    }
    /**
     * Options provided to {@link LRUCache#fetch} when the FC type is something
     * other than `unknown`, `undefined`, or `void`
     */
    interface FetchOptionsWithContext<K, V, FC> extends FetchOptions<K, V, FC> {
        context: FC;
    }
    /**
     * Options provided to {@link LRUCache#fetch} when the FC type is
     * `undefined` or `void`
     */
    interface FetchOptionsNoContext<K, V> extends FetchOptions<K, V, undefined> {
        context?: undefined;
    }
    /**
     * Options that may be passed to the {@link LRUCache#has} method.
     */
    interface HasOptions<K, V, FC> extends Pick<OptionsBase<K, V, FC>, 'updateAgeOnHas'> {
        status?: Status<V>;
    }
    /**
     * Options that may be passed to the {@link LRUCache#get} method.
     */
    interface GetOptions<K, V, FC> extends Pick<OptionsBase<K, V, FC>, 'allowStale' | 'updateAgeOnGet' | 'noDeleteOnStaleGet'> {
        status?: Status<V>;
    }
    /**
     * Options that may be passed to the {@link LRUCache#peek} method.
     */
    interface PeekOptions<K, V, FC> extends Pick<OptionsBase<K, V, FC>, 'allowStale'> {
    }
    /**
     * Options that may be passed to the {@link LRUCache#set} method.
     */
    interface SetOptions<K, V, FC> extends Pick<OptionsBase<K, V, FC>, 'sizeCalculation' | 'ttl' | 'noDisposeOnSet' | 'noUpdateTTL'> {
        /**
         * If size tracking is enabled, then setting an explicit size
         * in the {@link LRUCache#set} call will prevent calling the
         * {@link OptionsBase.sizeCalculation} function.
         */
        size?: Size;
        /**
         * If TTL tracking is enabled, then setting an explicit start
         * time in the {@link LRUCache#set} call will override the
         * default time from `performance.now()` or `Date.now()`.
         *
         * Note that it must be a valid value for whichever time-tracking
         * method is in use.
         */
        start?: Milliseconds;
        status?: Status<V>;
    }
    /**
     * The type signature for the {@link OptionsBase.fetchMethod} option.
     */
    type Fetcher<K, V, FC = unknown> = (key: K, staleValue: V | undefined, options: FetcherOptions<K, V, FC>) => Promise<V | void | undefined> | V | void | undefined;
    /**
     * Options which may be passed to the {@link LRUCache} constructor.
     *
     * Most of these may be overridden in the various options that use
     * them.
     *
     * Despite all being technically optional, the constructor requires that
     * a cache is at minimum limited by one or more of {@link OptionsBase.max},
     * {@link OptionsBase.ttl}, or {@link OptionsBase.maxSize}.
     *
     * If {@link OptionsBase.ttl} is used alone, then it is strongly advised
     * (and in fact required by the type definitions here) that the cache
     * also set {@link OptionsBase.ttlAutopurge}, to prevent potentially
     * unbounded storage.
     */
    interface OptionsBase<K, V, FC> {
        /**
         * The maximum number of items to store in the cache before evicting
         * old entries. This is read-only on the {@link LRUCache} instance,
         * and may not be overridden.
         *
         * If set, then storage space will be pre-allocated at construction
         * time, and the cache will perform significantly faster.
         *
         * Note that significantly fewer items may be stored, if
         * {@link OptionsBase.maxSize} and/or {@link OptionsBase.ttl} are also
         * set.
         */
        max?: Count;
        /**
         * Max time in milliseconds for items to live in cache before they are
         * considered stale.  Note that stale items are NOT preemptively removed
         * by default, and MAY live in the cache long after they have expired.
         *
         * Also, as this cache is optimized for LRU/MRU operations, some of
         * the staleness/TTL checks will reduce performance, as they will incur
         * overhead by deleting items.
         *
         * Must be an integer number of ms. If set to 0, this indicates "no TTL"
         *
         * @default 0
         */
        ttl?: Milliseconds;
        /**
         * Minimum amount of time in ms in which to check for staleness.
         * Defaults to 1, which means that the current time is checked
         * at most once per millisecond.
         *
         * Set to 0 to check the current time every time staleness is tested.
         * (This reduces performance, and is theoretically unnecessary.)
         *
         * Setting this to a higher value will improve performance somewhat
         * while using ttl tracking, albeit at the expense of keeping stale
         * items around a bit longer than their TTLs would indicate.
         *
         * @default 1
         */
        ttlResolution?: Milliseconds;
        /**
         * Preemptively remove stale items from the cache.
         * Note that this may significantly degrade performance,
         * especially if the cache is storing a large number of items.
         * It is almost always best to just leave the stale items in
         * the cache, and let them fall out as new items are added.
         *
         * Note that this means that {@link OptionsBase.allowStale} is a bit
         * pointless, as stale items will be deleted almost as soon as they
         * expire.
         *
         * @default false
         */
        ttlAutopurge?: boolean;
        /**
         * Update the age of items on {@link LRUCache#get}, renewing their TTL
         *
         * Has no effect if {@link OptionsBase.ttl} is not set.
         *
         * @default false
         */
        updateAgeOnGet?: boolean;
        /**
         * Update the age of items on {@link LRUCache#has}, renewing their TTL
         *
         * Has no effect if {@link OptionsBase.ttl} is not set.
         *
         * @default false
         */
        updateAgeOnHas?: boolean;
        /**
         * Allow {@link LRUCache#get} and {@link LRUCache#fetch} calls to return
         * stale data, if available.
         */
        allowStale?: boolean;
        /**
         * Function that is called on items when they are dropped from the cache.
         * This can be handy if you want to close file descriptors or do other
         * cleanup tasks when items are no longer accessible. Called with `key,
         * value`.  It's called before actually removing the item from the
         * internal cache, so it is *NOT* safe to re-add them.
         *
         * Use {@link OptionsBase.disposeAfter} if you wish to dispose items after
         * they have been full removed, when it is safe to add them back to the
         * cache.
         */
        dispose?: Disposer<K, V>;
        /**
         * The same as {@link OptionsBase.dispose}, but called *after* the entry
         * is completely removed and the cache is once again in a clean state.
         * It is safe to add an item right back into the cache at this point.
         * However, note that it is *very* easy to inadvertently create infinite
         * recursion this way.
         */
        disposeAfter?: Disposer<K, V>;
        /**
         * Set to true to suppress calling the
         * {@link OptionsBase.dispose} function if the entry key is
         * still accessible within the cache.
         * This may be overridden by passing an options object to
         * {@link LRUCache#set}.
         */
        noDisposeOnSet?: boolean;
        /**
         * Boolean flag to tell the cache to not update the TTL when
         * setting a new value for an existing key (ie, when updating a value
         * rather than inserting a new value).  Note that the TTL value is
         * _always_ set (if provided) when adding a new entry into the cache.
         *
         * Has no effect if a {@link OptionsBase.ttl} is not set.
         */
        noUpdateTTL?: boolean;
        /**
         * If you wish to track item size, you must provide a maxSize
         * note that we still will only keep up to max *actual items*,
         * if max is set, so size tracking may cause fewer than max items
         * to be stored.  At the extreme, a single item of maxSize size
         * will cause everything else in the cache to be dropped when it
         * is added.  Use with caution!
         *
         * Note also that size tracking can negatively impact performance,
         * though for most cases, only minimally.
         */
        maxSize?: Size;
        /**
         * The maximum allowed size for any single item in the cache.
         *
         * If a larger item is passed to {@link LRUCache#set} or returned by a
         * {@link OptionsBase.fetchMethod}, then it will not be stored in the
         * cache.
         */
        maxEntrySize?: Size;
        /**
         * A function that returns a number indicating the item's size.
         *
         * If not provided, and {@link OptionsBase.maxSize} or
         * {@link OptionsBase.maxEntrySize} are set, then all
         * {@link LRUCache#set} calls **must** provide an explicit
         * {@link SetOptions.size} or sizeCalculation param.
         */
        sizeCalculation?: SizeCalculator<K, V>;
        /**
         * Method that provides the implementation for {@link LRUCache#fetch}
         */
        fetchMethod?: Fetcher<K, V, FC>;
        /**
         * Set to true to suppress the deletion of stale data when a
         * {@link OptionsBase.fetchMethod} returns a rejected promise.
         */
        noDeleteOnFetchRejection?: boolean;
        /**
         * Do not delete stale items when they are retrieved with
         * {@link LRUCache#get}.
         *
         * Note that the `get` return value will still be `undefined`
         * unless {@link OptionsBase.allowStale} is true.
         */
        noDeleteOnStaleGet?: boolean;
        /**
         * Set to true to allow returning stale data when a
         * {@link OptionsBase.fetchMethod} throws an error or returns a rejected
         * promise.
         *
         * This differs from using {@link OptionsBase.allowStale} in that stale
         * data will ONLY be returned in the case that the
         * {@link LRUCache#fetch} fails, not any other times.
         */
        allowStaleOnFetchRejection?: boolean;
        /**
         * Set to true to return a stale value from the cache when the
         * `AbortSignal` passed to the {@link OptionsBase.fetchMethod} dispatches an `'abort'`
         * event, whether user-triggered, or due to internal cache behavior.
         *
         * Unless {@link OptionsBase.ignoreFetchAbort} is also set, the underlying
         * {@link OptionsBase.fetchMethod} will still be considered canceled, and
         * any value it returns will be ignored and not cached.
         *
         * Caveat: since fetches are aborted when a new value is explicitly
         * set in the cache, this can lead to fetch returning a stale value,
         * since that was the fallback value _at the moment the `fetch()` was
         * initiated_, even though the new updated value is now present in
         * the cache.
         *
         * For example:
         *
         * ```ts
         * const cache = new LRUCache<string, any>({
         *   ttl: 100,
         *   fetchMethod: async (url, oldValue, { signal }) =>  {
         *     const res = await fetch(url, { signal })
         *     return await res.json()
         *   }
         * })
         * cache.set('https://example.com/', { some: 'data' })
         * // 100ms go by...
         * const result = cache.fetch('https://example.com/')
         * cache.set('https://example.com/', { other: 'thing' })
         * console.log(await result) // { some: 'data' }
         * console.log(cache.get('https://example.com/')) // { other: 'thing' }
         * ```
         */
        allowStaleOnFetchAbort?: boolean;
        /**
         * Set to true to ignore the `abort` event emitted by the `AbortSignal`
         * object passed to {@link OptionsBase.fetchMethod}, and still cache the
         * resulting resolution value, as long as it is not `undefined`.
         *
         * When used on its own, this means aborted {@link LRUCache#fetch} calls are not
         * immediately resolved or rejected when they are aborted, and instead
         * take the full time to await.
         *
         * When used with {@link OptionsBase.allowStaleOnFetchAbort}, aborted
         * {@link LRUCache#fetch} calls will resolve immediately to their stale
         * cached value or `undefined`, and will continue to process and eventually
         * update the cache when they resolve, as long as the resulting value is
         * not `undefined`, thus supporting a "return stale on timeout while
         * refreshing" mechanism by passing `AbortSignal.timeout(n)` as the signal.
         *
         * **Note**: regardless of this setting, an `abort` event _is still
         * emitted on the `AbortSignal` object_, so may result in invalid results
         * when passed to other underlying APIs that use AbortSignals.
         *
         * This may be overridden in the {@link OptionsBase.fetchMethod} or the
         * call to {@link LRUCache#fetch}.
         */
        ignoreFetchAbort?: boolean;
    }
    interface OptionsMaxLimit<K, V, FC> extends OptionsBase<K, V, FC> {
        max: Count;
    }
    interface OptionsTTLLimit<K, V, FC> extends OptionsBase<K, V, FC> {
        ttl: Milliseconds;
        ttlAutopurge: boolean;
    }
    interface OptionsSizeLimit<K, V, FC> extends OptionsBase<K, V, FC> {
        maxSize: Size;
    }
    /**
     * The valid safe options for the {@link LRUCache} constructor
     */
    type Options<K, V, FC> = OptionsMaxLimit<K, V, FC> | OptionsSizeLimit<K, V, FC> | OptionsTTLLimit<K, V, FC>;
    /**
     * Entry objects used by {@link LRUCache#load} and {@link LRUCache#dump}
     */
    interface Entry<V> {
        value: V;
        ttl?: Milliseconds;
        size?: Size;
        start?: Milliseconds;
    }
}
/**
 * Default export, the thing you're using this module to get.
 *
 * All properties from the options object (with the exception of
 * {@link OptionsBase.max} and {@link OptionsBase.maxSize}) are added as
 * normal public members. (`max` and `maxBase` are read-only getters.)
 * Changing any of these will alter the defaults for subsequent method calls,
 * but is otherwise safe.
 */
export declare class LRUCache<K extends {}, V extends {}, FC = unknown> {
    #private;
    /**
     * {@link LRUCache.OptionsBase.ttl}
     */
    ttl: LRUCache.Milliseconds;
    /**
     * {@link LRUCache.OptionsBase.ttlResolution}
     */
    ttlResolution: LRUCache.Milliseconds;
    /**
     * {@link LRUCache.OptionsBase.ttlAutopurge}
     */
    ttlAutopurge: boolean;
    /**
     * {@link LRUCache.OptionsBase.updateAgeOnGet}
     */
    updateAgeOnGet: boolean;
    /**
     * {@link LRUCache.OptionsBase.updateAgeOnHas}
     */
    updateAgeOnHas: boolean;
    /**
     * {@link LRUCache.OptionsBase.allowStale}
     */
    allowStale: boolean;
    /**
     * {@link LRUCache.OptionsBase.noDisposeOnSet}
     */
    noDisposeOnSet: boolean;
    /**
     * {@link LRUCache.OptionsBase.noUpdateTTL}
     */
    noUpdateTTL: boolean;
    /**
     * {@link LRUCache.OptionsBase.maxEntrySize}
     */
    maxEntrySize: LRUCache.Size;
    /**
     * {@link LRUCache.OptionsBase.sizeCalculation}
     */
    sizeCalculation?: LRUCache.SizeCalculator<K, V>;
    /**
     * {@link LRUCache.OptionsBase.noDeleteOnFetchRejection}
     */
    noDeleteOnFetchRejection: boolean;
    /**
     * {@link LRUCache.OptionsBase.noDeleteOnStaleGet}
     */
    noDeleteOnStaleGet: boolean;
    /**
     * {@link LRUCache.OptionsBase.allowStaleOnFetchAbort}
     */
    allowStaleOnFetchAbort: boolean;
    /**
     * {@link LRUCache.OptionsBase.allowStaleOnFetchRejection}
     */
    allowStaleOnFetchRejection: boolean;
    /**
     * {@link LRUCache.OptionsBase.ignoreFetchAbort}
     */
    ignoreFetchAbort: boolean;
    /**
     * Do not call this method unless you need to inspect the
     * inner workings of the cache.  If anything returned by this
     * object is modified in any way, strange breakage may occur.
     *
     * These fields are private for a reason!
     *
     * @internal
     */
    static unsafeExposeInternals<K extends {}, V extends {}, FC extends unknown = unknown>(c: LRUCache<K, V, FC>): {
        starts: ZeroArray | undefined;
        ttls: ZeroArray | undefined;
        sizes: ZeroArray | undefined;
        keyMap: Map<K, number>;
        keyList: (K | undefined)[];
        valList: (V | BackgroundFetch<V> | undefined)[];
        next: NumberArray;
        prev: NumberArray;
        readonly head: Index;
        readonly tail: Index;
        free: StackLike;
        isBackgroundFetch: (p: any) => boolean;
        backgroundFetch: (k: K, index: number | undefined, options: LRUCache.FetchOptions<K, V, FC>, context: any) => BackgroundFetch<V>;
        moveToTail: (index: number) => void;
        indexes: (options?: {
            allowStale: boolean;
        }) => Generator<Index, void, unknown>;
        rindexes: (options?: {
            allowStale: boolean;
        }) => Generator<Index, void, unknown>;
        isStale: (index: number | undefined) => boolean;
    };
    /**
     * {@link LRUCache.OptionsBase.max} (read-only)
     */
    get max(): LRUCache.Count;
    /**
     * {@link LRUCache.OptionsBase.maxSize} (read-only)
     */
    get maxSize(): LRUCache.Count;
    /**
     * The total computed size of items in the cache (read-only)
     */
    get calculatedSize(): LRUCache.Size;
    /**
     * The number of items stored in the cache (read-only)
     */
    get size(): LRUCache.Count;
    /**
     * {@link LRUCache.OptionsBase.fetchMethod} (read-only)
     */
    get fetchMethod(): LRUCache.Fetcher<K, V, FC> | undefined;
    /**
     * {@link LRUCache.OptionsBase.dispose} (read-only)
     */
    get dispose(): LRUCache.Disposer<K, V> | undefined;
    /**
     * {@link LRUCache.OptionsBase.disposeAfter} (read-only)
     */
    get disposeAfter(): LRUCache.Disposer<K, V> | undefined;
    constructor(options: LRUCache.Options<K, V, FC> | LRUCache<K, V, FC>);
    /**
     * Return the remaining TTL time for a given entry key
     */
    getRemainingTTL(key: K): number;
    /**
     * Return a generator yielding `[key, value]` pairs,
     * in order from most recently used to least recently used.
     */
    entries(): Generator<(K | V | BackgroundFetch<V> | undefined)[], void, unknown>;
    /**
     * Inverse order version of {@link LRUCache.entries}
     *
     * Return a generator yielding `[key, value]` pairs,
     * in order from least recently used to most recently used.
     */
    rentries(): Generator<(K | V | BackgroundFetch<V> | undefined)[], void, unknown>;
    /**
     * Return a generator yielding the keys in the cache,
     * in order from most recently used to least recently used.
     */
    keys(): Generator<K, void, unknown>;
    /**
     * Inverse order version of {@link LRUCache.keys}
     *
     * Return a generator yielding the keys in the cache,
     * in order from least recently used to most recently used.
     */
    rkeys(): Generator<K, void, unknown>;
    /**
     * Return a generator yielding the values in the cache,
     * in order from most recently used to least recently used.
     */
    values(): Generator<V | BackgroundFetch<V> | undefined, void, unknown>;
    /**
     * Inverse order version of {@link LRUCache.values}
     *
     * Return a generator yielding the values in the cache,
     * in order from least recently used to most recently used.
     */
    rvalues(): Generator<V | BackgroundFetch<V> | undefined, void, unknown>;
    /**
     * Iterating over the cache itself yields the same results as
     * {@link LRUCache.entries}
     */
    [Symbol.iterator](): Generator<(K | V | BackgroundFetch<V> | undefined)[], void, unknown>;
    /**
     * Find a value for which the supplied fn method returns a truthy value,
     * similar to Array.find().  fn is called as fn(value, key, cache).
     */
    find(fn: (v: V, k: K, self: LRUCache<K, V, FC>) => boolean, getOptions?: LRUCache.GetOptions<K, V, FC>): V | undefined;
    /**
     * Call the supplied function on each item in the cache, in order from
     * most recently used to least recently used.  fn is called as
     * fn(value, key, cache).  Does not update age or recenty of use.
     * Does not iterate over stale values.
     */
    forEach(fn: (v: V, k: K, self: LRUCache<K, V, FC>) => any, thisp?: any): void;
    /**
     * The same as {@link LRUCache.forEach} but items are iterated over in
     * reverse order.  (ie, less recently used items are iterated over first.)
     */
    rforEach(fn: (v: V, k: K, self: LRUCache<K, V, FC>) => any, thisp?: any): void;
    /**
     * Delete any stale entries. Returns true if anything was removed,
     * false otherwise.
     */
    purgeStale(): boolean;
    /**
     * Return an array of [key, {@link LRUCache.Entry}] tuples which can be
     * passed to cache.load()
     */
    dump(): [K, LRUCache.Entry<V>][];
    /**
     * Reset the cache and load in the items in entries in the order listed.
     * Note that the shape of the resulting cache may be different if the
     * same options are not used in both caches.
     */
    load(arr: [K, LRUCache.Entry<V>][]): void;
    /**
     * Add a value to the cache.
     *
     * Note: if `undefined` is specified as a value, this is an alias for
     * {@link LRUCache#delete}
     */
    set(k: K, v: V | BackgroundFetch<V> | undefined, setOptions?: LRUCache.SetOptions<K, V, FC>): this;
    /**
     * Evict the least recently used item, returning its value or
     * `undefined` if cache is empty.
     */
    pop(): V | undefined;
    /**
     * Check if a key is in the cache, without updating the recency of use.
     * Will return false if the item is stale, even though it is technically
     * in the cache.
     *
     * Will not update item age unless
     * {@link LRUCache.OptionsBase.updateAgeOnHas} is set.
     */
    has(k: K, hasOptions?: LRUCache.HasOptions<K, V, FC>): boolean;
    /**
     * Like {@link LRUCache#get} but doesn't update recency or delete stale
     * items.
     *
     * Returns `undefined` if the item is stale, unless
     * {@link LRUCache.OptionsBase.allowStale} is set.
     */
    peek(k: K, peekOptions?: LRUCache.PeekOptions<K, V, FC>): V | undefined;
    /**
     * Make an asynchronous cached fetch using the
     * {@link LRUCache.OptionsBase.fetchMethod} function.
     *
     * If multiple fetches for the same key are issued, then they will all be
     * coalesced into a single call to fetchMethod.
     *
     * Note that this means that handling options such as
     * {@link LRUCache.OptionsBase.allowStaleOnFetchAbort},
     * {@link LRUCache.FetchOptions.signal},
     * and {@link LRUCache.OptionsBase.allowStaleOnFetchRejection} will be
     * determined by the FIRST fetch() call for a given key.
     *
     * This is a known (fixable) shortcoming which will be addresed on when
     * someone complains about it, as the fix would involve added complexity and
     * may not be worth the costs for this edge case.
     */
    fetch(k: K, fetchOptions: unknown extends FC ? LRUCache.FetchOptions<K, V, FC> : FC extends undefined | void ? LRUCache.FetchOptionsNoContext<K, V> : LRUCache.FetchOptionsWithContext<K, V, FC>): Promise<void | V>;
    fetch(k: unknown extends FC ? K : FC extends undefined | void ? K : never, fetchOptions?: unknown extends FC ? LRUCache.FetchOptions<K, V, FC> : FC extends undefined | void ? LRUCache.FetchOptionsNoContext<K, V> : never): Promise<void | V>;
    /**
     * Return a value from the cache. Will update the recency of the cache
     * entry found.
     *
     * If the key is not found, get() will return `undefined`.
     */
    get(k: K, getOptions?: LRUCache.GetOptions<K, V, FC>): V | undefined;
    /**
     * Deletes a key out of the cache.
     * Returns true if the key was deleted, false otherwise.
     */
    delete(k: K): boolean;
    /**
     * Clear the cache entirely, throwing away all values.
     */
    clear(): void;
}
export {};
//# sourceMappingURL=index.d.ts.map