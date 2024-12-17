import { set } from '../set';

describe('set function', () => {
	it('should set a nested value in an empty object', () => {
		const obj = {};
		set(obj, ['a', 'b'], 4);
		expect(obj).toEqual({ a: { b: 4 } });
	});

	it('should set a value in an already existing object', () => {
		const obj = { a: { b: 2 } };
		set(obj, ['a', 'b'], 4);
		expect(obj).toEqual({ a: { b: 4 } });
	});

	it('should create nested objects when the path does not exist', () => {
		const obj: unknown = {};
		set(obj, ['x', 'y', 'z'], 42);
		expect(obj).toEqual({ x: { y: { z: 42 } } });
	});

	it('should overwrite a value at a nested path', () => {
		const obj = { a: { b: { c: 5 } } };
		set(obj, ['a', 'b', 'c'], 10);
		expect(obj).toEqual({ a: { b: { c: 10 } } });
	});

	it('should set a value on a null property by replacing it with an object', () => {
		const obj: unknown = { a: null };
		set(obj, ['a', 'b'], 7);
		expect(obj).toEqual({ a: { b: 7 } });
	});

	it('should handle an empty path without modifying the object', () => {
		const obj = { a: 1 };
		set(obj, [], 99);
		expect(obj).toEqual({ a: 1 });
	});

	it('should handle non-object values in the path gracefully', () => {
		const obj: unknown = { a: 'string' };
		set(obj, ['a', 'b'], 3);
		expect(obj).toEqual({ a: { b: 3 } });
	});
});
