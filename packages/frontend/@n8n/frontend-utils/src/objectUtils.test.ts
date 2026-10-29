import { deepFreeze } from './objectUtils';

describe('deepFreeze', () => {
	test('should freeze nested objects and arrays', () => {
		const value = { a: { b: { c: 1 } }, list: [{ d: 2 }, [3]] };

		deepFreeze(value);

		expect(Object.isFrozen(value)).toBe(true);
		expect(Object.isFrozen(value.a)).toBe(true);
		expect(Object.isFrozen(value.a.b)).toBe(true);
		expect(Object.isFrozen(value.list)).toBe(true);
		expect(Object.isFrozen(value.list[0])).toBe(true);
		expect(Object.isFrozen(value.list[1])).toBe(true);
	});

	test('should return the same reference', () => {
		const value = { a: 1 };

		expect(deepFreeze(value)).toBe(value);
	});

	test.each([1, 'text', true, null, undefined])('should return %s unchanged', (value) => {
		expect(deepFreeze(value)).toBe(value);
	});

	test('should stop on a cycle', () => {
		const value: { self?: unknown; child: { parent?: unknown } } = { child: {} };
		value.self = value;
		value.child.parent = value;

		expect(() => deepFreeze(value)).not.toThrow();
		expect(Object.isFrozen(value)).toBe(true);
		expect(Object.isFrozen(value.child)).toBe(true);
	});

	test('should skip an object that is already frozen', () => {
		const child = { a: 1 };
		const value = Object.freeze({ child });

		deepFreeze(value);

		expect(Object.isFrozen(child)).toBe(false);
	});
});
