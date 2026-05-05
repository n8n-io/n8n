import { deepCopy, type PlaintextExecutionContext } from 'n8n-workflow';

import { deepMerge } from '../deep-merge';

// Use Record<string, unknown> for flexible test typing
type TestObject = Record<string, unknown>;

describe('deepMerge', () => {
	describe('basic merging', () => {
		test('merges flat objects', () => {
			const target: TestObject = { a: 1, b: 2 };
			const source: TestObject = { b: 3, c: 4 };

			expect(deepMerge(target, source)).toEqual({ a: 1, b: 3, c: 4 });
		});

		test('merges nested objects recursively', () => {
			const target: TestObject = { a: 1, nested: { x: 1, y: 2 } };
			const source: TestObject = { nested: { y: 3, z: 4 } };

			expect(deepMerge(target, source)).toEqual({
				a: 1,
				nested: { x: 1, y: 3, z: 4 },
			});
		});

		test('merges deeply nested objects', () => {
			const target: TestObject = { level1: { level2: { level3: { a: 1 } } } };
			const source: TestObject = { level1: { level2: { level3: { b: 2 } } } };

			expect(deepMerge(target, source)).toEqual({
				level1: { level2: { level3: { a: 1, b: 2 } } },
			});
		});
	});

	describe('source wins for non-objects', () => {
		test('arrays from source replace arrays in target', () => {
			const target: TestObject = { arr: [1, 2, 3] };
			const source: TestObject = { arr: [4, 5] };

			expect(deepMerge(target, source)).toEqual({ arr: [4, 5] });
		});

		test('primitives from source replace primitives in target', () => {
			const target: TestObject = { value: 'old' };
			const source: TestObject = { value: 'new' };

			expect(deepMerge(target, source)).toEqual({ value: 'new' });
		});

		test('source object replaces target primitive', () => {
			const target: TestObject = { field: 'string' };
			const source: TestObject = { field: { nested: true } };

			expect(deepMerge(target, source)).toEqual({ field: { nested: true } });
		});

		test('source primitive replaces target object', () => {
			const target: TestObject = { field: { nested: true } };
			const source: TestObject = { field: 'string' };

			expect(deepMerge(target, source)).toEqual({ field: 'string' });
		});
	});

	describe('null and undefined handling', () => {
		test('returns copy of target when source is undefined', () => {
			const target: TestObject = { a: 1 };

			expect(deepMerge(target, undefined as unknown as TestObject)).toEqual({ a: 1 });
		});

		test('returns copy of target when source is null', () => {
			const target: TestObject = { a: 1 };

			expect(deepMerge(target, null as unknown as TestObject)).toEqual({ a: 1 });
		});

		test('returns source when target is undefined', () => {
			const source: TestObject = { a: 1 };

			expect(deepMerge(undefined as unknown as TestObject, source)).toEqual({ a: 1 });
		});

		test('returns source when target is null', () => {
			const source: TestObject = { a: 1 };

			expect(deepMerge(null as unknown as TestObject, source)).toEqual({ a: 1 });
		});

		test('null value in source replaces target value', () => {
			const target: TestObject = { a: { b: 1 } };
			const source: TestObject = { a: null };

			expect(deepMerge(target, source)).toEqual({ a: null });
		});
	});

	describe('PlaintextExecutionContext merging', () => {
		test('merges two PlaintextExecutionContext instances with nested credentials', () => {
			const baseContext: PlaintextExecutionContext = {
				version: 1,
				establishedAt: 1700000000000,
				source: 'webhook',
				parentExecutionId: 'parent-123',
				credentials: {
					version: 1,
					identity: 'bearer-token-abc',
					metadata: {
						source: 'authorization-header',
						extractedAt: 1700000000000,
					},
				},
			};

			const contextUpdate: Partial<PlaintextExecutionContext> = {
				credentials: {
					version: 1,
					identity: 'bearer-token-abc',
					metadata: {
						tenantId: 'tenant-456',
						environment: 'production',
					},
				},
			};

			const merged = deepMerge(baseContext, contextUpdate);

			expect(merged).toEqual({
				version: 1,
				establishedAt: 1700000000000,
				source: 'webhook',
				parentExecutionId: 'parent-123',
				credentials: {
					version: 1,
					identity: 'bearer-token-abc',
					metadata: {
						source: 'authorization-header',
						extractedAt: 1700000000000,
						tenantId: 'tenant-456',
						environment: 'production',
					},
				},
			});
		});
	});

	describe('immutability', () => {
		test('does not mutate target', () => {
			const target: TestObject = { a: 1, nested: { x: 1 } };
			const targetCopy = deepCopy(target);

			deepMerge(target, { b: 2 });

			expect(target).toEqual(targetCopy);
		});

		test('does not mutate source', () => {
			const source: TestObject = { a: 1, nested: { x: 1 } };
			const sourceCopy = deepCopy(source);

			deepMerge({ b: 2 }, source);

			expect(source).toEqual(sourceCopy);
		});

		test('returns a new object reference', () => {
			const target: TestObject = { a: 1 };
			const result = deepMerge(target, { b: 2 });

			expect(result).not.toBe(target);
		});
	});

	describe('security - prototype pollution prevention', () => {
		test('prevents __proto__ pollution', () => {
			const target: TestObject = { a: 1 };
			const maliciousSource = JSON.parse('{"__proto__": {"polluted": true}}');

			const result = deepMerge(target, maliciousSource);

			expect(result).toEqual({ a: 1 });
			expect(Object.getPrototypeOf(result).polluted).toBeUndefined();
			expect(Object.prototype).not.toHaveProperty('polluted');
		});

		test('prevents constructor pollution', () => {
			const target: TestObject = { a: 1 };
			const maliciousSource: TestObject = { constructor: { polluted: true } };

			const result = deepMerge(target, maliciousSource);

			expect(result).toEqual({ a: 1 });
			expect(result.constructor).not.toHaveProperty('polluted');
		});

		test('prevents prototype property pollution', () => {
			const target: TestObject = { a: 1 };
			const maliciousSource: TestObject = { prototype: { polluted: true } };

			const result = deepMerge(target, maliciousSource);

			expect(result).toEqual({ a: 1 });
			expect(result).not.toHaveProperty('prototype');
		});

		test('prevents nested __proto__ pollution', () => {
			const target: TestObject = { a: 1, nested: { b: 2 } };
			const maliciousSource = JSON.parse('{"nested": {"__proto__": {"polluted": true}}}');

			const result = deepMerge(target, maliciousSource);

			expect(result).toEqual({ a: 1, nested: { b: 2 } });
			expect(Object.getPrototypeOf(result.nested).polluted).toBeUndefined();
			expect(Object.prototype).not.toHaveProperty('polluted');
		});

		test('allows legitimate properties with similar names', () => {
			const target: TestObject = { a: 1 };
			const source: TestObject = { proto: 'value', _constructor: 'value2' };

			const result = deepMerge(target, source);

			expect(result).toEqual({ a: 1, proto: 'value', _constructor: 'value2' });
		});
	});
});
