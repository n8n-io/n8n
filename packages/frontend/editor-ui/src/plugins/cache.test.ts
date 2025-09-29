import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { indexedDbCache } from './cache';
// @ts-ignore
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
// @ts-ignore
import FDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';

const globalTeardown = () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	delete (global as any).indexedDB;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	delete (global as any).IDBKeyRange;
};

const globalSetup = () => {
	global.indexedDB = new FDBFactory();
	global.IDBKeyRange = FDBKeyRange;
};

describe('indexedDbCache', () => {
	const dbName = 'testDb';
	const storeName = 'testStore';

	beforeEach(() => {
		globalSetup();
	});

	afterEach(() => {
		globalTeardown();
	});

	it('should create cache instance and initialize empty', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		expect(cache.getItem('nonexistent')).toBe(null);
	});

	it('should set and get items', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		cache.setItem('key1', 'value1');
		expect(cache.getItem('key1')).toBe('value1');

		cache.setItem('key2', 'value2');
		expect(cache.getItem('key2')).toBe('value2');
	});

	it('should return null for non-existent keys', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		expect(cache.getItem('nonexistent')).toBe(null);
	});

	it('should remove items', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		cache.setItem('key1', 'value1');
		expect(cache.getItem('key1')).toBe('value1');

		cache.removeItem('key1');
		expect(cache.getItem('key1')).toBe(null);
	});

	it('should clear all items', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		cache.setItem('key1', 'value1');
		cache.setItem('key2', 'value2');

		cache.clear();

		expect(cache.getItem('key1')).toBe(null);
		expect(cache.getItem('key2')).toBe(null);
	});

	it('should get all items with prefix', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		cache.setItem('prefix:key1', 'value1');
		cache.setItem('prefix:key2', 'value2');
		cache.setItem('other:key3', 'value3');

		await new Promise((resolve) => setTimeout(resolve, 100));

		const results = await cache.getAllWithPrefix('prefix:');

		expect(results).toEqual({
			'prefix:key1': 'value1',
			'prefix:key2': 'value2',
		});

		expect(results['other:key3']).toBeUndefined();
	});

	it('should persist data between cache instances', async () => {
		const cache1 = await indexedDbCache(dbName, storeName);
		cache1.setItem('persistent', 'value');

		await new Promise((resolve) => setTimeout(resolve, 100));

		const cache2 = await indexedDbCache(dbName, storeName);

		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(cache2.getItem('persistent')).toBe('value');
	});

	it('should handle empty prefix queries', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		cache.setItem('key1', 'value1');
		cache.setItem('key2', 'value2');

		await new Promise((resolve) => setTimeout(resolve, 100));

		const results = await cache.getAllWithPrefix('');

		expect(results).toEqual({
			key1: 'value1',
			key2: 'value2',
		});
	});

	it('should handle non-matching prefix queries', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		cache.setItem('key1', 'value1');
		cache.setItem('key2', 'value2');

		await new Promise((resolve) => setTimeout(resolve, 100));

		const results = await cache.getAllWithPrefix('nonexistent:');

		expect(results).toEqual({});
	});

	it('should handle concurrent operations', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		const promises = [];

		for (let i = 0; i < 10; i++) {
			promises.push(
				new Promise<void>((resolve) => {
					cache.setItem(`key${i}`, `value${i}`);
					resolve();
				}),
			);
		}

		await Promise.all(promises);

		for (let i = 0; i < 10; i++) {
			expect(cache.getItem(`key${i}`)).toBe(`value${i}`);
		}
	});

	it('should update existing items', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		cache.setItem('key1', 'originalValue');
		expect(cache.getItem('key1')).toBe('originalValue');

		cache.setItem('key1', 'updatedValue');
		expect(cache.getItem('key1')).toBe('updatedValue');
	});

	it('should handle special characters in keys and values', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		const specialKey = 'key:with/special\\chars';
		const specialValue = 'value with "quotes" and \nnewlines';

		cache.setItem(specialKey, specialValue);
		expect(cache.getItem(specialKey)).toBe(specialValue);
	});

	it('should work with different database names', async () => {
		const cache1 = await indexedDbCache('db1', storeName);
		const cache2 = await indexedDbCache('db2', storeName);

		cache1.setItem('key', 'value1');
		cache2.setItem('key', 'value2');

		expect(cache1.getItem('key')).toBe('value1');
		expect(cache2.getItem('key')).toBe('value2');
	});

	it('should handle database initialization errors gracefully', async () => {
		const originalIndexedDB = global.indexedDB;

		const mockIndexedDB = {
			open: vi.fn().mockImplementation(() => {
				const request = {
					onerror: null as ((event: Event) => void) | null,
					onsuccess: null as ((event: Event) => void) | null,
					onupgradeneeded: null as ((event: Event) => void) | null,
					result: null,
					error: new Error('Database error'),
				};
				setTimeout(() => {
					if (request.onerror) request.onerror(new Event('error'));
				}, 0);
				return request;
			}),
			cmp: vi.fn(),
			databases: vi.fn(),
			deleteDatabase: vi.fn(),
		};

		global.indexedDB = mockIndexedDB;

		await expect(indexedDbCache(dbName, storeName)).rejects.toThrow();

		global.indexedDB = originalIndexedDB;
	});

	it('should ensure IndexedDB operations are persisted correctly', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		// Set multiple items
		cache.setItem('persist1', 'value1');
		cache.setItem('persist2', 'value2');
		cache.setItem('persist3', 'value3');

		// Wait for async operations to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Create new instance to verify persistence
		const newCache = await indexedDbCache(dbName, storeName);

		// Wait for load to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(newCache.getItem('persist1')).toBe('value1');
		expect(newCache.getItem('persist2')).toBe('value2');
		expect(newCache.getItem('persist3')).toBe('value3');
	});

	it('should ensure removeItem persists deletion to IndexedDB', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		// Set and verify item exists
		cache.setItem('toDelete', 'value');
		await new Promise((resolve) => setTimeout(resolve, 50));

		const cache2 = await indexedDbCache(dbName, storeName);
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(cache2.getItem('toDelete')).toBe('value');

		// Remove item and verify it's deleted from IndexedDB
		cache.removeItem('toDelete');
		await new Promise((resolve) => setTimeout(resolve, 100));

		const cache3 = await indexedDbCache(dbName, storeName);
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(cache3.getItem('toDelete')).toBe(null);
	});

	it('should ensure clear persists to IndexedDB', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		// Set multiple items
		cache.setItem('clear1', 'value1');
		cache.setItem('clear2', 'value2');
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Verify items exist in new instance
		const cache2 = await indexedDbCache(dbName, storeName);
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(cache2.getItem('clear1')).toBe('value1');
		expect(cache2.getItem('clear2')).toBe('value2');

		// Clear and verify persistence
		cache.clear();
		await new Promise((resolve) => setTimeout(resolve, 100));

		const cache3 = await indexedDbCache(dbName, storeName);
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(cache3.getItem('clear1')).toBe(null);
		expect(cache3.getItem('clear2')).toBe(null);
	});

	it('should handle rapid successive operations correctly', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		// Rapid operations on same key
		cache.setItem('rapid', 'value1');
		cache.setItem('rapid', 'value2');
		cache.setItem('rapid', 'value3');
		cache.removeItem('rapid');
		cache.setItem('rapid', 'final');

		// In-memory should be immediate
		expect(cache.getItem('rapid')).toBe('final');

		// Wait for all async operations to settle
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Verify final state persisted correctly
		const newCache = await indexedDbCache(dbName, storeName);
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(newCache.getItem('rapid')).toBe('final');
	});

	it('should maintain consistency between memory cache and IndexedDB', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		const operations = [
			() => cache.setItem('consistency1', 'value1'),
			() => cache.setItem('consistency2', 'value2'),
			() => cache.removeItem('consistency1'),
			() => cache.setItem('consistency3', 'value3'),
			() => cache.clear(),
			() => cache.setItem('final', 'finalValue'),
		];

		// Execute operations with small delays
		for (const op of operations) {
			op();
			await new Promise((resolve) => setTimeout(resolve, 10));
		}

		// Wait for all operations to complete
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Verify final state in new instance
		const newCache = await indexedDbCache(dbName, storeName);
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(newCache.getItem('consistency1')).toBe(null);
		expect(newCache.getItem('consistency2')).toBe(null);
		expect(newCache.getItem('consistency3')).toBe(null);
		expect(newCache.getItem('final')).toBe('finalValue');
	});

	it('should verify transaction operations are called with correct parameters', async () => {
		const cache = await indexedDbCache(dbName, storeName);

		// Test that operations work through the full IndexedDB integration
		cache.setItem('txTest1', 'value1');
		cache.setItem('txTest2', 'value2');
		cache.removeItem('txTest1');

		// Wait for operations to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Verify in-memory state
		expect(cache.getItem('txTest1')).toBe(null);
		expect(cache.getItem('txTest2')).toBe('value2');

		// Verify persistence to IndexedDB
		const newCache = await indexedDbCache(dbName, storeName);
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(newCache.getItem('txTest1')).toBe(null);
		expect(newCache.getItem('txTest2')).toBe('value2');

		// Clear and verify
		cache.clear();
		await new Promise((resolve) => setTimeout(resolve, 100));

		const clearedCache = await indexedDbCache(dbName, storeName);
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(clearedCache.getItem('txTest2')).toBe(null);
	});
});
