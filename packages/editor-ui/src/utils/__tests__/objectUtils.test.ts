import { isObjectOrArray, isObject, searchInObject } from '@/utils/objectUtils';

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
});
