# lru-cache

A cache object that deletes the least-recently-used items.

Specify a max number of the most recently used items that you
want to keep, and this cache will keep that many of the most
recently accessed items.

This is not primarily a TTL cache, and does not make strong TTL
guarantees. There is no preemptive pruning of expired items by
default, but you _may_ set a TTL on the cache or on a single
`set`. If you do so, it will treat expired items as missing, and
delete them when fetched. If you are more interested in TTL
caching than LRU caching, check out
[@isaacs/ttlcache](http://npm.im/@isaacs/ttlcache).

As of version 7, this is one of the most performant LRU
implementations available in JavaScript, and supports a wide
diversity of use cases. However, note that using some of the
features will necessarily impact performance, by causing the
cache to have to do more work. See the "Performance" section
below.

## Installation

```bash
npm install lru-cache --save
```

## Usage

```js
// hybrid module, either works
import { LRUCache } from 'lru-cache'
// or:
const { LRUCache } = require('lru-cache')
// or in minified form for web browsers:
import { LRUCache } from 'http://unpkg.com/lru-cache@9/dist/mjs/index.min.mjs'

// At least one of 'max', 'ttl', or 'maxSize' is required, to prevent
// unsafe unbounded storage.
//
// In most cases, it's best to specify a max for performance, so all
// the required memory allocation is done up-front.
//
// All the other options are optional, see the sections below for
// documentation on what each one does.  Most of them can be
// overridden for specific items in get()/set()
const options = {
  max: 500,

  // for use with tracking overall storage size
  maxSize: 5000,
  sizeCalculation: (value, key) => {
    return 1
  },

  // for use when you need to clean up something when objects
  // are evicted from the cache
  dispose: (value, key) => {
    freeFromMemoryOrWhatever(value)
  },

  // how long to live in ms
  ttl: 1000 * 60 * 5,

  // return stale items before removing from cache?
  allowStale: false,

  updateAgeOnGet: false,
  updateAgeOnHas: false,

  // async method to use for cache.fetch(), for
  // stale-while-revalidate type of behavior
  fetchMethod: async (
    key,
    staleValue,
    { options, signal, context }
  ) => {},
}

const cache = new LRUCache(options)

cache.set('key', 'value')
cache.get('key') // "value"

// non-string keys ARE fully supported
// but note that it must be THE SAME object, not
// just a JSON-equivalent object.
var someObject = { a: 1 }
cache.set(someObject, 'a value')
// Object keys are not toString()-ed
cache.set('[object Object]', 'a different value')
assert.equal(cache.get(someObject), 'a value')
// A similar object with same keys/values won't work,
// because it's a different object identity
assert.equal(cache.get({ a: 1 }), undefined)

cache.clear() // empty the cache
```

If you put more stuff in the cache, then less recently used items
will fall out. That's what an LRU cache is.

## `class LRUCache<K, V, FC = unknown>(options)`

Create a new `LRUCache` object.

When using TypeScript, set the `K` and `V` types to the `key` and
`value` types, respectively.

The `FC` ("fetch context") generic type defaults to `unknown`.
If set to a value other than `void` or `undefined`, then any
calls to `cache.fetch()` _must_ provide a `context` option
matching the `FC` type. If `FC` is set to `void` or `undefined`,
then `cache.fetch()` _must not_ provide a `context` option. See
the documentation on `async fetch()` below.

## Options

All options are available on the LRUCache instance, making it
safe to pass an LRUCache instance as the options argument to make
another empty cache of the same type.

Some options are marked read-only because changing them after
instantiation is not safe. Changing any of the other options
will of course only have an effect on subsequent method calls.

### `max` (read only)

The maximum number of items that remain in the cache (assuming no
TTL pruning or explicit deletions). Note that fewer items may be
stored if size calculation is used, and `maxSize` is exceeded.
This must be a positive finite intger.

At least one of `max`, `maxSize`, or `TTL` is required. This
must be a positive integer if set.

**It is strongly recommended to set a `max` to prevent unbounded
growth of the cache.** See "Storage Bounds Safety" below.

### `maxSize` (read only)

Set to a positive integer to track the sizes of items added to
the cache, and automatically evict items in order to stay below
this size. Note that this may result in fewer than `max` items
being stored.

Attempting to add an item to the cache whose calculated size is
greater that this amount will be a no-op. The item will not be
cached, and no other items will be evicted.

Optional, must be a positive integer if provided.

Sets `maxEntrySize` to the same value, unless a different value
is provided for `maxEntrySize`.

At least one of `max`, `maxSize`, or `TTL` is required. This
must be a positive integer if set.

Even if size tracking is enabled, **it is strongly recommended to
set a `max` to prevent unbounded growth of the cache.** See
"Storage Bounds Safety" below.

### `maxEntrySize`

Set to a positive integer to track the sizes of items added to
the cache, and prevent caching any item over a given size.
Attempting to add an item whose calculated size is greater than
this amount will be a no-op. The item will not be cached, and no
other items will be evicted.

Optional, must be a positive integer if provided. Defaults to
the value of `maxSize` if provided.

### `sizeCalculation`

Function used to calculate the size of stored items. If you're
storing strings or buffers, then you probably want to do
something like `n => n.length`. The item is passed as the first
argument, and the key is passed as the second argument.

This may be overridden by passing an options object to
`cache.set()`.

Requires `maxSize` to be set.

If the `size` (or return value of `sizeCalculation`) for a given
entry is greater than `maxEntrySize`, then the item will not be
added to the cache.

### `fetchMethod` (read only)

Function that is used to make background asynchronous fetches.
Called with `fetchMethod(key, staleValue, { signal, options,
context })`. May return a Promise.

If `fetchMethod` is not provided, then `cache.fetch(key)` is
equivalent to `Promise.resolve(cache.get(key))`.

If at any time, `signal.aborted` is set to `true`, or if the
`signal.onabort` method is called, or if it emits an `'abort'`
event which you can listen to with `addEventListener`, then that
means that the fetch should be abandoned. This may be passed
along to async functions aware of AbortController/AbortSignal
behavior.

The `fetchMethod` should **only** return `undefined` or a Promise
resolving to `undefined` if the AbortController signaled an
`abort` event. In all other cases, it should return or resolve
to a value suitable for adding to the cache.

The `options` object is a union of the options that may be
provided to `set()` and `get()`. If they are modified, then that
will result in modifying the settings to `cache.set()` when the
value is resolved, and in the case of `noDeleteOnFetchRejection`
and `allowStaleOnFetchRejection`, the handling of `fetchMethod`
failures.

For example, a DNS cache may update the TTL based on the value
returned from a remote DNS server by changing `options.ttl` in
the `fetchMethod`.

### `noDeleteOnFetchRejection`

If a `fetchMethod` throws an error or returns a rejected promise,
then by default, any existing stale value will be removed from
the cache.

If `noDeleteOnFetchRejection` is set to `true`, then this
behavior is suppressed, and the stale value remains in the cache
in the case of a rejected `fetchMethod`.

This is important in cases where a `fetchMethod` is _only_ called
as a background update while the stale value is returned, when
`allowStale` is used.

This is implicitly in effect when `allowStaleOnFetchRejection` is
set.

This may be set in calls to `fetch()`, or defaulted on the
constructor, or overridden by modifying the options object in the
`fetchMethod`.

### `allowStaleOnFetchRejection`

Set to true to return a stale value from the cache when a
`fetchMethod` throws an error or returns a rejected Promise.

If a `fetchMethod` fails, and there is no stale value available,
the `fetch()` will resolve to `undefined`. Ie, all `fetchMethod`
errors are suppressed.

Implies `noDeleteOnFetchRejection`.

This may be set in calls to `fetch()`, or defaulted on the
constructor, or overridden by modifying the options object in the
`fetchMethod`.

### `allowStaleOnFetchAbort`

Set to true to return a stale value from the cache when the
`AbortSignal` passed to the `fetchMethod` dispatches an `'abort'`
event, whether user-triggered, or due to internal cache behavior.

Unless `ignoreFetchAbort` is also set, the underlying
`fetchMethod` will still be considered canceled, and any value
it returns will be ignored and not cached.

Caveat: since fetches are aborted when a new value is explicitly
set in the cache, this can lead to fetch returning a stale value,
since that was the fallback value _at the moment the `fetch()` was
initiated_, even though the new updated value is now present in
the cache.

For example:

```ts
const cache = new LRUCache<string, any>({
  ttl: 100,
  fetchMethod: async (url, oldValue, { signal }) => {
    const res = await fetch(url, { signal })
    return await res.json()
  },
})
cache.set('https://example.com/', { some: 'data' })
// 100ms go by...
const result = cache.fetch('https://example.com/')
cache.set('https://example.com/', { other: 'thing' })
console.log(await result) // { some: 'data' }
console.log(cache.get('https://example.com/')) // { other: 'thing' }
```

### `ignoreFetchAbort`

Set to true to ignore the `abort` event emitted by the
`AbortSignal` object passed to `fetchMethod`, and still cache the
resulting resolution value, as long as it is not `undefined`.

When used on its own, this means aborted `fetch()` calls are not
immediately resolved or rejected when they are aborted, and
instead take the full time to await.

When used with `allowStaleOnFetchAbort`, aborted `fetch()` calls
will resolve immediately to their stale cached value or
`undefined`, and will continue to process and eventually update
the cache when they resolve, as long as the resulting value is
not `undefined`, thus supporting a "return stale on timeout while
refreshing" mechanism by passing `AbortSignal.timeout(n)` as the
signal.

For example:

```js
const c = new LRUCache({
  ttl: 100,
  ignoreFetchAbort: true,
  allowStaleOnFetchAbort: true,
  fetchMethod: async (key, oldValue, { signal }) => {
    // note: do NOT pass the signal to fetch()!
    // let's say this fetch can take a long time.
    const res = await fetch(`https://slow-backend-server/${key}`)
    return await res.json()
  },
})

