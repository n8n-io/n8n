/**
 * A Map that automatically expires entries after a configurable TTL.
 *
 * Expiry is lazy (checked on `get`/`has`) plus a periodic background sweep
 * that prevents unbounded memory growth in write-heavy workloads.
 *
 * The sweep timer is `unref()`-ed so it never keeps the Node.js process alive
 * on its own — safe to use as a module-level singleton.
 *
 * Call `dispose()` to stop the background timer when the map is no longer needed
 * (e.g. in service `onApplicationShutdown` hooks or test `afterAll` blocks).
 */
export class TtlMap<K, V> {
	private readonly store = new Map<K, { value: V; expiresAt: number }>();

	private sweepTimer: NodeJS.Timeout | null = null;

	/**
	 * @param ttlMs          Time-to-live for each entry in milliseconds.
	 * @param sweepIntervalMs How often to run the background sweep (defaults to `ttlMs`).
	 *                        Set to `0` to disable the background sweep entirely.
	 */
	constructor(
		private readonly ttlMs: number,
		sweepIntervalMs: number = ttlMs,
	) {
		if (sweepIntervalMs > 0) {
			this.sweepTimer = setInterval(() => this.sweep(), sweepIntervalMs).unref();
		}
	}

	set(key: K, value: V): this {
		this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
		return this;
	}

	get(key: K): V | undefined {
		const entry = this.store.get(key);
		if (!entry) return undefined;
		if (Date.now() > entry.expiresAt) {
			this.store.delete(key);
			return undefined;
		}
		return entry.value;
	}

	has(key: K): boolean {
		if (!this.store.has(key)) return false;
		const expiresAt = this.store.get(key)?.expiresAt;
		if (!expiresAt) return false;
		if (Date.now() > expiresAt) {
			this.store.delete(key);
			return false;
		}
		return true;
	}

	delete(key: K): boolean {
		return this.store.delete(key);
	}

	/** Iterate over non-expired keys. Triggers a sweep first to evict stale entries. */
	keys(): IterableIterator<K> {
		this.sweep();
		return this.store.keys();
	}

	/** Iterate over non-expired `[key, value]` pairs. */
	*entries(): IterableIterator<[K, V]> {
		const now = Date.now();
		for (const [key, entry] of this.store) {
			if (now <= entry.expiresAt) {
				yield [key, entry.value];
			}
		}
	}

	/** Makes `TtlMap` directly iterable: `for (const [k, v] of map)` works as expected. */
	[Symbol.iterator](): IterableIterator<[K, V]> {
		return this.entries();
	}

	/** Number of non-expired entries (triggers a sweep). */
	get size(): number {
		this.sweep();
		return this.store.size;
	}

	clear(): void {
		this.store.clear();
	}

	/** Evict all entries whose TTL has elapsed. */
	sweep(): void {
		const now = Date.now();
		for (const [key, entry] of this.store) {
			if (now > entry.expiresAt) {
				this.store.delete(key);
			}
		}
	}

	/** Stop the background sweep timer. */
	dispose(): void {
		if (this.sweepTimer) {
			clearInterval(this.sweepTimer);
			this.sweepTimer = null;
		}
	}
}
