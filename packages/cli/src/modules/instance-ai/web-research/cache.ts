interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

/**
 * Generic LRU cache with TTL expiry.
 * Used to cache fetched page results to avoid redundant HTTP requests.
 */
export class LRUCache<T> {
	private readonly map = new Map<string, CacheEntry<T>>();
	private readonly maxEntries: number;
	private readonly ttlMs: number;

	constructor(options?: { maxEntries?: number; ttlMs?: number }) {
		this.maxEntries = options?.maxEntries ?? 100;
		this.ttlMs = options?.ttlMs ?? 15 * 60 * 1000; // 15 minutes
	}

	get(key: string): T | undefined {
		const entry = this.map.get(key);
		if (!entry) return undefined;

		if (Date.now() > entry.expiresAt) {
			this.map.delete(key);
			return undefined;
		}

		// Move to end (most recently used)
		this.map.delete(key);
		this.map.set(key, entry);

		return entry.value;
	}

	set(key: string, value: T): void {
		// Delete first to reset position if key already exists
		this.map.delete(key);

		// Evict oldest if at capacity
		if (this.map.size >= this.maxEntries) {
			const oldest = this.map.keys().next().value as string | undefined;
			if (oldest !== undefined) {
				this.map.delete(oldest);
			}
		}

		this.map.set(key, {
			value,
			expiresAt: Date.now() + this.ttlMs,
		});
	}

	get size(): number {
		return this.map.size;
	}

	clear(): void {
		this.map.clear();
	}
}