// this will return the stale value after 100ms, while still
// updating in the background for next time.
const val = await c.fetch('key', { signal: AbortSignal.timeout(100) })
```

**Note**: regardless of this setting, an `abort` event _is still
emitted on the `AbortSignal` object_, so may result in invalid
results when passed to other underlying APIs that use
AbortSignals.

This may be overridden on the `fetch()` call or in the
`fetchMethod` itself.

### `dispose` (read only)

Function that is called on items when they are dropped from the
cache, as `this.dispose(value, key, reason)`.

This can be handy if you want to close file descriptors or do
other cleanup tasks when items are no longer stored in the cache.

**NOTE**: It is called _before_ the item has been fully removed
from the cache, so if you want to put it right back in, you need
to wait until the next tick. If you try to add it back in during
the `dispose()` function call, it will break things in subtle and
weird ways.

Unlike several other options, this may _not_ be overridden by
passing an option to `set()`, for performance reasons.

The `reason` will be one of the following strings, corresponding
to the reason for the item's deletion:

- `evict` Item was evicted to make space for a new addition
- `set` Item was overwritten by a new value
- `delete` Item was removed by explicit `cache.delete(key)` or by
  calling `cache.clear()`, which deletes everything.

The `dispose()` method is _not_ called for canceled calls to
`fetchMethod()`. If you wish to handle evictions, overwrites,
and deletes of in-flight asynchronous fetches, you must use the
`AbortSignal` provided.

Optional, must be a function.

### `disposeAfter` (read only)

The same as `dispose`, but called _after_ the entry is completely
removed and the cache is once again in a clean state.

It is safe to add an item right back into the cache at this
point. However, note that it is _very_ easy to inadvertently
create infinite recursion in this way.

The `disposeAfter()` method is _not_ called for canceled calls to
`fetchMethod()`. If you wish to handle evictions, overwrites,
and deletes of in-flight asynchronous fetches, you must use the
`AbortSignal` provided.

### `noDisposeOnSet`

Set to `true` to suppress calling the `dispose()` function if the
entry key is still accessible within the cache.

This may be overridden by passing an options object to
`cache.set()`.

Boolean, default `false`. Only relevant if `dispose` or
`disposeAfter` options are set.

### `ttl`

Max time to live for items before they are considered stale.
Note that stale items are NOT preemptively removed by default,
and MAY live in the cache, contributing to its LRU max, long
after they have expired.

Also, as this cache is optimized for LRU/MRU operations, some of
the staleness/TTL checks will reduce performance.

This is not primarily a TTL cache, and does not make strong TTL
guarantees. There is no pre-emptive pruning of expired items,
but you _may_ set a TTL on the cache, and it will treat expired
items as missing when they are fetched, and delete them.

Optional, but must be a positive integer in ms if specified.

This may be overridden by passing an options object to
`cache.set()`.

At least one of `max`, `maxSize`, or `TTL` is required. This
must be a positive integer if set.

Even if ttl tracking is enabled, **it is strongly recommended to
set a `max` to prevent unbounded growth of the cache.** See
"Storage Bounds Safety" below.

If ttl tracking is enabled, and `max` and `maxSize` are not set,
and `ttlAutopurge` is not set, then a warning will be emitted
cautioning about the potential for unbounded memory consumption.
(The TypeScript definitions will also discourage this.)

### `noUpdateTTL`

Boolean flag to tell the cache to not update the TTL when setting
a new value for an existing key (ie, when updating a value rather
than inserting a new value). Note that the TTL value is _always_
set (if provided) when adding a new entry into the cache.

This may be passed as an option to `cache.set()`.

Boolean, default false.

### `ttlResolution`

Minimum amount of time in ms in which to check for staleness.
Defaults to `1`, which means that the current time is checked at
most once per millisecond.

Set to `0` to check the current time every time staleness is
tested.

Note that setting this to a higher value _will_ improve
performance somewhat while using ttl tracking, albeit at the
expense of keeping stale items around a bit longer than intended.

### `ttlAutopurge`

Preemptively remove stale items from the cache.

Note that this may _significantly_ degrade performance,
especially if the cache is storing a large number of items. It
is almost always best to just leave the stale items in the cache,
and let them fall out as new items are added.

Note that this means that `allowStale` is a bit pointless, as
stale items will be deleted almost as soon as they expire.

Use with caution!

Boolean, default `false`

### `allowStale`

By default, if you set `ttl`, it'll only delete stale items from
the cache when you `get(key)`. That is, it's not preemptively
pruning items.

If you set `allowStale:true`, it'll return the stale value as
well as deleting it. If you don't set this, then it'll return
`undefined` when you try to get a stale entry.

Note that when a stale entry is fetched, _even if it is returned
due to `allowStale` being set_, it is removed from the cache
immediately. You can immediately put it back in the cache if you
wish, thus resetting the TTL.

This may be overridden by passing an options object to
`cache.get()`. The `cache.has()` method will always return
`false` for stale items.

Boolean, default false, only relevant if `ttl` is set.

### `noDeleteOnStaleGet`

When using time-expiring entries with `ttl`, by default stale
items will be removed from the cache when the key is accessed
with `cache.get()`.

Setting `noDeleteOnStaleGet` to `true` will cause stale items to
remain in the cache, until they are explicitly deleted with
`cache.delete(key)`, or retrieved with `noDeleteOnStaleGet` set
to `false`.

This may be overridden by passing an options object to
`cache.get()`.

Boolean, default false, only relevant if `ttl` is set.

### `updateAgeOnGet`

When using time-expiring entries with `ttl`, setting this to
`true` will make each item's age reset to 0 whenever it is
retrieved from cache with `get()`, causing it to not expire. (It
can still fall out of cache based on recency of use, of course.)

This may be overridden by passing an options object to
`cache.get()`.

Boolean, default false, only relevant if `ttl` is set.

### `updateAgeOnHas`

When using time-expiring entries with `ttl`, setting this to
`true` will make each item's age reset to 0 whenever its presence
in the cache is checked with `has()`, causing it to not expire.
(It can still fall out of cache based on recency of use, of
course.)

This may be overridden by passing an options object to
`cache.has()`.

Boolean, default false, only relevant if `ttl` is set.

## API

### `new LRUCache<K, V, FC = unknown>(options)`

Create a new LRUCache. All options are documented above, and are
on the cache as public members.

The `K` and `V` types define the key and value types,
respectively. The optional `FC` type defines the type of the
`context` object passed to `cache.fetch()`.

Keys and values **must not** be `null` or `undefined`.

### `cache.max`, `cache.maxSize`, `cache.allowStale`,

`cache.noDisposeOnSet`, `cache.sizeCalculation`, `cache.dispose`,
`cache.maxSize`, `cache.ttl`, `cache.updateAgeOnGet`,
`cache.updateAgeOnHas`

All option names are exposed as public members on the cache
object.

These are intended for read access only. Changing them during
program operation can cause undefined behavior.

### `cache.size`

The total number of items held in the cache at the current
moment.

### `cache.calculatedSize`

The total size of items in cache when using size tracking.

### `set(key, value, [{ size, sizeCalculation, ttl, noDisposeOnSet, start, status }])`

Add a value to the cache.

Optional options object may contain `ttl` and `sizeCalculation`
as described above, which default to the settings on the cache
object.

If `start` is provided, then that will set the effective start
time for the TTL calculation. Note that this must be a previous
value of `performance.now()` if supported, or a previous value of
`Date.now()` if not.

Options object may also include `size`, which will prevent
calling the `sizeCalculation` function and just use the specified
number if it is a positive integer, and `noDisposeOnSet` which
will prevent calling a `dispose` function in the case of
overwrites.

If the `size` (or return value of `sizeCalculation`) for a given
entry is greater than `maxEntrySize`, then the item will not be
added to the cache.

Will update the recency of the entry.

Returns the cache object.

For the usage of the `status` option, see **Status Tracking**
below.

If the value is `undefined`, then this is an alias for
`cache.delete(key)`. `undefined` is never stored in the cache.
See **Storing Undefined Values** below.

### `get(key, { updateAgeOnGet, allowStale, status } = {}) => value`

Return a value from the cache.

Will update the recency of the cache entry found.

If the key is not found, `get()` will return `undefined`.

For the usage of the `status` option, see **Status Tracking**
below.

### `info(key) => Entry | undefined`

Return an `Entry` object containing the currently cached value,
as well as ttl and size information if available. Returns
undefined if the key is not found in the cache.

Unlike `dump()` (which is designed to be portable and survive
serialization), the `start` value is always the current
timestamp, and the `ttl` is a calculated remaining time to live
(negative if expired).

Note that stale values are always returned, rather than being
pruned and treated as if they were not in the cache. If you wish
to exclude stale entries, guard against a negative `ttl` value.

### `async fetch(key, options = {}) => Promise`

The following options are supported:

- `updateAgeOnGet`
- `allowStale`
- `size`
- `sizeCalculation`
- `ttl`
- `noDisposeOnSet`
- `forceRefresh`
- `status` - See **Status Tracking** below.
- `signal` - AbortSignal can be used to cancel the `fetch()`.
  Note that the `signal` option provided to the `fetchMethod` is
  a different object, because it must also respond to internal
  cache state changes, but aborting this signal will abort the
  one passed to `fetchMethod` as well.
- `context` - sets the `context` option passed to the underlying
  `fetchMethod`.

If the value is in the cache and not stale, then the returned
Promise resolves to the value.

If not in the cache, or beyond its TTL staleness, then
`fetchMethod(key, staleValue, { options, signal, context })` is
called, and the value returned will be added to the cache once
resolved.

If called with `allowStale`, and an asynchronous fetch is
currently in progress to reload a stale value, then the former
stale value will be returned.

If called with `forceRefresh`, then the cached item will be
re-fetched, even if it is not stale. However, if `allowStale` is
set, then the old value will still be returned. This is useful
in cases where you want to force a reload of a cached value. If
a background fetch is already in progress, then `forceRefresh`
has no effect.

Multiple fetches for the same `key` will only call `fetchMethod`
a single time, and all will be resolved when the value is
resolved, even if different options are used.

If `fetchMethod` is not specified, then this is effectively an
alias for `Promise.resolve(cache.get(key))`.

When the fetch method resolves to a value, if the fetch has not
been aborted due to deletion, eviction, or being overwritten,
then it is added to the cache using the options provided.

If the key is evicted or deleted before the `fetchMethod`
resolves, then the AbortSignal passed to the `fetchMethod` will
receive an `abort` event, and the promise returned by `fetch()`
will reject with the reason for the abort.

If a `signal` is passed to the `fetch()` call, then aborting the
signal will abort the fetch and cause the `fetch()` promise to
reject with the reason provided.

#### Setting `context`

If an `FC` type is set to a type other than `unknown`, `void`, or
`undefined` in the LRUCache constructor, then all
calls to `cache.fetch()` _must_ provide a `context` option. If
set to `undefined` or `void`, then calls to fetch _must not_
provide a `context` option.

The `context` param allows you to provide arbitrary data that
might be relevant in the course of fetching the data. It is only
relevant for the course of a single `fetch()` operation, and
discarded afterwards.

#### Note: `fetch()` calls are inflight-unique

If you call `fetch()` multiple times with the same key value,
then every call after the first will resolve on the same
promise<sup>1</sup>,
_even if they have different settings that would otherwise change
the behvavior of the fetch_, such as `noDeleteOnFetchRejection`
or `ignoreFetchAbort`.

In most cases, this is not a problem (in fact, only fetching
something once is what you probably want, if you're caching in
the first place). If you are changing the fetch() options
dramatically between runs, there's a good chance that you might
be trying to fit divergent semantics into a single object, and
would be better off with multiple cache instances.

**1**: Ie, they're not the "same Promise", but they resolve at
the same time, because they're both waiting on the same
underlying fetchMethod response.

### `peek(key, { allowStale } = {}) => value`

Like `get()` but doesn't update recency or delete stale items.

Returns `undefined` if the item is stale, unless `allowStale` is
set either on the cache or in the options object.

### `has(key, { updateAgeOnHas, status } = {}) => Boolean`

Check if a key is in the cache, without updating the recency of
use. Age is updated if `updateAgeOnHas` is set to `true` in
either the options or the constructor.

Will return `false` if the item is stale, even though it is
technically in the cache. The difference can be determined (if
it matters) by using a `status` argument, and inspecting the
`has` field.

For the usage of the `status` option, see **Status Tracking**
below.

### `delete(key)`

Deletes a key out of the cache.

Returns `true` if the key was deleted, `false` otherwise.

### `clear()`

Clear the cache entirely, throwing away all values.

### `keys()`

Return a generator yielding the keys in the cache, in order from
most recently used to least recently used.

### `rkeys()`

Return a generator yielding the keys in the cache, in order from
least recently used to most recently used.

### `values()`

Return a generator yielding the values in the cache, in order
from most recently used to least recently used.

### `rvalues()`

Return a generator yielding the values in the cache, in order
from least recently used to most recently used.

### `entries()`

Return a generator yielding `[key, value]` pairs, in order from
most recently used to least recently used.

### `rentries()`

Return a generator yielding `[key, value]` pairs, in order from
least recently used to most recently used.

### `find(fn, [getOptions])`

Find a value for which the supplied `fn` method returns a truthy
value, similar to `Array.find()`.

`fn` is called as `fn(value, key, cache)`.

The optional `getOptions` are applied to the resulting `get()` of
the item found.

### `dump()`

Return an array of `[key, entry]` objects which can be passed to
`cache.load()`

The `start` fields are calculated relative to a portable
`Date.now()` timestamp, even if `performance.now()` is available.

Stale entries are always included in the `dump`, even if
`allowStale` is false.

Note: this returns an actual array, not a generator, so it can be
more easily passed around.

### `load(entries)`

Reset the cache and load in the items in `entries` in the order
listed. Note that the shape of the resulting cache may be
different if the same options are not used in both caches.

The `start` fields are assumed to be calculated relative to a
portable `Date.now()` timestamp, even if `performance.now()` is
available.

### `purgeStale()`

Delete any stale entries. Returns `true` if anything was
removed, `false` otherwise.

### `getRemainingTTL(key)`

Return the number of ms left in the item's TTL. If item is not
in cache, returns `0`. Returns `Infinity` if item is in cache
without a defined TTL.

### `forEach(fn, [thisp])`

Call the `fn` function with each set of `fn(value, key, cache)`
in the LRU cache, from most recent to least recently used.

Does not affect recency of use.

If `thisp` is provided, function will be called in the
`this`-context of the provided object.

### `rforEach(fn, [thisp])`

Same as `cache.forEach(fn, thisp)`, but in order from least
recently used to most recently used.

### `pop()`

Evict the least recently used item, returning its value.

Returns `undefined` if cache is empty.

## Status Tracking

Occasionally, it may be useful to track the internal behavior of
the cache, particularly for logging, debugging, or for behavior
within the `fetchMethod`. To do this, you can pass a `status`
object to the `get()`, `set()`, `has()`, and `fetch()` methods.

The `status` option should be a plain JavaScript object.

The following fields will be set appropriately:

```ts
interface Status<V> {
  /**
   * The status of a set() operation.
   *
   * - add: the item was not found in the cache, and was added
   * - update: the item was in the cache, with the same value provided
   * - replace: the item was in the cache, and replaced
   * - miss: the item was not added to the cache for some reason
   */
  set?: 'add' | 'update' | 'replace' | 'miss'

