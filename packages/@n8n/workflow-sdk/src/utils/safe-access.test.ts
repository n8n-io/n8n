/**
 * Tests for safe property access utilities
 */

import { isPlainObject, getProperty, hasProperty } from './safe-access';

describe('isPlainObject', () => {
	it('returns true for plain object', () => {
		expect(isPlainObject({})).toBe(true);
		expect(isPlainObject({ a: 1 })).toBe(true);
	});

	it('returns false for null', () => {
		expect(isPlainObject(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isPlainObject(undefined)).toBe(false);
	});

	it('returns false for arrays', () => {
		expect(isPlainObject([])).toBe(false);
		expect(isPlainObject([1, 2, 3])).toBe(false);
	});

	it('returns false for primitives', () => {
		expect(isPlainObject('string')).toBe(false);
		expect(isPlainObject(123)).toBe(false);
		expect(isPlainObject(true)).toBe(false);
	});

	it('returns false for functions', () => {
		expect(isPlainObject(() => {})).toBe(false);
	});
});

describe('getProperty', () => {
	it('returns property value when it exists', () => {
		const obj = { name: 'test', count: 42 };
		expect(getProperty<string>(obj, 'name')).toBe('test');
		expect(getProperty<number>(obj, 'count')).toBe(42);
	});

	it('returns undefined for non-existent property', () => {
		const obj = { name: 'test' };
		expect(getProperty<string>(obj, 'missing')).toBeUndefined();
	});

	it('returns undefined for null', () => {
		expect(getProperty<string>(null, 'name')).toBeUndefined();
	});

	it('returns undefined for undefined', () => {
		expect(getProperty<string>(undefined, 'name')).toBeUndefined();
	});

	it('returns undefined for non-objects', () => {
		expect(getProperty<string>('string', 'length')).toBeUndefined();
		expect(getProperty<string>(123, 'toString')).toBeUndefined();
	});

	it('returns undefined for arrays', () => {
		expect(getProperty<number>([1, 2, 3], '0')).toBeUndefined();
	});

	it('handles nested objects', () => {
		const obj = { nested: { value: 'deep' } };
		const nested = getProperty<{ value: string }>(obj, 'nested');
		expect(nested?.value).toBe('deep');
	});
});

describe('hasProperty', () => {
	it('returns true when property exists', () => {
		expect(hasProperty({ name: 'test' }, 'name')).toBe(true);
	});

	it('returns true when property is undefined', () => {
		expect(hasProperty({ name: undefined }, 'name')).toBe(true);
	});

	it('returns false when property does not exist', () => {
		expect(hasProperty({ name: 'test' }, 'missing')).toBe(false);
	});

	it('returns false for null', () => {
		expect(hasProperty(null, 'name')).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(hasProperty(undefined, 'name')).toBe(false);
	});

	it('returns false for non-objects', () => {
		expect(hasProperty('string', 'length')).toBe(false);
	});
});
