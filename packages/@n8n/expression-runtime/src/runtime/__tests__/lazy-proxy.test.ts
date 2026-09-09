import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDeepLazyProxy, isLazyProxy, getProxyPath } from '../lazy-proxy';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockApplySync(returnValue: unknown = undefined) {
	return vi.fn().mockReturnValue(returnValue);
}

/** Create mock callbacks that createDeepLazyProxy expects. */
function createMockCallbacks(
	overrides: {
		getValueAtPath?: ReturnType<typeof vi.fn>;
		getArrayElement?: ReturnType<typeof vi.fn>;
	} = {},
) {
	const getValueAtPath = overrides.getValueAtPath ?? mockApplySync();
	const getArrayElement = overrides.getArrayElement ?? mockApplySync();

	const callbacks = {
		getValueAtPath,
		getArrayElement,
	};

	return { getValueAtPath, getArrayElement, callbacks };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createDeepLazyProxy', () => {
	let mocks: ReturnType<typeof createMockCallbacks>;

	beforeEach(() => {
		mocks = createMockCallbacks();
	});

	// Helper to create proxy with current mocks. Returns `any` so test
	// assertions can freely index into the proxy's nested shape without
	// `as unknown as ...` ceremony — the underlying proxy is dynamic data.
	function proxy(basePath?: string[], knownKeys?: string[]): any {
		const meta = knownKeys ? { kind: 'object' as const, keys: knownKeys } : undefined;
		return createDeepLazyProxy(basePath, meta, mocks.callbacks);
	}

	function arrayProxy(basePath: string[], length: number): any {
		return createDeepLazyProxy(basePath, { kind: 'array' as const, length }, mocks.callbacks);
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
	// 4. Array metadata (always lazy-loaded via array proxy)
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
			expect(mocks.getArrayElement).toHaveBeenCalledWith(['data', 'list'], 3);
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
			expect(mocks.getValueAtPath).toHaveBeenLastCalledWith(['a']);

			// a.b -> returns object metadata
			const b = a.b;
			expect(mocks.getValueAtPath).toHaveBeenLastCalledWith(['a', 'b']);

			// a.b.c -> returns object metadata
			const c = b.c;
			expect(mocks.getValueAtPath).toHaveBeenLastCalledWith(['a', 'b', 'c']);
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
			expect(mocks.getValueAtPath).toHaveBeenCalledWith(['$json', 'user']);
		});

		it('nested proxies inherit full path', () => {
			mocks.getValueAtPath.mockReturnValue({ __isObject: true, __keys: ['name'] });
			const p = proxy(['$json']);
			const user = p.user;
			expect(getProxyPath(user)).toEqual(['$json', 'user']);

			// Accessing a property on the nested proxy should build the full path
			mocks.getValueAtPath.mockReturnValue('Alice');
			user.name;
			expect(mocks.getValueAtPath).toHaveBeenLastCalledWith(['$json', 'user', 'name']);
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
			expect(mocks.getValueAtPath).toHaveBeenCalledWith(['$json', 'foo']);
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
	});

	// -----------------------------------------------------------------------
	// 11. Array-shaped proxy (meta.kind = 'array')
	// -----------------------------------------------------------------------

	describe('array-shaped proxy', () => {
		it('Array.isArray() returns true', () => {
			const p = arrayProxy(['arr'], 3);
			expect(Array.isArray(p)).toBe(true);
		});

		it('length is the meta length without a bridge call', () => {
			const p = arrayProxy(['arr'], 5);
			expect(p.length).toBe(5);
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
			expect(mocks.getArrayElement).not.toHaveBeenCalled();
		});

		it('Object.keys() returns numeric index strings only', () => {
			const p = arrayProxy(['arr'], 3);
			expect(Object.keys(p)).toEqual(['0', '1', '2']);
		});

		it('length descriptor is non-enumerable, non-configurable, writable', () => {
			const p = arrayProxy(['arr'], 2);
			const desc = Object.getOwnPropertyDescriptor(p, 'length');
			expect(desc).toEqual({
				configurable: false,
				enumerable: false,
				writable: true,
				value: 2,
			});
		});

		it('index descriptor includes the actual value (matches native array)', () => {
			const p = arrayProxy(['arr'], 3);
			mocks.getArrayElement.mockReturnValue('first');
			const desc = Object.getOwnPropertyDescriptor(p, '0');
			expect(desc).toEqual({
				configurable: true,
				enumerable: true,
				writable: false,
				value: 'first',
			});
		});

		it('indexed access fetches via getArrayElement', () => {
			const p = arrayProxy(['arr'], 3);
			mocks.getArrayElement.mockReturnValue('first');
			expect(p[0]).toBe('first');
			expect(mocks.getArrayElement).toHaveBeenCalledWith(['arr'], 0);
		});

		it('nested array element returns an array-shaped child proxy', () => {
			const p = arrayProxy(['arr'], 2);
			mocks.getArrayElement.mockReturnValue({ __isArray: true, __length: 4 });
			const child = p[0];
			expect(Array.isArray(child)).toBe(true);
			expect(child.length).toBe(4);
			expect(getProxyPath(child)).toEqual(['arr', '0']);
		});

		it('object element returns an object-shaped child proxy', () => {
			const p = arrayProxy(['arr'], 2);
			mocks.getArrayElement.mockReturnValue({ __isObject: true, __keys: ['a', 'b'] });
			const child = p[0];
			expect(Array.isArray(child)).toBe(false);
			expect(isLazyProxy(child)).toBe(true);
			expect(Object.keys(child)).toEqual(['a', 'b']);
		});

		it('empty array proxy has zero indices', () => {
			const p = arrayProxy(['arr'], 0);
			expect(p.length).toBe(0);
			expect(Object.keys(p)).toEqual([]);
			expect(Array.isArray(p)).toBe(true);
		});

		it('out-of-bounds index returns undefined without a bridge call', () => {
			const p = arrayProxy(['arr'], 2);
			expect(p[2]).toBeUndefined();
			expect(p[100]).toBeUndefined();
			expect(mocks.getArrayElement).not.toHaveBeenCalled();
		});

		it('non-canonical index strings are rejected', () => {
			const p = arrayProxy(['arr'], 5);
			// '00' is not a canonical index; native arrays don't treat it as arr[0]
			expect(p['00' as any]).toBeUndefined();
			expect(mocks.getArrayElement).not.toHaveBeenCalled();
		});

		it('caches elements after first access', () => {
			const p = arrayProxy(['arr'], 1);
			mocks.getArrayElement.mockReturnValue('val');
			p[0];
			p[0];
			expect(mocks.getArrayElement).toHaveBeenCalledTimes(1);
		});

		it("'in' operator works for valid indices and length", () => {
			const p = arrayProxy(['arr'], 3);
			expect(0 in p).toBe(true);
			expect(2 in p).toBe(true);
			expect(3 in p).toBe(false);
			expect('length' in p).toBe(true);
		});
	});

	// -----------------------------------------------------------------------
	// 12. Materialize-on-first-write (evaluation-scoped copy-on-write)
	// -----------------------------------------------------------------------

	describe('materialize-on-first-write', () => {
		/** Array proxy over host data ['a', 'b', 'c'] (or a custom array). */
		function writableArrayProxy(data: unknown[] = ['a', 'b', 'c']): any {
			mocks.getArrayElement.mockImplementation((_path: string[], idx: number) => data[idx]);
			return arrayProxy(['arr'], data.length);
		}

		/** Object proxy over host data {name: 'Alice', email: 'a@x'}. */
		function writableObjectProxy(data: Record<string, unknown> = { name: 'Alice', email: 'a@x' }) {
			mocks.getValueAtPath.mockImplementation((path: string[]) => data[path[path.length - 1]]);
			return proxy(['user'], Object.keys(data));
		}

		describe('array proxies', () => {
			it('index write is applied and visible to later reads', () => {
				const p = writableArrayProxy();
				p[0] = 'X';
				expect(p[0]).toBe('X');
				expect(p[1]).toBe('b');
			});

			it('reads never materialize; first write fetches each element exactly once', () => {
				const p = writableArrayProxy();
				expect(p[0]).toBe('a');
				expect(mocks.getArrayElement).toHaveBeenCalledTimes(1);

				p[0] = 'X';
				// materialization fetches the remaining uncached elements (1, 2)
				expect(mocks.getArrayElement).toHaveBeenCalledTimes(3);

				// subsequent reads and writes cause no further bridge calls
				expect(p[1]).toBe('b');
				p[2] = 'Y';
				expect(p[2]).toBe('Y');
				expect(mocks.getArrayElement).toHaveBeenCalledTimes(3);
			});

			it('push() appends and updates length', () => {
				const p = writableArrayProxy();
				expect(p.push('d')).toBe(4);
				expect(p.length).toBe(4);
				expect(p[3]).toBe('d');
			});

			it('pop() returns the last element and shrinks length', () => {
				const p = writableArrayProxy();
				expect(p.pop()).toBe('c');
				expect(p.length).toBe(2);
				expect(2 in p).toBe(false);
			});

			it('splice() removes in place with consistent length and contents', () => {
				const p = writableArrayProxy();
				expect(p.splice(0, 2)).toEqual(['a', 'b']);
				expect(p.length).toBe(1);
				expect([...p]).toEqual(['c']);
			});

			it('native sort() mutates in place and is visible to later reads', () => {
				const p = writableArrayProxy([3, 1, 2]);
				p.sort();
				expect([...p]).toEqual([1, 2, 3]);
				expect(p[0]).toBe(1);
			});

			it('delete removes the element without resurrecting it on the next read', () => {
				const p = writableArrayProxy();
				delete p[1];
				expect(1 in p).toBe(false);
				expect(p[1]).toBeUndefined();
				expect(Object.keys(p)).toEqual(['0', '2']);
			});

			it('index descriptor reports writable after materialization', () => {
				const p = writableArrayProxy();
				p[0] = 'X';
				const desc = Object.getOwnPropertyDescriptor(p, '0');
				expect(desc).toMatchObject({ writable: true, value: 'X' });
			});

			it('error sentinel during materialization propagates', () => {
				const sentinel = { __isError: true, name: 'Error', message: 'fetch failed' };
				mocks.getArrayElement.mockImplementation((_path: string[], idx: number) =>
					idx === 2 ? sentinel : 'val',
				);
				const p = arrayProxy(['arr'], 3);
				expect(() => {
					p[0] = 'X';
				}).toThrow();
			});
		});

		describe('object proxies', () => {
			it('existing-key write is applied and visible to later reads', () => {
				const p = writableObjectProxy();
				p.name = 'Zed';
				expect(p.name).toBe('Zed');
				expect(p.email).toBe('a@x');
			});

			it('new-key write is visible and enumerable', () => {
				const p = writableObjectProxy();
				p.extra = 42;
				expect(p.extra).toBe(42);
				expect(Object.keys(p)).toEqual(['name', 'email', 'extra']);
			});

			it('delete removes the key without resurrecting it on the next read', () => {
				const p = writableObjectProxy();
				delete p.email;
				expect('email' in p).toBe(false);
				expect(p.email).toBeUndefined();
				expect(Object.keys(p)).toEqual(['name']);
			});

			it('host data with an own __proto__ key is cached as an own property, not a prototype', () => {
				const protoValue = { polluted: true };
				mocks.getValueAtPath.mockImplementation((path: string[]) => {
					const key = path[path.length - 1];
					if (key === 'name') return 'Alice';
					if (key === '__proto__') return protoValue;
					return undefined;
				});
				const p = proxy(['user'], ['name', '__proto__']);
				p.name = 'Zed'; // triggers materialization over all keys
				expect(Object.keys(p)).toEqual(['name', '__proto__']);
				expect(p.polluted).toBeUndefined();
				expect(p['__proto__']).toBe(protoValue);
			});

			it('write fetches each key exactly once; later access stays local', () => {
				const p = writableObjectProxy();
				p.name = 'Zed';
				const callsAfterWrite = mocks.getValueAtPath.mock.calls.length;
				expect(p.email).toBe('a@x');
				p.email = 'b@x';
				expect(mocks.getValueAtPath.mock.calls.length).toBe(callsAfterWrite);
			});
		});
	});
});