  /**
   * the ttl stored for the item, or undefined if ttls are not used.
   */
  ttl?: LRUMilliseconds

  /**
   * the start time for the item, or undefined if ttls are not used.
   */
  start?: LRUMilliseconds

  /**
   * The timestamp used for TTL calculation
   */
  now?: LRUMilliseconds

  /**
   * the remaining ttl for the item, or undefined if ttls are not used.
   */
  remainingTTL?: LRUMilliseconds

  /**
   * The calculated size for the item, if sizes are used.
   */
  size?: LRUSize

  /**
   * A flag indicating that the item was not stored, due to exceeding the
   * {@link maxEntrySize}
   */
  maxEntrySizeExceeded?: true

  /**
   * The old value, specified in the case of `set:'update'` or
   * `set:'replace'`
   */
  oldValue?: V

  /**
   * The results of a {@link has} operation
   *
   * - hit: the item was found in the cache
   * - stale: the item was found in the cache, but is stale
   * - miss: the item was not found in the cache
   */
  has?: 'hit' | 'stale' | 'miss'

  /**
   * The status of a {@link fetch} operation.
   * Note that this can change as the underlying fetch() moves through
   * various states.
   *
   * - inflight: there is another fetch() for this key which is in process
   * - get: there is no fetchMethod, so {@link get} was called.
   * - miss: the item is not in cache, and will be fetched.
   * - hit: the item is in the cache, and was resolved immediately.
   * - stale: the item is in the cache, but stale.
   * - refresh: the item is in the cache, and not stale, but
   *   {@link forceRefresh} was specified.
   */
  fetch?: 'get' | 'inflight' | 'miss' | 'hit' | 'stale' | 'refresh'

