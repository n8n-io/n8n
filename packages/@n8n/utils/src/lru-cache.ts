export class LruCache<K, V> {
	private map = new Map<K, V>();

	constructor(
		private readonly capacity: number,
		private readonly onEvict?: (key: K, value: V) => void,
	) {
		if (capacity < 1) {
			throw new Error('LruCache capacity must be at least 1');
		}
	}

	get(key: K): V | undefined {
		const value = this.map.get(key);
		if (value === undefined) return undefined;
		this.map.delete(key);
		this.map.set(key, value);
		return value;
	}

	set(key: K, value: V): void {
		this.map.delete(key);
		this.map.set(key, value);
		if (this.map.size > this.capacity) {
			const [oldestKey, oldestValue] = this.map.entries().next().value!;
			this.map.delete(oldestKey);
			this.onEvict?.(oldestKey, oldestValue);
		}
	}

	get size(): number {
		return this.map.size;
	}

	clear(): void {
		this.map.clear();
	}
}
