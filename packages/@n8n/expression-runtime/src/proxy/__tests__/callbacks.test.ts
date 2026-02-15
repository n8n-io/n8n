import { describe, it, expect } from 'vitest';
import { createProxyCallbacks } from '../callbacks';

describe('Proxy Callbacks', () => {
	describe('getValueAtPath', () => {
		it('should navigate simple paths', () => {
			const data = {
				$json: { email: 'test@example.com' },
			};
			const callbacks = createProxyCallbacks(data);

			const value = callbacks.getValueAtPath(['$json', 'email']);
			expect(value).toBe('test@example.com');
		});

		it('should navigate nested paths', () => {
			const data = {
				$json: {
					user: {
						profile: {
							name: 'John',
						},
					},
				},
			};
			const callbacks = createProxyCallbacks(data);

			const value = callbacks.getValueAtPath(['$json', 'user', 'profile', 'name']);
			expect(value).toBe('John');
		});

		it('should return undefined for missing paths', () => {
			const data = { $json: {} };
			const callbacks = createProxyCallbacks(data);

			const value = callbacks.getValueAtPath(['$json', 'missing']);
			expect(value).toBeUndefined();
		});

		it('should return null for null values', () => {
			const data = { $json: { value: null } };
			const callbacks = createProxyCallbacks(data);

			const value = callbacks.getValueAtPath(['$json', 'value']);
			expect(value).toBeNull();
		});

		it('should return metadata for small arrays', () => {
			const data = {
				$json: { items: [1, 2, 3] },
			};
			const callbacks = createProxyCallbacks(data, { smallArrayThreshold: 100 });

			const value = callbacks.getValueAtPath(['$json', 'items']);
			expect(value).toEqual({
				__isArray: true,
				__length: 3,
				__data: [1, 2, 3],
			});
		});

		it('should return metadata without data for large arrays', () => {
			const data = {
				$json: { items: Array(200).fill(0) },
			};
			const callbacks = createProxyCallbacks(data, { smallArrayThreshold: 100 });

			const value = callbacks.getValueAtPath(['$json', 'items']);
			expect(value).toEqual({
				__isArray: true,
				__length: 200,
				__data: null,
			});
		});

		it('should return metadata for objects', () => {
			const data = {
				$json: {
					user: {
						name: 'John',
						email: 'john@example.com',
					},
				},
			};
			const callbacks = createProxyCallbacks(data);

			const value = callbacks.getValueAtPath(['$json', 'user']);
			expect(value).toEqual({
				__isObject: true,
				__keys: ['name', 'email'],
			});
		});

		it('should return custom functions', () => {
			const customFn = (x: number) => x * 2;
			const data = {
				$json: { func: customFn },
			};
			const callbacks = createProxyCallbacks(data);

			const value = callbacks.getValueAtPath(['$json', 'func']);
			expect(typeof value).toBe('function');
			expect((value as (x: number) => number)(5)).toBe(10);
		});

		it('should block native functions', () => {
			const data = {
				$json: { nativeFunc: Object.keys },
			};
			const callbacks = createProxyCallbacks(data);

			const value = callbacks.getValueAtPath(['$json', 'nativeFunc']);
			expect(value).toBeUndefined();
		});

		it('should handle different primitive types', () => {
			const data = {
				$json: {
					string: 'hello',
					number: 42,
					boolean: true,
					zero: 0,
					emptyString: '',
				},
			};
			const callbacks = createProxyCallbacks(data);

			expect(callbacks.getValueAtPath(['$json', 'string'])).toBe('hello');
			expect(callbacks.getValueAtPath(['$json', 'number'])).toBe(42);
			expect(callbacks.getValueAtPath(['$json', 'boolean'])).toBe(true);
			expect(callbacks.getValueAtPath(['$json', 'zero'])).toBe(0);
			expect(callbacks.getValueAtPath(['$json', 'emptyString'])).toBe('');
		});
	});

	describe('getArrayElement', () => {
		it('should return primitive array elements', () => {
			const data = {
				$json: { items: [10, 20, 30, 40, 50] },
			};
			const callbacks = createProxyCallbacks(data);

			expect(callbacks.getArrayElement(['$json', 'items'], 0)).toBe(10);
			expect(callbacks.getArrayElement(['$json', 'items'], 2)).toBe(30);
			expect(callbacks.getArrayElement(['$json', 'items'], 4)).toBe(50);
		});

		it('should return metadata for object array elements', () => {
			const data = {
				$json: {
					items: [
						{ id: 1, name: 'Item 1' },
						{ id: 2, name: 'Item 2' },
					],
				},
			};
			const callbacks = createProxyCallbacks(data);

			const element = callbacks.getArrayElement(['$json', 'items'], 0);
			expect(element).toEqual({
				__isObject: true,
				__keys: ['id', 'name'],
			});
		});

		it('should return metadata for nested array elements', () => {
			const data = {
				$json: {
					matrix: [
						[1, 2, 3],
						[4, 5, 6],
					],
				},
			};
			const callbacks = createProxyCallbacks(data, { smallArrayThreshold: 10 });

			const element = callbacks.getArrayElement(['$json', 'matrix'], 0);
			expect(element).toEqual({
				__isArray: true,
				__length: 3,
				__data: [1, 2, 3],
			});
		});

		it('should return undefined for out-of-bounds index', () => {
			const data = {
				$json: { items: [1, 2, 3] },
			};
			const callbacks = createProxyCallbacks(data);

			expect(callbacks.getArrayElement(['$json', 'items'], 10)).toBeUndefined();
		});

		it('should return undefined for non-array paths', () => {
			const data = {
				$json: { notArray: 'string' },
			};
			const callbacks = createProxyCallbacks(data);

			expect(callbacks.getArrayElement(['$json', 'notArray'], 0)).toBeUndefined();
		});

		it('should handle nested array paths', () => {
			const data = {
				$json: {
					nested: {
						deep: {
							items: [100, 200, 300],
						},
					},
				},
			};
			const callbacks = createProxyCallbacks(data);

			expect(callbacks.getArrayElement(['$json', 'nested', 'deep', 'items'], 1)).toBe(200);
		});
	});

	describe('Configuration Options', () => {
		it('should respect custom smallArrayThreshold', () => {
			const data = {
				$json: { items: Array(50).fill(0) },
			};

			// With threshold 100: should include data
			const callbacks1 = createProxyCallbacks(data, { smallArrayThreshold: 100 });
			const value1 = callbacks1.getValueAtPath(['$json', 'items']);
			expect(value1).toHaveProperty('__data');
			expect((value1 as any).__data).not.toBeNull();

			// With threshold 10: should not include data
			const callbacks2 = createProxyCallbacks(data, { smallArrayThreshold: 10 });
			const value2 = callbacks2.getValueAtPath(['$json', 'items']);
			expect(value2).toHaveProperty('__data', null);
		});
	});
});