  /**
   * The {@link fetchMethod} was called
   */
  fetchDispatched?: true

  /**
   * The cached value was updated after a successful call to fetchMethod
   */
  fetchUpdated?: true

  /**
   * The reason for a fetch() rejection.  Either the error raised by the
   * {@link fetchMethod}, or the reason for an AbortSignal.
   */
  fetchError?: Error

  /**
   * The fetch received an abort signal
   */
  fetchAborted?: true

  /**
   * The abort signal received was ignored, and the fetch was allowed to
   * continue.
   */
  fetchAbortIgnored?: true

  /**
   * The fetchMethod promise resolved successfully
   */
  fetchResolved?: true

  /**
   * The results of the fetchMethod promise were stored in the cache
   */
  fetchUpdated?: true

  /**
   * The fetchMethod promise was rejected
   */
  fetchRejected?: true

  /**
   * The status of a {@link get} operation.
   *
   * - fetching: The item is currently being fetched.  If a previous value is
   *   present and allowed, that will be returned.
   * - stale: The item is in the cache, and is stale.
   * - hit: the item is in the cache
   * - miss: the item is not in the cache
   */
  get?: 'stale' | 'hit' | 'miss'

  /**
   * A fetch or get operation returned a stale value.
   */
  returnedStale?: true
}
```

## Storage Bounds Safety

This implementation aims to be as flexible as possible, within
the limits of safe memory consumption and optimal performance.

At initial object creation, storage is allocated for `max` items.
If `max` is set to zero, then some performance is lost, and item
count is unbounded. Either `maxSize` or `ttl` _must_ be set if
`max` is not specified.

If `maxSize` is set, then this creates a safe limit on the
maximum storage consumed, but without the performance benefits of
pre-allocation. When `maxSize` is set, every item _must_ provide
a size, either via the `sizeCalculation` method provided to the
constructor, or via a `size` or `sizeCalculation` option provided
to `cache.set()`. The size of every item _must_ be a positive
integer.

If neither `max` nor `maxSize` are set, then `ttl` tracking must
be enabled. Note that, even when tracking item `ttl`, items are
_not_ preemptively deleted when they become stale, unless
`ttlAutopurge` is enabled. Instead, they are only purged the
next time the key is requested. Thus, if `ttlAutopurge`, `max`,
and `maxSize` are all not set, then the cache will potentially
grow unbounded.

In this case, a warning is printed to standard error. Future
versions may require the use of `ttlAutopurge` if `max` and
`maxSize` are not specified.

If you truly wish to use a cache that is bound _only_ by TTL
expiration, consider using a `Map` object, and calling
`setTimeout` to delete entries when they expire. It will perform
much better than an LRU cache.

Here is an implementation you may use, under the same
[license](./LICENSE) as this package:

```js
// a storage-unbounded ttl cache that is not an lru-cache
const cache = {
  data: new Map(),
  timers: new Map(),
  set: (k, v, ttl) => {
    if (cache.timers.has(k)) {
      clearTimeout(cache.timers.get(k))
    }
    cache.timers.set(
      k,
      setTimeout(() => cache.delete(k), ttl)
    )
    cache.data.set(k, v)
  },
  get: k => cache.data.get(k),
  has: k => cache.data.has(k),
  delete: k => {
    if (cache.timers.has(k)) {
      clearTimeout(cache.timers.get(k))
    }
    cache.timers.delete(k)
    return cache.data.delete(k)
  },
  clear: () => {
    cache.data.clear()
    for (const v of cache.timers.values()) {
      clearTimeout(v)
    }
    cache.timers.clear()
  },
}
```

If that isn't to your liking, check out
[@isaacs/ttlcache](http://npm.im/@isaacs/ttlcache).

## Storing Undefined Values

This cache never stores undefined values, as `undefined` is used
internally in a few places to indicate that a key is not in the
cache.

You may call `cache.set(key, undefined)`, but this is just an
an alias for `cache.delete(key)`. Note that this has the effect
that `cache.has(key)` will return _false_ after setting it to
undefined.

```js
cache.set(myKey, undefined)
cache.has(myKey) // false!
```

If you need to track `undefined` values, and still note that the
key is in the cache, an easy workaround is to use a sigil object
of your own.

```js
import { LRUCache } from 'lru-cache'
const undefinedValue = Symbol('undefined')
const cache = new LRUCache(...)
const mySet = (key, value) =>
  cache.set(key, value === undefined ? undefinedValue : value)
