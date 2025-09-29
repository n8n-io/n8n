import {
	isObjectOrArray,
	isObject,
	searchInObject,
	getObjectSizeInKB,
	omitKey,
} from '@/utils/objectUtils';

const testData = [1, '', true, null, undefined, new Date(), () => {}].map((value) => [
	value,
	typeof value,
]);

describe('objectUtils', () => {
	describe('isObjectOrArray', () => {
		it('should return true for objects', () => {
			assert(isObjectOrArray({}));
		});

		it('should return true for arrays', () => {
			assert(isObjectOrArray([]));
		});

		test.each(testData)('should return false for %j (type %s)', (value) => {
			assert(!isObjectOrArray(value));
		});
	});

	describe('isObject', () => {
		it('should return true for objects', () => {
			assert(isObject({}));
		});

		it('should return false for arrays', () => {
			assert(!isObject([]));
		});

		test.each(testData)('should return false for %j (type %s)', (value) => {
			assert(!isObject(value));
		});
	});

	describe('searchInObject', () => {
		it('should return true if the search string is found in the object', () => {
			assert(searchInObject({ a: 'b' }, 'b'));
		});

		it('should return false if the search string is not found in the object', () => {
			assert(!searchInObject({ a: 'b' }, 'c'));
		});

		it('should return true if the search string is not found in the object as a key', () => {
			assert(searchInObject({ a: 'b' }, 'a'));
		});

		it('should return true if the search string is found in a nested object', () => {
			assert(searchInObject({ a: { b: 'c' } }, 'c'));
		});

		it('should return true if the search string is found in a nested object as a key', () => {
			assert(searchInObject({ a: { b: 'c' } }, 'b'));
		});

		it('should return true if the search string is found in an array', () => {
			assert(searchInObject(['a', 'b'], 'a'));
		});

		it('should return true if the search string is found in a nested array', () => {
			assert(searchInObject(['a', ['b', 'c']], 'c'));
		});

		it('should return false if the search string is not found in an array', () => {
			assert(!searchInObject(['a', 'b'], 'c'));
		});

		it('should return false if the search string is not found in a nested array', () => {
			assert(!searchInObject(['a', ['b', 'c']], 'd'));
		});

		it('should return true if the search string is found in a nested object in an array', () => {
			assert(searchInObject([{ a: 'b' }], 'b'));
		});

		it('should return true if the search string is found in a nested array in an object', () => {
			assert(searchInObject({ a: ['b', 'c'] }, 'c'));
		});

		it('should return false if the search string is not found in a nested object in an array', () => {
			assert(!searchInObject([{ a: 'b' }], 'c'));
		});

		it('should return false if the search string is not found in a nested array in an object', () => {
			assert(!searchInObject({ a: ['b', 'c'] }, 'd'));
		});

		it('should return true if the search string is found in an object as a key in a nested array', () => {
			assert(searchInObject({ a: ['b', { c: 'd' }] }, 'c'));
		});

		it('should return true if the search string is found in an object in a nested array', () => {
			assert(searchInObject({ a: ['b', { c: 'd' }] }, 'd'));
		});
	});

	describe('getObjectSizeInKB', () => {
		// Test null/undefined cases
		it('returns 0 for null', () => {
			expect(getObjectSizeInKB(null)).toBe(0);
		});

		it('returns 0 for undefined', () => {
			expect(getObjectSizeInKB(undefined)).toBe(0);
		});

		// Test empty objects/arrays
		it('returns correct size for empty object', () => {
			expect(getObjectSizeInKB({})).toBe(0);
		});

		it('returns correct size for empty array', () => {
			expect(getObjectSizeInKB([])).toBe(0);
		});

		// Test regular cases
		it('calculates size for simple object correctly', () => {
			const obj = { name: 'test' };
			expect(getObjectSizeInKB(obj)).toBe(0.01);
		});

		it('calculates size for array correctly', () => {
			const arr = [1, 2, 3];
			expect(getObjectSizeInKB(arr)).toBe(0.01);
		});

		it('calculates size for nested object correctly', () => {
			const obj = {
				name: 'test',
				nested: {
					value: 123,
				},
			};
			expect(getObjectSizeInKB(obj)).toBe(0.04);
		});

		// Test error cases
		it('throws error for circular reference', () => {
			type CircularObj = {
				name: string;
				self?: CircularObj;
			};

			const obj: CircularObj = { name: 'test' };
			obj.self = obj;

			expect(() => getObjectSizeInKB(obj)).toThrow('Failed to calculate object size');
		});

		it('handles special characters correctly', () => {
			const obj = { name: '测试' };
			expect(getObjectSizeInKB(obj)).toBe(0.02);
		});
	});

	describe('omitKey', () => {
		it('should remove a top-level key from a flat object', () => {
			const input = { a: 1, b: 2, c: 3 };
			const result = omitKey(input, 'b');
			expect(result).toEqual({ a: 1, c: 3 });
		});

		it('should not mutate the original object', () => {
			const input = { a: 1, b: 2 };
			const copy = { ...input };
			omitKey(input, 'b');
			expect(input).toEqual(copy);
		});

		it('should return the same object if the key does not exist', () => {
			const input = { a: 1, b: 2 };
			const result = omitKey(input, 'z');
			expect(result).toEqual(input);
		});

		it('should remove a key with an undefined value', () => {
			const input = { a: 1, b: undefined };
			const result = omitKey(input, 'b');
			expect(result).toEqual({ a: 1 });
		});

		it('should work with nested objects but only remove the top-level key', () => {
			const input = { a: { nested: true }, b: 2 };
			const result = omitKey(input, 'a');
			expect(result).toEqual({ b: 2 });
		});
	});
});
