import { isObjectOrArray, isObject, searchInObject, deepCompare } from '@/utils/objectUtils';

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

	describe('deepCompare', () => {
		it('should compare primitive values correctly', () => {
			const obj1 = { name: 'John', age: 30 };
			const obj2 = { name: 'John', age: 30 };
			const obj3 = { name: 'Jane', age: 30 };

			expect(deepCompare(obj1, obj2)).toBe(true);
			expect(deepCompare(obj1, obj3)).toBe(false);
		});

		it('should handle nested objects', () => {
			const obj1 = {
				address: { street: '123 Main', city: 'Boston' },
			};
			const obj2 = {
				address: { street: '123 Main', city: 'Boston' },
			};
			const obj3 = {
				address: { street: '456 Oak', city: 'Boston' },
			};

			expect(deepCompare(obj1, obj2)).toBe(true);
			expect(deepCompare(obj1, obj3)).toBe(false);
		});

		it('should compare arrays correctly', () => {
			const obj1 = { hobbies: ['reading', 'hiking'] };
			const obj2 = { hobbies: ['reading', 'hiking'] };
			const obj3 = { hobbies: ['reading', 'swimming'] };

			expect(deepCompare(obj1, obj2)).toBe(true);
			expect(deepCompare(obj1, obj3)).toBe(false);
		});

		it('should handle arrays of objects', () => {
			const obj1 = {
				contacts: [
					{ name: 'Alice', phone: '123' },
					{ name: 'Bob', phone: '456' },
				],
			};
			const obj2 = {
				contacts: [
					{ name: 'Alice', phone: '123' },
					{ name: 'Bob', phone: '456' },
				],
			};
			const obj3 = {
				contacts: [
					{ name: 'Alice', phone: '789' },
					{ name: 'Bob', phone: '456' },
				],
			};

			expect(deepCompare(obj1, obj2)).toBe(true);
			expect(deepCompare(obj1, obj3)).toBe(false);
		});

		it('should handle null and undefined', () => {
			type DataObject = { data: unknown };

			const obj1: DataObject = { data: null };
			const obj2: DataObject = { data: null };
			const obj3: DataObject = { data: undefined };

			expect(deepCompare(obj1, obj2)).toBe(true);
			expect(deepCompare(obj1, obj3)).toBe(false);
			expect(deepCompare(null, null)).toBe(true);
			expect(deepCompare(undefined, undefined)).toBe(true);
			expect(deepCompare(null, undefined)).toBe(false);
		});

		it('should compare objects with different number of keys', () => {
			const obj1 = { name: 'John', age: 30 };
			const obj2 = { name: 'John', age: 30, city: 'Boston' };

			expect(deepCompare(obj1, obj2)).toBe(false);
		});

		it('should handle circular references', () => {
			type DataObject = { name: string; self?: unknown };

			const obj1: DataObject = { name: 'John' };
			const obj2: DataObject = { name: 'John' };
			obj1.self = obj1;
			obj2.self = obj2;

			expect(() => deepCompare(obj1, obj2)).toThrow();
		});
	});
});