const myGet = (key, value) => {
  const v = cache.get(key)
  return v === undefinedValue ? undefined : v
}
```

## Performance

As of January 2022, version 7 of this library is one of the most
performant LRU cache implementations in JavaScript.

Benchmarks can be extremely difficult to get right. In
particular, the performance of set/get/delete operations on
objects will vary _wildly_ depending on the type of key used. V8
is highly optimized for objects with keys that are short strings,
especially integer numeric strings. Thus any benchmark which
tests _solely_ using numbers as keys will tend to find that an
object-based approach performs the best.

Note that coercing _anything_ to strings to use as object keys is
unsafe, unless you can be 100% certain that no other type of
value will be used. For example:

```js
const myCache = {}
const set = (k, v) => (myCache[k] = v)
const get = k => myCache[k]

set({}, 'please hang onto this for me')
set('[object Object]', 'oopsie')
```

Also beware of "Just So" stories regarding performance. Garbage
collection of large (especially: deep) object graphs can be
incredibly costly, with several "tipping points" where it
increases exponentially. As a result, putting that off until
later can make it much worse, and less predictable. If a library
performs well, but only in a scenario where the object graph is
kept shallow, then that won't help you if you are using large
objects as keys.

In general, when attempting to use a library to improve
performance (such as a cache like this one), it's best to choose
an option that will perform well in the sorts of scenarios where
you'll actually use it.

This library is optimized for repeated gets and minimizing
eviction time, since that is the expected need of a LRU. Set
operations are somewhat slower on average than a few other
options, in part because of that optimization. It is assumed
that you'll be caching some costly operation, ideally as rarely
as possible, so optimizing set over get would be unwise.

If performance matters to you:

1. If it's at all possible to use small integer values as keys,
   and you can guarantee that no other types of values will be
   used as keys, then do that, and use a cache such as
   [lru-fast](https://npmjs.com/package/lru-fast), or
   [mnemonist's
   LRUCache](https://yomguithereal.github.io/mnemonist/lru-cache)
   which uses an Object as its data store.

2. Failing that, if at all possible, use short non-numeric
   strings (ie, less than 256 characters) as your keys, and use
   [mnemonist's
   LRUCache](https://yomguithereal.github.io/mnemonist/lru-cache).

3. If the types of your keys will be anything else, especially
   long strings, strings that look like floats, objects, or some
   mix of types, or if you aren't sure, then this library will
   work well for you.

   If you do not need the features that this library provides
   (like asynchronous fetching, a variety of TTL staleness
   options, and so on), then [mnemonist's
   LRUMap](https://yomguithereal.github.io/mnemonist/lru-map) is
   a very good option, and just slightly faster than this module
   (since it does considerably less).

4. Do not use a `dispose` function, size tracking, or especially
   ttl behavior, unless absolutely needed. These features are
   convenient, and necessary in some use cases, and every attempt
   has been made to make the performance impact minimal, but it
   isn't nothing.

## Breaking Changes in Version 7

This library changed to a different algorithm and internal data
structure in version 7, yielding significantly better
performance, albeit with some subtle changes as a result.

If you were relying on the internals of LRUCache in version 6 or
before, it probably will not work in version 7 and above.

## Breaking Changes in Version 8

- The `fetchContext` option was renamed to `context`, and may no
  longer be set on the cache instance itself.
- Rewritten in TypeScript, so pretty much all the types moved
  around a lot.
- The AbortController/AbortSignal polyfill was removed. For this
  reason, **Node version 16.14.0 or higher is now required**.
- Internal properties were moved to actual private class
  properties.
- Keys and values must not be `null` or `undefined`.
- Minified export available at `'lru-cache/min'`, for both CJS
  and MJS builds.

## Changes in Version 9

- Named export only, no default export.
- AbortController polyfill returned, albeit with a warning when
  used.

For more info, see the [change log](CHANGELOG.md).
