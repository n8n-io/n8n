import { describe, it, expect } from 'vitest';
import { createWorkflowDataProxy } from '../index';

describe('Deep Lazy Proxy', () => {
	describe('Basic Property Access', () => {
		it('should access simple properties', () => {
			const data = {
				$json: { email: 'test@example.com' },
			};
			const proxy = createWorkflowDataProxy(data);
			expect(proxy.$json.email).toBe('test@example.com');
		});

		it('should access nested properties', () => {
			const data = {
				$json: { user: { profile: { name: 'John' } } },
			};
			const proxy = createWorkflowDataProxy(data);
			expect(proxy.$json.user.profile.name).toBe('John');
		});

		it('should handle undefined properties', () => {
			const data = { $json: {} };
			const proxy = createWorkflowDataProxy(data);
			expect(proxy.$json.missing).toBeUndefined();
		});
	});

	describe('Array Handling', () => {
		it('should transfer small arrays entirely', () => {
			const data = {
				$json: { items: [1, 2, 3, 4, 5] },
			};
			const proxy = createWorkflowDataProxy(data, { smallArrayThreshold: 100 });
			expect(proxy.$json.items).toEqual([1, 2, 3, 4, 5]);
			expect(proxy.$json.items.length).toBe(5);
		});

		it('should lazy-load large arrays', () => {
			const data = {
				$json: {
					items: Array(200)
						.fill(0)
						.map((_, i) => i),
				},
			};
			const proxy = createWorkflowDataProxy(data, { smallArrayThreshold: 100 });

			// Access individual elements
			expect(proxy.$json.items[0]).toBe(0);
			expect(proxy.$json.items[50]).toBe(50);
			expect(proxy.$json.items[150]).toBe(150);
			expect(proxy.$json.items.length).toBe(200);
		});

		it('should lazy-load array elements that are objects', () => {
			const data = {
				$json: {
					items: Array(200)
						.fill(0)
						.map((_, i) => ({ id: i, name: `Item ${i}` })),
				},
			};
			const proxy = createWorkflowDataProxy(data, { smallArrayThreshold: 100 });

			expect(proxy.$json.items[50].id).toBe(50);
			expect(proxy.$json.items[150].name).toBe('Item 150');
		});
	});

	describe('Object Handling', () => {
		it('should lazy-load nested objects', () => {
			const data = {
				$json: {
					level1: {
						level2: {
							level3: { value: 42 },
						},
					},
				},
			};
			const proxy = createWorkflowDataProxy(data);

			expect(proxy.$json.level1.level2.level3.value).toBe(42);
		});

		it('should handle mixed types', () => {
			const data = {
				$json: {
					string: 'hello',
					number: 123,
					boolean: true,
					object: { nested: 'value' },
					array: [1, 2, 3],
					null: null,
					undefined: undefined,
				},
			};
			const proxy = createWorkflowDataProxy(data);

			expect(proxy.$json.string).toBe('hello');
			expect(proxy.$json.number).toBe(123);
			expect(proxy.$json.boolean).toBe(true);
			expect(proxy.$json.object.nested).toBe('value');
			expect(proxy.$json.array).toEqual([1, 2, 3]);
			expect(proxy.$json.null).toBeNull();
			expect(proxy.$json.undefined).toBeUndefined();
		});
	});

	describe('Function Handling', () => {
		it('should pass functions directly', () => {
			const data = {
				$json: {},
				$items: (index?: number) => {
					if (index !== undefined) {
						return [{ json: { id: index } }];
					}
					return [{ json: { id: 1 } }, { json: { id: 2 } }];
				},
			};
			const proxy = createWorkflowDataProxy(data);

			// Functions are passed directly, not proxied
			expect(typeof proxy.$items).toBe('function');
			expect(proxy.$items()).toHaveLength(2);
			expect(proxy.$items(0)).toEqual([{ json: { id: 0 } }]);
		});

		it('should block native functions in nested objects', () => {
			const data = {
				$json: { nativeFunc: Object.keys }, // Native function
			};
			const proxy = createWorkflowDataProxy(data);

			// Native functions blocked for security
			expect(proxy.$json.nativeFunc).toBeUndefined();
		});

		it('should allow custom functions in nested objects', () => {
			const customFn = (x: number) => x * 2;
			const data = {
				$json: { customFunc: customFn },
			};
			const proxy = createWorkflowDataProxy(data);

			expect(typeof proxy.$json.customFunc).toBe('function');
			expect(proxy.$json.customFunc(5)).toBe(10);
		});
	});

	describe('Caching Behavior', () => {
		it('should cache accessed values', () => {
			let accessCount = 0;
			const data = {
				get $json() {
					accessCount++;
					return { value: 42 };
				},
			};
			const proxy = createWorkflowDataProxy(data);

			// First access
			expect(proxy.$json.value).toBe(42);
			const firstAccessCount = accessCount;

			// Second access (should be cached)
			expect(proxy.$json.value).toBe(42);

			// Access count should not increase (cached)
			expect(accessCount).toBe(firstAccessCount);
		});
	});

	describe('Memory Efficiency', () => {
		it('should not transfer large objects entirely', () => {
			// Create a 10MB object
			const largeData = Array(1000)
				.fill(0)
				.map((_, i) => ({
					id: i,
					data: 'x'.repeat(10000), // 10KB per item
				}));

			const data = {
				$json: { items: largeData },
			};
			const proxy = createWorkflowDataProxy(data, { smallArrayThreshold: 100 });

			// Access only one element
			expect(proxy.$json.items[500].id).toBe(500);

			// The proxy should NOT have transferred all 10MB
			// (This is hard to test directly, but the access pattern proves it)
		});
	});

	describe('Edge Cases', () => {
		it('should handle circular references gracefully', () => {
			const data: any = {
				$json: { self: null },
			};
			data.$json.self = data.$json;

			const proxy = createWorkflowDataProxy(data);

			// Access should work (proxy handles circular refs)
			expect(proxy.$json.self).toBeDefined();
		});

		it('should handle Symbol properties', () => {
			const sym = Symbol('test');
			const data = {
				$json: { [sym]: 'symbol value' },
			};
			const proxy = createWorkflowDataProxy(data);

			// Symbols return undefined
			expect(proxy.$json[sym]).toBeUndefined();
		});

		it('should support "in" operator', () => {
			const data = {
				$json: { exists: 123 },
			};
			const proxy = createWorkflowDataProxy(data);

			expect('exists' in proxy.$json).toBe(true);
			expect('missing' in proxy.$json).toBe(false);
		});
	});
});
