import { reactive } from 'vue';

import { deepFreeze } from './objectUtils';

describe('deepFreeze', () => {
	test('should freeze nested objects and arrays at every level', () => {
		const value = { a: { b: { c: { d: 1 } } }, list: [{ e: [{ f: 2 }] }, [3]] };

		deepFreeze(value);

		expect(Object.isFrozen(value)).toBe(true);
		expect(Object.isFrozen(value.a)).toBe(true);
		expect(Object.isFrozen(value.a.b)).toBe(true);
		expect(Object.isFrozen(value.a.b.c)).toBe(true);
		expect(Object.isFrozen(value.list)).toBe(true);
		expect(Object.isFrozen(value.list[0])).toBe(true);
		expect(Object.isFrozen(value.list[1])).toBe(true);
		const [first] = value.list as [{ e: Array<{ f: number }> }];
		expect(Object.isFrozen(first.e)).toBe(true);
		expect(Object.isFrozen(first.e[0])).toBe(true);
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

	test('should freeze the children of an object that is already frozen', () => {
		const child = { grandchild: { a: 1 } };
		const value = Object.freeze({ child });

		deepFreeze(value);

		expect(Object.isFrozen(child)).toBe(true);
		expect(Object.isFrozen(child.grandchild)).toBe(true);
	});

	test('should stop on a cycle through a frozen object', () => {
		const child: { parent?: unknown; leaf: { a: number } } = { leaf: { a: 1 } };
		const value = { child };
		child.parent = value;
		Object.freeze(child);

		expect(() => deepFreeze(value)).not.toThrow();
		expect(Object.isFrozen(value)).toBe(true);
		expect(Object.isFrozen(child.leaf)).toBe(true);
	});

	test('should throw on a typed array with elements', () => {
		expect(() => deepFreeze({ bytes: new Uint8Array([1]) })).toThrow(TypeError);
	});

	test('should throw on a Vue reactive proxy with object children', () => {
		expect(() => deepFreeze(reactive({ child: { a: 1 } }))).toThrow(TypeError);
	});

	test('should not freeze the contents of a Map', () => {
		const entry = { a: 1 };
		const map = new Map([['key', entry]]);

		deepFreeze({ map });

		expect(Object.isFrozen(map)).toBe(true);
		expect(Object.isFrozen(entry)).toBe(false);
	});
});
