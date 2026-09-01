import { describe, it, expect } from 'vitest';
import { compact } from '../object-extensions';

describe('compact', () => {
	it('should remove null, undefined, empty string, and nil from objects', () => {
		expect(compact({ a: 1, b: null, c: '', d: undefined, e: 'nil' })).toEqual({ a: 1 });
	});

	it('should remove empty objects', () => {
		expect(compact({ a: 1, b: {} })).toEqual({ a: 1 });
	});

	it('should recurse into nested objects', () => {
		expect(compact({ a: { b: null, c: 2 }, d: 3 })).toEqual({ a: { c: 2 }, d: 3 });
	});

	it('should preserve array structure instead of converting to object', () => {
		const input = { items: [1, null, 2, '', 3] };
		const result = compact(input);
		expect(result).toEqual({ items: [1, 2, 3] });
		expect(Array.isArray((result as Record<string, unknown>).items)).toBe(true);
	});

	it('should filter empty values from top-level arrays', () => {
		const result = compact([1, null, 'hello', '', undefined, 'nil', 0] as unknown as object);
		expect(result).toEqual([1, 'hello', 0]);
		expect(Array.isArray(result)).toBe(true);
	});

	it('should remove empty objects from arrays', () => {
		const result = compact([1, {}, { a: 1 }, []] as unknown as object);
		expect(result).toEqual([1, { a: 1 }]);
	});

	it('should recurse into objects nested inside arrays', () => {
		const input = { items: [{ a: 1, b: null }, { c: '', d: 2 }] };
		expect(compact(input)).toEqual({ items: [{ a: 1 }, { d: 2 }] });
	});

	it('should handle nested arrays', () => {
		const input = { matrix: [[1, null], [null, 2]] };
		const result = compact(input);
		expect(result).toEqual({ matrix: [[1], [2]] });
	});

	it('should preserve falsy non-empty values in arrays', () => {
		const result = compact([false, 0, true, null, ''] as unknown as object);
		expect(result).toEqual([false, 0, true]);
	});
});
