import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDeepLazyProxy } from '../lazy-proxy';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ivmCallOpts = { arguments: { copy: true }, result: { copy: true } };

function mockApplySync(returnValue: unknown = undefined) {
	return vi.fn().mockReturnValue(returnValue);
}

/** Install the three globalThis callbacks that createDeepLazyProxy relies on. */
function installGlobals(
	overrides: {
		getValueAtPath?: ReturnType<typeof vi.fn>;
		callFunctionAtPath?: ReturnType<typeof vi.fn>;
		getArrayElement?: ReturnType<typeof vi.fn>;
	} = {},
) {
	const getValueAtPath = overrides.getValueAtPath ?? mockApplySync();
	const callFunctionAtPath = overrides.callFunctionAtPath ?? mockApplySync();
	const getArrayElement = overrides.getArrayElement ?? mockApplySync();

	(globalThis as any).__getValueAtPath = { applySync: getValueAtPath };
	(globalThis as any).__callFunctionAtPath = { applySync: callFunctionAtPath };
	(globalThis as any).__getArrayElement = { applySync: getArrayElement };

	return { getValueAtPath, callFunctionAtPath, getArrayElement };
}

function cleanupGlobals() {
	delete (globalThis as any).__getValueAtPath;
	delete (globalThis as any).__callFunctionAtPath;
	delete (globalThis as any).__getArrayElement;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createDeepLazyProxy', () => {
	let mocks: ReturnType<typeof installGlobals>;

	beforeEach(() => {
		mocks = installGlobals();
	});

	afterEach(() => {
		cleanupGlobals();
	});

	// -----------------------------------------------------------------------
	// 1. Special properties
	// -----------------------------------------------------------------------

	describe('special properties', () => {
		it('returns undefined for Symbol.toStringTag', () => {
			const proxy = createDeepLazyProxy();
			expect(proxy[Symbol.toStringTag]).toBeUndefined();
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('returns undefined for Symbol.toPrimitive', () => {
			const proxy = createDeepLazyProxy();
			expect(proxy[Symbol.toPrimitive]).toBeUndefined();
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('returns true for __isProxy', () => {
			const proxy = createDeepLazyProxy();
			expect(proxy.__isProxy).toBe(true);
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('returns empty array for __path when basePath is default', () => {
			const proxy = createDeepLazyProxy();
			expect(proxy.__path).toEqual([]);
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('returns basePath for __path when basePath is provided', () => {
			const proxy = createDeepLazyProxy(['$json', 'user']);
			expect(proxy.__path).toEqual(['$json', 'user']);
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('toString() returns "[object Object]"', () => {
			const proxy = createDeepLazyProxy();
			expect(proxy.toString()).toBe('[object Object]');
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('valueOf() returns the proxy target', () => {
			const proxy = createDeepLazyProxy();
			const val = proxy.valueOf();
			expect(typeof val).toBe('object');
			expect(val).not.toBeNull();
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});
	});

	// -----------------------------------------------------------------------
	// 2. Primitive values
	// -----------------------------------------------------------------------

	describe('primitive values', () => {
		it('fetches and returns a string', () => {
			mocks.getValueAtPath.mockReturnValue('hello');
			const proxy = createDeepLazyProxy();
			expect(proxy.name).toBe('hello');
			expect(mocks.getValueAtPath).toHaveBeenCalledWith(null, [['name']], ivmCallOpts);
		});

		it('fetches and returns a number', () => {
			mocks.getValueAtPath.mockReturnValue(42);
			const proxy = createDeepLazyProxy();
			expect(proxy.count).toBe(42);
		});

		it('fetches and returns a boolean', () => {
			mocks.getValueAtPath.mockReturnValue(true);
			const proxy = createDeepLazyProxy();
			expect(proxy.active).toBe(true);
		});

		it('fetches and returns null', () => {
			mocks.getValueAtPath.mockReturnValue(null);
			const proxy = createDeepLazyProxy();
			expect(proxy.field).toBeNull();
		});

		it('fetches and returns undefined', () => {
			mocks.getValueAtPath.mockReturnValue(undefined);
			const proxy = createDeepLazyProxy();
			expect(proxy.missing).toBeUndefined();
		});

		it('fetches and returns an empty string', () => {
			mocks.getValueAtPath.mockReturnValue('');
			const proxy = createDeepLazyProxy();
			expect(proxy.empty).toBe('');
		});

		it('fetches and returns zero', () => {
			mocks.getValueAtPath.mockReturnValue(0);
			const proxy = createDeepLazyProxy();
			expect(proxy.zero).toBe(0);
		});
	});

	// -----------------------------------------------------------------------
	// 3. Caching
	// -----------------------------------------------------------------------

	describe('caching', () => {
		it('does not re-fetch on second access', () => {
			mocks.getValueAtPath.mockReturnValue('cached');
			const proxy = createDeepLazyProxy();
			expect(proxy.x).toBe('cached');
			expect(proxy.x).toBe('cached');
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);
		});

		it('caches null values', () => {
			mocks.getValueAtPath.mockReturnValue(null);
			const proxy = createDeepLazyProxy();
			proxy.n;
			proxy.n;
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);
		});

		it('caches undefined values', () => {
			mocks.getValueAtPath.mockReturnValue(undefined);
			const proxy = createDeepLazyProxy();
			proxy.u;
			proxy.u;
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);
		});
	});

	// -----------------------------------------------------------------------
	// 4. Function metadata
	// -----------------------------------------------------------------------

	describe('function metadata', () => {
		it('creates a callable wrapper for function metadata', () => {
			mocks.getValueAtPath.mockReturnValue({ __isFunction: true, __name: 'myFn' });
			const proxy = createDeepLazyProxy();
			expect(typeof proxy.myFn).toBe('function');
		});

		it('invokes __callFunctionAtPath with correct args when called', () => {
			mocks.getValueAtPath.mockReturnValue({ __isFunction: true, __name: 'myFn' });
			mocks.callFunctionAtPath.mockReturnValue('result');
			const proxy = createDeepLazyProxy();
			proxy.myFn('a', 1);
			expect(mocks.callFunctionAtPath).toHaveBeenCalledWith(null, [['myFn'], 'a', 1], ivmCallOpts);
		});

		it('returns the callback result from the function wrapper', () => {
			mocks.getValueAtPath.mockReturnValue({ __isFunction: true, __name: 'myFn' });
			mocks.callFunctionAtPath.mockReturnValue(99);
			const proxy = createDeepLazyProxy();
			expect(proxy.myFn()).toBe(99);
		});

		it('caches the function wrapper', () => {
			mocks.getValueAtPath.mockReturnValue({ __isFunction: true, __name: 'myFn' });
			const proxy = createDeepLazyProxy();
			const first = proxy.myFn;
			const second = proxy.myFn;
			expect(first).toBe(second);
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);
		});
	});

	// -----------------------------------------------------------------------
	// 5. Array metadata (always lazy-loaded via array proxy)
	// -----------------------------------------------------------------------

	describe('array metadata', () => {
		it('creates an array proxy', () => {
			mocks.getValueAtPath.mockReturnValue({ __isArray: true, __length: 100 });
			const proxy = createDeepLazyProxy();
			expect(proxy.items).toBeDefined();
		});

		it('array proxy .length returns __length', () => {
			mocks.getValueAtPath.mockReturnValue({ __isArray: true, __length: 100 });
			const proxy = createDeepLazyProxy();
			expect(proxy.items.length).toBe(100);
		});

		it('caches the array proxy', () => {
			mocks.getValueAtPath.mockReturnValue({ __isArray: true, __length: 3 });
			const proxy = createDeepLazyProxy();
			const first = proxy.arr;
			const second = proxy.arr;
			expect(first).toBe(second);
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);
		});
	});

	// -----------------------------------------------------------------------
	// 7. Array proxy — element access
	// -----------------------------------------------------------------------

	describe('array proxy element access', () => {
		function proxyWithLargeArray(length = 10) {
			mocks.getValueAtPath.mockReturnValue({ __isArray: true, __length: length });
			return createDeepLazyProxy();
		}

		it('fetches a primitive element via __getArrayElement', () => {
			const proxy = proxyWithLargeArray();
			mocks.getArrayElement.mockReturnValue(42);
			expect(proxy.items[0]).toBe(42);
			expect(mocks.getArrayElement).toHaveBeenCalledWith(null, [['items'], 0], ivmCallOpts);
		});

		it('creates a nested proxy for object elements', () => {
			const proxy = proxyWithLargeArray();
			mocks.getArrayElement.mockReturnValue({ __isObject: true, __keys: ['a'] });
			const element = proxy.items[0];
			expect(element.__isProxy).toBe(true);
			expect(element.__path).toEqual(['items', '0']);
		});

		it('creates a nested proxy for array elements that are arrays', () => {
			const proxy = proxyWithLargeArray();
			mocks.getArrayElement.mockReturnValue({ __isArray: true, __length: 5 });
			const element = proxy.items[0];
			expect(element.__isProxy).toBe(true);
			expect(element.__path).toEqual(['items', '0']);
		});

		it('caches elements after first access', () => {
			const proxy = proxyWithLargeArray();
			mocks.getArrayElement.mockReturnValue('val');
			proxy.items[0];
			proxy.items[0];
			expect(mocks.getArrayElement).toHaveBeenCalledTimes(1);
		});

		it('passes correct path for nested arrays', () => {
			mocks.getValueAtPath.mockReturnValue({ __isArray: true, __length: 5 });
			const proxy = createDeepLazyProxy(['data']);
			mocks.getArrayElement.mockReturnValue('val');
			proxy.list[3];
			expect(mocks.getArrayElement).toHaveBeenCalledWith(null, [['data', 'list'], 3], ivmCallOpts);
		});

		it('returns undefined for non-numeric non-length properties', () => {
			const proxy = proxyWithLargeArray();
			expect(proxy.items.foo).toBeUndefined();
			expect(mocks.getArrayElement).not.toHaveBeenCalled();
		});

		it('does not intercept negative indices', () => {
			const proxy = proxyWithLargeArray();
			// -1 is NaN? No, Number('-1') === -1 which is not NaN, but -1 >= 0 is false
			proxy.items[-1];
			expect(mocks.getArrayElement).not.toHaveBeenCalled();
		});
	});

	// -----------------------------------------------------------------------
	// 8. Object metadata
	// -----------------------------------------------------------------------

	describe('object metadata', () => {
		it('creates a nested proxy for object metadata', () => {
			mocks.getValueAtPath.mockReturnValue({ __isObject: true, __keys: ['a', 'b'] });
			const proxy = createDeepLazyProxy();
			expect(proxy.obj.__isProxy).toBe(true);
		});

		it('nested proxy has the correct path', () => {
			mocks.getValueAtPath.mockReturnValue({ __isObject: true, __keys: ['a'] });
			const proxy = createDeepLazyProxy();
			expect(proxy.obj.__path).toEqual(['obj']);
		});

		it('deep nesting builds correct paths', () => {
			mocks.getValueAtPath.mockReturnValue({ __isObject: true, __keys: ['x'] });
			const proxy = createDeepLazyProxy();

			// Each level triggers __getValueAtPath and creates a nested proxy
			// a -> returns object metadata
			const a = proxy.a;
			expect(mocks.getValueAtPath).toHaveBeenLastCalledWith(null, [['a']], ivmCallOpts);

			// a.b -> returns object metadata
			const b = a.b;
			expect(mocks.getValueAtPath).toHaveBeenLastCalledWith(null, [['a', 'b']], ivmCallOpts);

			// a.b.c -> returns object metadata
			const c = b.c;
			expect(mocks.getValueAtPath).toHaveBeenLastCalledWith(null, [['a', 'b', 'c']], ivmCallOpts);
			expect(c.__path).toEqual(['a', 'b', 'c']);
		});

		it('caches the nested proxy', () => {
			mocks.getValueAtPath.mockReturnValue({ __isObject: true, __keys: ['a'] });
			const proxy = createDeepLazyProxy();
			const first = proxy.obj;
			const second = proxy.obj;
			expect(first).toBe(second);
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);
		});
	});

	// -----------------------------------------------------------------------
	// 9. basePath propagation
	// -----------------------------------------------------------------------

	describe('basePath propagation', () => {
		it('prepends basePath to property paths', () => {
			mocks.getValueAtPath.mockReturnValue('val');
			const proxy = createDeepLazyProxy(['$json']);
			proxy.user;
			expect(mocks.getValueAtPath).toHaveBeenCalledWith(null, [['$json', 'user']], ivmCallOpts);
		});

		it('nested proxies inherit full path', () => {
			mocks.getValueAtPath.mockReturnValue({ __isObject: true, __keys: ['name'] });
			const proxy = createDeepLazyProxy(['$json']);
			const user = proxy.user;
			expect(user.__path).toEqual(['$json', 'user']);

			// Accessing a property on the nested proxy should build the full path
			mocks.getValueAtPath.mockReturnValue('Alice');
			user.name;
			expect(mocks.getValueAtPath).toHaveBeenLastCalledWith(
				null,
				[['$json', 'user', 'name']],
				ivmCallOpts,
			);
		});
	});

	// -----------------------------------------------------------------------
	// 10. has trap
	// -----------------------------------------------------------------------

	describe('has trap ("in" operator)', () => {
		it('returns false for symbols', () => {
			const proxy = createDeepLazyProxy();
			expect(Symbol.toStringTag in proxy).toBe(false);
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('returns true for cached properties without re-fetching', () => {
			mocks.getValueAtPath.mockReturnValue('value');
			const proxy = createDeepLazyProxy();

			// Access to populate cache
			proxy.x;
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);

			// 'in' check should use cache
			expect('x' in proxy).toBe(true);
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);
		});

		it('returns true for existing (non-undefined) properties', () => {
			mocks.getValueAtPath.mockReturnValue('value');
			const proxy = createDeepLazyProxy();
			expect('prop' in proxy).toBe(true);
		});

		it('returns true for null properties (exists but null)', () => {
			mocks.getValueAtPath.mockReturnValue(null);
			const proxy = createDeepLazyProxy();
			expect('prop' in proxy).toBe(true);
		});

		it('returns false for undefined (non-existent) properties', () => {
			mocks.getValueAtPath.mockReturnValue(undefined);
			const proxy = createDeepLazyProxy();
			expect('prop' in proxy).toBe(false);
		});

		it('passes the correct path including basePath', () => {
			mocks.getValueAtPath.mockReturnValue('val');
			const proxy = createDeepLazyProxy(['$json']);
			'foo' in proxy;
			expect(mocks.getValueAtPath).toHaveBeenCalledWith(null, [['$json', 'foo']], ivmCallOpts);
		});
	});

	// -----------------------------------------------------------------------
	// 11. Edge cases
	// -----------------------------------------------------------------------

	describe('edge cases', () => {
		it('plain object with __isFunction=false is treated as primitive', () => {
			mocks.getValueAtPath.mockReturnValue({ __isFunction: false, other: 1 });
			const proxy = createDeepLazyProxy();
			const val = proxy.prop;
			// Not a function — falls through to "primitive" caching
			expect(typeof val).toBe('object');
			expect(val.__isFunction).toBe(false);
			expect(val.other).toBe(1);
		});

		it('plain object with __isArray=false is treated as primitive', () => {
			mocks.getValueAtPath.mockReturnValue({ __isArray: false, data: 'x' });
			const proxy = createDeepLazyProxy();
			const val = proxy.prop;
			expect(typeof val).toBe('object');
			expect(val.data).toBe('x');
		});

		it('handles multiple independent properties', () => {
			mocks.getValueAtPath
				.mockReturnValueOnce('a-val')
				.mockReturnValueOnce('b-val')
				.mockReturnValueOnce('c-val');
			const proxy = createDeepLazyProxy();
			expect(proxy.a).toBe('a-val');
			expect(proxy.b).toBe('b-val');
			expect(proxy.c).toBe('c-val');

			expect(mocks.getValueAtPath).toHaveBeenNthCalledWith(1, null, [['a']], ivmCallOpts);
			expect(mocks.getValueAtPath).toHaveBeenNthCalledWith(2, null, [['b']], ivmCallOpts);
			expect(mocks.getValueAtPath).toHaveBeenNthCalledWith(3, null, [['c']], ivmCallOpts);
		});

		it('array proxy index 0 works correctly (falsy index)', () => {
			mocks.getValueAtPath.mockReturnValue({ __isArray: true, __length: 3 });
			const proxy = createDeepLazyProxy();
			mocks.getArrayElement.mockReturnValue('first');
			expect(proxy.arr[0]).toBe('first');
			expect(mocks.getArrayElement).toHaveBeenCalledWith(null, [['arr'], 0], ivmCallOpts);
		});

		it('array proxy does not intercept negative indices', () => {
			mocks.getValueAtPath.mockReturnValue({ __isArray: true, __length: 3 });
			const proxy = createDeepLazyProxy();
			proxy.arr[-1];
			expect(mocks.getArrayElement).not.toHaveBeenCalled();
		});

		it('function wrapper on a basePath proxy passes full path', () => {
			mocks.getValueAtPath.mockReturnValue({ __isFunction: true, __name: '$items' });
			mocks.callFunctionAtPath.mockReturnValue([]);
			const proxy = createDeepLazyProxy(['$root']);
			proxy.fn();
			expect(mocks.callFunctionAtPath).toHaveBeenCalledWith(null, [['$root', 'fn']], ivmCallOpts);
		});
	});
});
