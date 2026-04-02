import { LRUCache } from '../cache';

describe('LRUCache', () => {
	it('returns undefined for missing keys', () => {
		const cache = new LRUCache<string>();
		expect(cache.get('missing')).toBeUndefined();
	});

	it('stores and retrieves values', () => {
		const cache = new LRUCache<string>();
		cache.set('key1', 'value1');

		expect(cache.get('key1')).toBe('value1');
	});

	it('returns the same reference on cache hit', () => {
		const cache = new LRUCache<{ data: string }>();
		const obj = { data: 'test' };

		cache.set('key', obj);

		expect(cache.get('key')).toBe(obj); // Same reference
	});

	it('evicts oldest entry when at capacity', () => {
		const cache = new LRUCache<string>({ maxEntries: 3 });

		cache.set('a', '1');
		cache.set('b', '2');
		cache.set('c', '3');
		cache.set('d', '4'); // Should evict 'a'

		expect(cache.get('a')).toBeUndefined();
		expect(cache.get('b')).toBe('2');
		expect(cache.get('d')).toBe('4');
		expect(cache.size).toBe(3);
	});

	it('refreshes LRU order on get', () => {
		const cache = new LRUCache<string>({ maxEntries: 3 });

		cache.set('a', '1');
		cache.set('b', '2');
		cache.set('c', '3');

		// Access 'a' to make it most recently used
		cache.get('a');

		cache.set('d', '4'); // Should evict 'b' (now oldest)

		expect(cache.get('a')).toBe('1');
		expect(cache.get('b')).toBeUndefined();
	});

	it('expires entries after TTL', () => {
		jest.useFakeTimers();

		const cache = new LRUCache<string>({ ttlMs: 1000 });
		cache.set('key', 'value');

		expect(cache.get('key')).toBe('value');

		jest.advanceTimersByTime(1001);

		expect(cache.get('key')).toBeUndefined();

		jest.useRealTimers();
	});

	it('clears all entries', () => {
		const cache = new LRUCache<string>();
		cache.set('a', '1');
		cache.set('b', '2');

		cache.clear();

		expect(cache.size).toBe(0);
		expect(cache.get('a')).toBeUndefined();
	});

	it('overwrites existing key and resets position', () => {
		const cache = new LRUCache<string>({ maxEntries: 3 });

		cache.set('a', '1');
		cache.set('b', '2');
		cache.set('c', '3');

		// Overwrite 'a' — should move to end
		cache.set('a', 'updated');

		cache.set('d', '4'); // Should evict 'b' (oldest after 'a' was refreshed)

		expect(cache.get('a')).toBe('updated');
		expect(cache.get('b')).toBeUndefined();
		expect(cache.size).toBe(3);
	});
});
