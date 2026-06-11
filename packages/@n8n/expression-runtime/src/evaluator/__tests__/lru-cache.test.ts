import { describe, it, expect, vi } from 'vitest';
import { LruCache } from '../lru-cache';

describe('LruCache', () => {
	it('should store and retrieve values', () => {
		const cache = new LruCache<string, number>(3);
		cache.set('a', 1);
		cache.set('b', 2);
		expect(cache.get('a')).toBe(1);
		expect(cache.get('b')).toBe(2);
	});

	it('should return undefined for missing keys', () => {
		const cache = new LruCache<string, number>(3);
		expect(cache.get('missing')).toBeUndefined();
	});

	it('should evict the least recently used entry when over capacity', () => {
		const cache = new LruCache<string, number>(2);
		cache.set('a', 1);
		cache.set('b', 2);
		cache.set('c', 3); // evicts 'a'
		expect(cache.get('a')).toBeUndefined();
		expect(cache.get('b')).toBe(2);
		expect(cache.get('c')).toBe(3);
	});

	it('should refresh recency on get', () => {
		const cache = new LruCache<string, number>(2);
		cache.set('a', 1);
		cache.set('b', 2);
		cache.get('a'); // refreshes 'a', now 'b' is oldest
		cache.set('c', 3); // evicts 'b'
		expect(cache.get('a')).toBe(1);
		expect(cache.get('b')).toBeUndefined();
		expect(cache.get('c')).toBe(3);
	});

	it('should refresh recency on get even when below capacity', () => {
		const cache = new LruCache<string, number>(3);
		cache.set('a', 1);
		cache.set('b', 2);
		cache.get('a'); // refreshes 'a' while cache is below capacity
		cache.set('c', 3); // fills cache
		cache.set('d', 4); // evicts 'b' (oldest), not 'a'
		expect(cache.get('a')).toBe(1);
		expect(cache.get('b')).toBeUndefined();
	});

	it('should refresh recency on set (update)', () => {
		const cache = new LruCache<string, number>(2);
		cache.set('a', 1);
		cache.set('b', 2);
		cache.set('a', 10); // refreshes 'a', now 'b' is oldest
		cache.set('c', 3); // evicts 'b'
		expect(cache.get('a')).toBe(10);
		expect(cache.get('b')).toBeUndefined();
		expect(cache.get('c')).toBe(3);
	});

	it('should call onEvict with evicted key and value', () => {
		const onEvict = vi.fn();
		const cache = new LruCache<string, number>(2, onEvict);
		cache.set('a', 1);
		cache.set('b', 2);
		cache.set('c', 3); // evicts 'a'
		expect(onEvict).toHaveBeenCalledWith('a', 1);
	});

	it('should not evict when updating existing keys', () => {
		const onEvict = vi.fn();
		const cache = new LruCache<string, number>(3, onEvict);
		cache.set('a', 1);
		cache.set('b', 2);
		cache.set('a', 10); // update, not a new entry
		cache.set('c', 3);
		expect(onEvict).not.toHaveBeenCalled();
		expect(cache.get('a')).toBe(10);
		expect(cache.get('b')).toBe(2);
		expect(cache.get('c')).toBe(3);
	});

	it('should clear all entries', () => {
		const cache = new LruCache<string, number>(3);
		cache.set('a', 1);
		cache.set('b', 2);
		cache.clear();
		expect(cache.get('a')).toBeUndefined();
		expect(cache.get('b')).toBeUndefined();
	});

	it('should work with capacity 1', () => {
		const cache = new LruCache<string, number>(1);
		cache.set('a', 1);
		expect(cache.get('a')).toBe(1);
		cache.set('b', 2); // evicts 'a'
		expect(cache.get('a')).toBeUndefined();
		expect(cache.get('b')).toBe(2);
	});

	it('should throw for capacity less than 1', () => {
		expect(() => new LruCache<string, number>(0)).toThrow('capacity must be at least 1');
	});
});
