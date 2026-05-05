import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDeepLazyProxy, isLazyProxy, getProxyPath } from '../lazy-proxy';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ivmCallOpts = { arguments: { copy: true }, result: { copy: true } };

function mockApplySync(returnValue: unknown = undefined) {
	return vi.fn().mockReturnValue(returnValue);
}

/** Create mock callbacks that createDeepLazyProxy expects. */
function createMockCallbacks(
	overrides: {
		getValueAtPath?: ReturnType<typeof vi.fn>;
		callFunctionAtPath?: ReturnType<typeof vi.fn>;
		getArrayElement?: ReturnType<typeof vi.fn>;
	} = {},
) {
	const getValueAtPath = overrides.getValueAtPath ?? mockApplySync();
	const callFunctionAtPath = overrides.callFunctionAtPath ?? mockApplySync();
	const getArrayElement = overrides.getArrayElement ?? mockApplySync();

	const callbacks = {
		getValueAtPath: { applySync: getValueAtPath },
		callFunctionAtPath: { applySync: callFunctionAtPath },
		getArrayElement: { applySync: getArrayElement },
	};

	return { getValueAtPath, callFunctionAtPath, getArrayElement, callbacks };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createDeepLazyProxy', () => {
	let mocks: ReturnType<typeof createMockCallbacks>;

	beforeEach(() => {
		mocks = createMockCallbacks();
	});

	// Helper to create proxy with current mocks
	function proxy(basePath?: string[], knownKeys?: string[]) {
		return createDeepLazyProxy(basePath, knownKeys, mocks.callbacks);
	}

	// -----------------------------------------------------------------------
	// 1. Special properties
	// -----------------------------------------------------------------------

	describe('special properties', () => {
		it('returns undefined for Symbol.toStringTag', () => {
			const p = proxy();
			expect(p[Symbol.toStringTag]).toBeUndefined();
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('returns undefined for Symbol.toPrimitive', () => {
			const p = proxy();
			expect(p[Symbol.toPrimitive]).toBeUndefined();
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('toString() returns "[object Object]"', () => {
			const p = proxy();
			expect(p.toString()).toBe('[object Object]');
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('valueOf() returns the proxy target', () => {
			const p = proxy();
			const val = p.valueOf();
			expect(typeof val).toBe('object');
			expect(val).not.toBeNull();
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});
	});

	// -----------------------------------------------------------------------
	// 1b. Proxy identity helpers (isLazyProxy / getProxyPath)
	// -----------------------------------------------------------------------

	describe('proxy identity helpers', () => {
		it('isLazyProxy() returns true for a proxy', () => {
			const p = proxy();
			expect(isLazyProxy(p)).toBe(true);
		});

		it('isLazyProxy() returns false for plain objects', () => {
			expect(isLazyProxy({})).toBe(false);
			expect(isLazyProxy(null)).toBe(false);
			expect(isLazyProxy('string')).toBe(false);
		});

		it('getProxyPath() returns [] when no basePath is provided', () => {
			const p = proxy();
			expect(getProxyPath(p)).toEqual([]);
		});

		it('getProxyPath() returns the provided basePath', () => {
			const p = proxy(['$json', 'user']);
			expect(getProxyPath(p)).toEqual(['$json', 'user']);
		});

		it('getProxyPath() returns undefined for non-proxies', () => {
			expect(getProxyPath({})).toBeUndefined();
		});
	});

	// -----------------------------------------------------------------------
	// 2. Primitive values
	// -----------------------------------------------------------------------

	describe('primitive values', () => {
		it('fetches and returns undefined', () => {
			mocks.getValueAtPath.mockReturnValue(undefined);
			const p = proxy();
			expect(p.missing).toBeUndefined();
		});
	});

	// -----------------------------------------------------------------------
	// 3. Caching
	// -----------------------------------------------------------------------

	describe('caching', () => {
		it('does not re-fetch on second access', () => {
			mocks.getValueAtPath.mockReturnValue('cached');
			const p = proxy();
			expect(p.x).toBe('cached');
			expect(p.x).toBe('cached');
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);
		});

		it('caches null values', () => {
			mocks.getValueAtPath.mockReturnValue(null);
			const p = proxy();
			p.n;
			p.n;
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);
		});

		it('caches undefined values', () => {
			mocks.getValueAtPath.mockReturnValue(undefined);
			const p = proxy();
			p.u;
			p.u;
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);
		});
	});

	// -----------------------------------------------------------------------
	// 4. Function metadata
	// -----------------------------------------------------------------------

	describe('function metadata', () => {
		it('creates a callable wrapper for function metadata', () => {
			mocks.getValueAtPath.mockReturnValue({ __isFunction: true, __name: 'myFn' });
			const p = proxy();
			expect(typeof p.myFn).toBe('function');
		});

		it('invokes __callFunctionAtPath with correct args when called', () => {
			mocks.getValueAtPath.mockReturnValue({ __isFunction: true, __name: 'myFn' });
			mocks.callFunctionAtPath.mockReturnValue('result');
			const p = proxy();
			p.myFn('a', 1);
			expect(mocks.callFunctionAtPath).toHaveBeenCalledWith(null, [['myFn'], 'a', 1], ivmCallOpts);
		});

		it('caches the function wrapper', () => {
			mocks.getValueAtPath.mockReturnValue({ __isFunction: true, __name: 'myFn' });
			const p = proxy();
			const first = p.myFn;
			const second = p.myFn;
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
			const p = proxy();
			expect(p.items).toBeDefined();
		});

		it('caches the array proxy', () => {
			mocks.getValueAtPath.mockReturnValue({ __isArray: true, __length: 3 });
			const p = proxy();
			const first = p.arr;
			const second = p.arr;
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
			return proxy();
		}

		it('creates a nested proxy for object elements', () => {
			const p = proxyWithLargeArray();
			mocks.getArrayElement.mockReturnValue({ __isObject: true, __keys: ['a'] });
			const element = p.items[0];
			expect(isLazyProxy(element)).toBe(true);
			expect(getProxyPath(element)).toEqual(['items', '0']);
		});

		it('creates a nested proxy for array elements that are arrays', () => {
			const p = proxyWithLargeArray();
			mocks.getArrayElement.mockReturnValue({ __isArray: true, __length: 5 });
			const element = p.items[0];
			expect(isLazyProxy(element)).toBe(true);
			expect(getProxyPath(element)).toEqual(['items', '0']);
		});

		it('does not make an extra __getValueAtPath call when Object.keys() is used on an object element', () => {
			const p = proxyWithLargeArray();
			mocks.getArrayElement.mockReturnValue({ __isObject: true, __keys: ['a', 'b'] });
			const element = p.items[0];
			expect(isLazyProxy(element)).toBe(true);
			// Reset call counts after element access
			mocks.getValueAtPath.mockClear();
			// Object.keys() triggers ownKeys trap — should NOT call __getValueAtPath
			// because the keys were already returned by __getArrayElement
			const keys = Object.keys(element);
			expect(keys).toEqual(['a', 'b']);
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('caches elements after first access', () => {
			const p = proxyWithLargeArray();
			mocks.getArrayElement.mockReturnValue('val');
			p.items[0];
			p.items[0];
			expect(mocks.getArrayElement).toHaveBeenCalledTimes(1);
		});

		it('passes correct path for nested arrays', () => {
			mocks.getValueAtPath.mockReturnValue({ __isArray: true, __length: 5 });
			const p = proxy(['data']);
			mocks.getArrayElement.mockReturnValue('val');
			p.list[3];
			expect(mocks.getArrayElement).toHaveBeenCalledWith(null, [['data', 'list'], 3], ivmCallOpts);
		});

		it('returns undefined for non-numeric non-length properties', () => {
			const p = proxyWithLargeArray();
			expect(p.items.foo).toBeUndefined();
			expect(mocks.getArrayElement).not.toHaveBeenCalled();
		});

		it('does not intercept negative indices', () => {
			const p = proxyWithLargeArray();
			// -1 is NaN? No, Number('-1') === -1 which is not NaN, but -1 >= 0 is false
			p.items[-1];
			expect(mocks.getArrayElement).not.toHaveBeenCalled();
		});
	});

	// -----------------------------------------------------------------------
	// 8. Object metadata
	// -----------------------------------------------------------------------

	describe('object metadata', () => {
		it('creates a nested proxy for object metadata', () => {
			mocks.getValueAtPath.mockReturnValue({ __isObject: true, __keys: ['a', 'b'] });
			const p = proxy();
			expect(isLazyProxy(p.obj)).toBe(true);
		});

		it('nested proxy has the correct path', () => {
			mocks.getValueAtPath.mockReturnValue({ __isObject: true, __keys: ['a'] });
			const p = proxy();
			expect(getProxyPath(p.obj)).toEqual(['obj']);
		});

		it('deep nesting builds correct paths', () => {
			mocks.getValueAtPath.mockReturnValue({ __isObject: true, __keys: ['x'] });
			const p = proxy();

			// Each level triggers __getValueAtPath and creates a nested proxy
			// a -> returns object metadata
			const a = p.a;
			expect(mocks.getValueAtPath).toHaveBeenLastCalledWith(null, [['a']], ivmCallOpts);

			// a.b -> returns object metadata
			const b = a.b;
			expect(mocks.getValueAtPath).toHaveBeenLastCalledWith(null, [['a', 'b']], ivmCallOpts);

			// a.b.c -> returns object metadata
			const c = b.c;
			expect(mocks.getValueAtPath).toHaveBeenLastCalledWith(null, [['a', 'b', 'c']], ivmCallOpts);
			expect(getProxyPath(c)).toEqual(['a', 'b', 'c']);
		});

		it('caches the nested proxy', () => {
			mocks.getValueAtPath.mockReturnValue({ __isObject: true, __keys: ['a'] });
			const p = proxy();
			const first = p.obj;
			const second = p.obj;
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
			const p = proxy(['$json']);
			p.user;
			expect(mocks.getValueAtPath).toHaveBeenCalledWith(null, [['$json', 'user']], ivmCallOpts);
		});

		it('nested proxies inherit full path', () => {
			mocks.getValueAtPath.mockReturnValue({ __isObject: true, __keys: ['name'] });
			const p = proxy(['$json']);
			const user = p.user;
			expect(getProxyPath(user)).toEqual(['$json', 'user']);

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
			const p = proxy();
			expect(Symbol.toStringTag in p).toBe(false);
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('returns true for cached properties without re-fetching', () => {
			mocks.getValueAtPath.mockReturnValue('value');
			const p = proxy();

			// Access to populate cache
			p.x;
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);

			// 'in' check should use cache
			expect('x' in p).toBe(true);
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);
		});

		it('returns true for existing (non-undefined) properties', () => {
			mocks.getValueAtPath.mockReturnValue('value');
			const p = proxy();
			expect('prop' in p).toBe(true);
		});

		it('returns true for null properties (exists but null)', () => {
			mocks.getValueAtPath.mockReturnValue(null);
			const p = proxy();
			expect('prop' in p).toBe(true);
		});

		it('returns false for undefined (non-existent) properties', () => {
			mocks.getValueAtPath.mockReturnValue(undefined);
			const p = proxy();
			expect('prop' in p).toBe(false);
		});

		it('passes the correct path including basePath', () => {
			mocks.getValueAtPath.mockReturnValue('val');
			const p = proxy(['$json']);
			'foo' in p;
			expect(mocks.getValueAtPath).toHaveBeenCalledWith(null, [['$json', 'foo']], ivmCallOpts);
		});
	});

	// -----------------------------------------------------------------------
	// 10b. Error sentinel propagation
	// -----------------------------------------------------------------------

	describe('error sentinel propagation', () => {
		const sentinel = { __isError: true, name: 'TypeError', message: 'boom' };

		it('does not cache the sentinel when __getArrayElement returns an error', () => {
			mocks.getValueAtPath.mockReturnValue({ __isArray: true, __length: 3 });
			mocks.getArrayElement.mockReturnValue(sentinel);
			const p = proxy();
			expect(() => p.arr[0]).toThrow();
			// Should call again on second access (not cached as a value)
			expect(() => p.arr[0]).toThrow();
			expect(mocks.getArrayElement).toHaveBeenCalledTimes(2);
		});
	});

	// -----------------------------------------------------------------------
	// 11. Edge cases
	// -----------------------------------------------------------------------

	describe('edge cases', () => {
		it('plain object with __isFunction=false is treated as primitive', () => {
			mocks.getValueAtPath.mockReturnValue({ __isFunction: false, other: 1 });
			const p = proxy();
			const val = p.prop;
			// Not a function — falls through to "primitive" caching
			expect(typeof val).toBe('object');
			expect(val.__isFunction).toBe(false);
			expect(val.other).toBe(1);
		});

		it('plain object with __isArray=false is treated as primitive', () => {
			mocks.getValueAtPath.mockReturnValue({ __isArray: false, data: 'x' });
			const p = proxy();
			const val = p.prop;
			expect(typeof val).toBe('object');
			expect(val.data).toBe('x');
		});

		it('array proxy does not intercept negative indices', () => {
			mocks.getValueAtPath.mockReturnValue({ __isArray: true, __length: 3 });
			const p = proxy();
			p.arr[-1];
			expect(mocks.getArrayElement).not.toHaveBeenCalled();
		});

		it('function wrapper on a basePath proxy passes full path', () => {
			mocks.getValueAtPath.mockReturnValue({ __isFunction: true, __name: '$items' });
			mocks.callFunctionAtPath.mockReturnValue([]);
			const p = proxy(['$root']);
			p.fn();
			expect(mocks.callFunctionAtPath).toHaveBeenCalledWith(null, [['$root', 'fn']], ivmCallOpts);
		});
	});
});
