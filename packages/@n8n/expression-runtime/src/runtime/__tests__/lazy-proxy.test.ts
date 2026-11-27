import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createDeepLazyProxy,
	isLazyProxy,
	getProxyPath,
	SMALL_VALUES,
	WHOLE_VALUES,
} from '../lazy-proxy';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create mock callbacks that createDeepLazyProxy expects. */
function createMockCallbacks(
	overrides: {
		getValueAtPath?: ReturnType<typeof vi.fn<(path: string[]) => unknown>>;
		getArrayElement?: ReturnType<typeof vi.fn<(path: string[], index: number) => unknown>>;
	} = {},
) {
	const getValueAtPath = overrides.getValueAtPath ?? vi.fn<(path: string[]) => unknown>();
	const getArrayElement =
		overrides.getArrayElement ?? vi.fn<(path: string[], index: number) => unknown>();
	// A host that does not batch: one item for an array read, no field for a read of
	// every field. The proxy reads every field from 0 and array items in order from 1.
	const readBatch = vi.fn((path: string[], start: number) =>
		start > 0 ? getArrayElement(path, start) : { __n8nType: 'HostData', __value: {} },
	);

	const callbacks = {
		getValueAtPath,
		getArrayElement,
		readBatch,
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
			const p = proxy(undefined, []);
			expect(p.toString()).toBe('[object Object]');
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('valueOf() returns the proxy target', () => {
			const p = proxy(undefined, []);
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

		it('reads a named key of an array from the host', () => {
			const p = arrayProxy(['$json'], 1);
			mocks.getValueAtPath.mockReturnValue('session-1');

			expect(p.sessionId).toBe('session-1');
			expect(mocks.getValueAtPath).toHaveBeenCalledWith(['$json', 'sessionId']);
		});

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
			const items = p.items;
			mocks.getValueAtPath.mockReturnValue(undefined);
			expect(items.foo).toBeUndefined();
			expect(mocks.getArrayElement).not.toHaveBeenCalled();
		});

		it('does not intercept negative indices', () => {
			const p = proxyWithLargeArray();
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
			expect(mocks.getValueAtPath).not.toHaveBeenCalled();
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
			it('reads never materialize; first write fetches each element exactly once', () => {
				const p = writableArrayProxy();
				expect(p[0]).toBe('a');
				expect(mocks.getArrayElement).toHaveBeenCalledTimes(1);

				p[0] = 'X';
				expect(p[0]).toBe('X');
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
				expect([...p]).toEqual(['a', 'b']);
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

			it('a write through a derived object lands on the derived object, not the proxy cache', () => {
				const p = writableArrayProxy();
				const derived = Object.create(p);
				derived.foo = 'X';
				expect(Object.prototype.hasOwnProperty.call(derived, 'foo')).toBe(true);
				expect(p.foo).toBeUndefined();
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

			it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf'])(
				'preserves the own field %s before and after a write',
				(field) => {
					const fieldValue = { label: 'Field value' };
					mocks.getValueAtPath.mockImplementation((path: string[]) => {
						const key = path[path.length - 1];
						if (key === 'name') return 'Alice';
						if (key === field) return fieldValue;
						return undefined;
					});
					const p = proxy(['user'], ['name', field]);
					expect(Object.fromEntries(Object.entries(p))).toEqual({
						name: 'Alice',
						[field]: fieldValue,
					});
					p.name = 'Zed'; // triggers materialization over all keys
					expect(Object.keys(p)).toEqual(['name', field]);
					expect(p.label).toBeUndefined();
					expect(p[field]).toBe(fieldValue);
				},
			);

			it('write fetches each uncached key exactly once; later access stays local', () => {
				const p = writableObjectProxy();
				expect(p.name).toBe('Alice');
				p.name = 'Zed';
				// The pre-read cached 'name'; materialization fetched only 'email'.
				expect(mocks.getValueAtPath).toHaveBeenCalledTimes(2);
				expect(p.name).toBe('Zed');
				expect(p.email).toBe('a@x');
				p.email = 'b@x';
				expect(mocks.getValueAtPath).toHaveBeenCalledTimes(2);
			});
		});
	});

	// -----------------------------------------------------------------------
	// 12. Boxed primitive metadata (lazy own fields)
	// -----------------------------------------------------------------------

	describe('boxed primitive metadata', () => {
		it('resolves own fields lazily and caches each read', () => {
			const boxed = Object('ab') as object;
			mocks.getValueAtPath.mockImplementation((path: string[]) => {
				const key = path[path.length - 1];
				if (key === 'tagged') {
					return {
						__isBoxed: true,
						__value: boxed,
						__keys: ['meta', 'other'],
						__hiddenKeys: ['secret'],
					};
				}
				if (key === 'meta') return 42;
				if (key === 'secret') return 'hidden';
				return undefined;
			});

			const p = proxy(['$json']);
			const value = p.tagged;

			expect(value).toBe(boxed);
			expect(value instanceof String).toBe(true);
			expect(Object.keys(value)).toEqual(['0', '1', 'meta', 'other']);
			expect('secret' in value).toBe(true);
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(1);

			expect(value.meta).toBe(42);
			expect(value.meta).toBe(42);
			expect(value.secret).toBe('hidden');
			expect(Object.keys(value)).toEqual(['0', '1', 'meta', 'other']);
			expect(mocks.getValueAtPath).toHaveBeenCalledTimes(3);
			expect(mocks.getValueAtPath).toHaveBeenLastCalledWith(['$json', 'tagged', 'secret']);
		});

		it('throws an error sentinel only when the failing field is read and does not cache it', () => {
			const sentinel = { __isError: true, name: 'ExpressionError', message: 'boom' };
			const boxed = Object('ab') as object;
			mocks.getValueAtPath.mockImplementation((path: string[]) => {
				const key = path[path.length - 1];
				if (key === 'tagged') return { __isBoxed: true, __value: boxed, __keys: ['ok', 'bad'] };
				if (key === 'ok') return 1;
				if (key === 'bad') return sentinel;
				return undefined;
			});

			const p = proxy(['$json']);
			const value = p.tagged;

			expect(value + '!').toBe('ab!');
			expect(value.ok).toBe(1);
			expect(() => value.bad).toThrow();
			expect(() => value.bad).toThrow();
			expect(
				mocks.getValueAtPath.mock.calls.filter((call) => call[0].at(-1) === 'bad'),
			).toHaveLength(2);
		});

		it('handles writes, deletes, prototype receivers, and frozen boxed primitives', () => {
			const boxed = Object(5) as object;
			mocks.getValueAtPath.mockImplementation((path: string[]) => {
				const key = path[path.length - 1];
				if (key === 'n') return { __isBoxed: true, __value: boxed, __keys: ['a', 'b', 'c', 'd'] };
				if (key === 'c') return 'from-host';
				if (key === 'd') return 'frozen-read';
				return undefined;
			});

			const p = proxy(['$json']);
			const value = p.n;

			// Write without reading the host field
			value.a = 'local';
			expect(value.a).toBe('local');

			// Delete without reading the host field
			delete value.b;
			expect('b' in value).toBe(false);

			// Prototype-chain write lands on the child, not the boxed target
			const child = Object.create(value) as { c: unknown };
			child.c = 'on-child';
			expect(child.c).toBe('on-child');
			expect(value.c).toBe('from-host');

			// Writing through a frozen child does not mutate the boxed target
			const frozenChild = Object.freeze(Object.create(value)) as { d: unknown };
			expect(() => {
				frozenChild.d = 'ignored';
			}).not.toThrow();

			// Reading an unread field after Object.freeze does not throw on redefine
			Object.freeze(value);
			expect(value.d).toBe('frozen-read');
			expect(value.d).toBe('frozen-read');
			expect(mocks.getValueAtPath.mock.calls.filter((call) => call[0].at(-1) === 'd')).toHaveLength(
				1,
			);
		});
	});
});

describe('createDeepLazyProxy batched reads', () => {
	const hostData = (value: unknown) => ({ __n8nType: 'HostData', __value: value });
	const objectOf = (keys: string[]) => ({ __isObject: true, __keys: keys });

	function createCallbacks() {
		return { getValueAtPath: vi.fn(), getArrayElement: vi.fn(), readBatch: vi.fn() };
	}

	function arrayProxy(callbacks: ReturnType<typeof createCallbacks>, length: number): any {
		return createDeepLazyProxy(['$json', 'rows'], { kind: 'array', length }, callbacks);
	}

	function objectProxy(callbacks: ReturnType<typeof createCallbacks>, keys: string[]): any {
		return createDeepLazyProxy(['$json'], { kind: 'object', keys }, callbacks);
	}

	describe('array items', () => {
		it('reads the first item alone, then the next items in one host call', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(10);
			callbacks.readBatch.mockReturnValue(hostData([11, 12, 13]));
			const rows = arrayProxy(callbacks, 10);

			expect([rows[0], rows[1], rows[2], rows[3]]).toEqual([10, 11, 12, 13]);
			expect(callbacks.getArrayElement.mock.calls).toEqual([[['$json', 'rows'], 0]]);
			expect(callbacks.readBatch.mock.calls).toEqual([[['$json', 'rows'], 1, 0, SMALL_VALUES]]);
		});

		it('counts each read in order', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(0);
			callbacks.readBatch.mockReturnValueOnce(hostData([1, 2])).mockReturnValueOnce(hostData([3]));
			const rows = arrayProxy(callbacks, 10);

			expect([rows[0], rows[1], rows[2], rows[3]]).toEqual([0, 1, 2, 3]);
			expect(callbacks.readBatch.mock.calls).toEqual([
				[['$json', 'rows'], 1, 0, SMALL_VALUES],
				[['$json', 'rows'], 3, 1, SMALL_VALUES],
			]);
		});

		it('reads an item out of order alone', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(1);
			const rows = arrayProxy(callbacks, 10);

			expect([rows[5], rows[3], rows[9]]).toEqual([1, 1, 1]);
			expect(callbacks.getArrayElement).toHaveBeenCalledTimes(3);
			expect(callbacks.readBatch).not.toHaveBeenCalled();
		});

		it('reads in order from an item that is not the first', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(5);
			callbacks.readBatch.mockReturnValue(hostData([6, 7]));
			const rows = arrayProxy(callbacks, 10);

			expect([rows[5], rows[6], rows[7]]).toEqual([5, 6, 7]);
			expect(callbacks.readBatch.mock.calls).toEqual([[['$json', 'rows'], 6, 0, SMALL_VALUES]]);
		});

		it('keeps one lazy item that the host gives in place of a run', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(0);
			callbacks.readBatch.mockReturnValue(objectOf(['id']));
			const rows = arrayProxy(callbacks, 10);

			expect(rows[0]).toBe(0);
			expect(isLazyProxy(rows[1])).toBe(true);
			expect(getProxyPath(rows[1])).toEqual(['$json', 'rows', '1']);
		});

		it('stops the requests for small items after the host gave one lazy item', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue('alone');
			callbacks.readBatch.mockReturnValue({ __isArray: true, __length: 2 });
			const rows = arrayProxy(callbacks, 10);

			expect([rows[0], isLazyProxy(rows[1]), rows[2], rows[3]]).toEqual([
				'alone',
				true,
				'alone',
				'alone',
			]);
			expect(callbacks.readBatch).toHaveBeenCalledTimes(1);
		});

		it('asks for the next object items with no field while the expression reads no field', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(objectOf(['id']));
			callbacks.readBatch.mockReturnValue(hostData([{}, {}]));
			const rows = arrayProxy(callbacks, 10);

			expect([rows[0], rows[1], rows[2]].map(isLazyProxy)).toEqual([true, true, true]);
			expect(callbacks.readBatch.mock.calls).toEqual([[['$json', 'rows'], 1, 0, []]]);
			expect(callbacks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('asks for whole items again after the expression read a lazy item whole', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(0);
			callbacks.readBatch
				.mockReturnValueOnce(objectOf(['id']))
				.mockReturnValueOnce(hostData({ id: 1 }))
				.mockReturnValueOnce(hostData([{ id: 2 }]));
			const rows = arrayProxy(callbacks, 10);
			void rows[0];

			expect(JSON.stringify(rows[1])).toBe('{"id":1}');
			expect(rows[2]).toEqual({ id: 2 });
			expect(callbacks.readBatch.mock.calls[2]).toEqual([['$json', 'rows'], 2, 1, WHOLE_VALUES]);
		});

		it('keeps an item that is already cached', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue('alone');
			callbacks.readBatch.mockReturnValue(hostData(['a', 'b', 'c']));
			const rows = arrayProxy(callbacks, 10);

			expect([rows[2], rows[0], rows[1], rows[2], rows[3]]).toEqual([
				'alone',
				'alone',
				'a',
				'alone',
				'c',
			]);
		});

		it('asks for whole items after the expression read every field of an item', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(objectOf(['id']));
			callbacks.readBatch
				.mockReturnValueOnce(hostData({ id: 0 }))
				.mockReturnValueOnce(hostData([{ id: 1 }]));
			const rows = arrayProxy(callbacks, 10);

			expect(JSON.stringify(rows[0])).toBe('{"id":0}');
			expect(JSON.stringify(rows[1])).toBe('{"id":1}');
			expect(callbacks.readBatch.mock.calls).toEqual([
				[['$json', 'rows', '0'], 0, 0, SMALL_VALUES],
				[['$json', 'rows'], 1, 0, WHOLE_VALUES],
			]);
		});

		it.each([
			{ when: 'without a key list', listKeys: false, request: ['type', 'meta'] },
			{ when: 'after a key list', listKeys: true, request: WHOLE_VALUES },
		])(
			'asks for $request after a read of every key of the first item $when',
			({ listKeys, request }) => {
				const callbacks = createCallbacks();
				callbacks.getArrayElement.mockReturnValue(objectOf(['type', 'meta']));
				callbacks.getValueAtPath.mockImplementation((path: string[]) =>
					path[3] === 'meta' ? objectOf(['id']) : 'x',
				);
				callbacks.readBatch.mockImplementation((path: string[]) =>
					hostData(path.length === 2 ? [{ type: 'y' }] : {}),
				);
				const rows = arrayProxy(callbacks, 10);
				if (listKeys) Object.keys(rows[0]);
				void rows[0].type;
				void rows[0].meta;
				void rows[1];

				expect(callbacks.readBatch.mock.calls.at(-1)).toEqual([['$json', 'rows'], 1, 0, request]);
			},
		);

		it('asks for small fields after a key list and one field of each item, also after a read of the items to the end', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(objectOf(['id', 'blob']));
			callbacks.getValueAtPath.mockReturnValue(objectOf(['id', 'blob']));
			callbacks.readBatch.mockImplementation((path: string[]) =>
				hostData(path.length === 2 ? [{}, {}] : { id: 1 }),
			);
			const rows = arrayProxy(callbacks, 3);
			const items = [rows[0], rows[1], rows[2]];
			items.forEach((item) => Object.keys(item));
			items.forEach((item) => void item.id);

			expect(callbacks.readBatch.mock.calls).toEqual([
				[['$json', 'rows'], 1, 0, []],
				[['$json', 'rows', '0'], 0, 0, SMALL_VALUES],
				[['$json', 'rows', '1'], 0, 0, SMALL_VALUES],
				[['$json', 'rows', '2'], 0, 0, SMALL_VALUES],
			]);
		});

		it('asks for whole fields of a lazy item after the expression read every field of an item', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(objectOf(['id', 'blob']));
			callbacks.getValueAtPath.mockReturnValue('blob');
			callbacks.readBatch
				.mockReturnValueOnce(hostData({ id: 0 }))
				.mockReturnValueOnce(objectOf(['id', 'blob']))
				.mockReturnValueOnce(hostData({ id: 1, blob: 'blob' }));
			const rows = arrayProxy(callbacks, 10);

			expect(JSON.stringify(rows[0])).toBe('{"id":0,"blob":"blob"}');
			expect(JSON.stringify(rows[1])).toBe('{"id":1,"blob":"blob"}');
			expect(callbacks.readBatch.mock.calls).toEqual([
				[['$json', 'rows', '0'], 0, 0, SMALL_VALUES],
				[['$json', 'rows'], 1, 0, WHOLE_VALUES],
				[['$json', 'rows', '1'], 0, 0, WHOLE_VALUES],
			]);
		});

		it('asks for the fields that the expression read by name on the item before', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(objectOf(['id', 'name', 'other']));
			callbacks.getValueAtPath.mockImplementation((path: string[]) => `${path[2]}.${path[3]}`);
			callbacks.readBatch.mockReturnValue(
				hostData([
					{ id: '1.id', name: '1.name' },
					{ id: '2.id', name: '2.name' },
				]),
			);
			const rows = arrayProxy(callbacks, 10);

			expect([0, 1, 2].map((index) => `${rows[index].id} ${rows[index].name}`)).toEqual([
				'0.id 0.name',
				'1.id 1.name',
				'2.id 2.name',
			]);
			expect(callbacks.readBatch.mock.calls).toEqual([[['$json', 'rows'], 1, 0, ['id', 'name']]]);
			// Only the first item read its fields from the host.
			expect(callbacks.getValueAtPath).toHaveBeenCalledTimes(2);
		});

		it('keeps the key order of the host for an item with some fields after a write', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(objectOf(['other', 'id']));
			callbacks.getValueAtPath.mockImplementation((path: string[]) =>
				path.length === 3 ? objectOf(['other', 'id']) : path.join('.'),
			);
			callbacks.readBatch.mockReturnValue(hostData([{ id: 'known' }]));
			const rows = arrayProxy(callbacks, 10);
			void rows[0].id;
			rows[1].x = 1;

			expect(Object.entries(rows[1])).toEqual([
				['other', '$json.rows.1.other'],
				['id', 'known'],
				['x', 1],
			]);
		});

		it('reads any other field of an item with some fields from the host', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(objectOf(['id', 'other']));
			callbacks.getValueAtPath.mockImplementation((path: string[]) =>
				path.length === 3 ? objectOf(['id', 'other']) : path.join('.'),
			);
			callbacks.readBatch.mockReturnValue(hostData([{ id: 'known' }]));
			const rows = arrayProxy(callbacks, 10);
			void rows[0].id;

			expect(isLazyProxy(rows[1])).toBe(true);
			expect(rows[1].id).toBe('known');
			expect(rows[1].other).toBe('$json.rows.1.other');
			expect(Object.keys(rows[1])).toEqual(['id', 'other']);
			expect('other' in rows[1]).toBe(true);
		});

		it.each([1, 2])(
			'asks for whole items after a read in full of item %i with some fields',
			(index) => {
				const callbacks = createCallbacks();
				callbacks.getArrayElement.mockReturnValue(objectOf(['id', 'name']));
				callbacks.getValueAtPath.mockImplementation((path: string[]) =>
					path.length === 3 ? objectOf(['id', 'name']) : 'x',
				);
				callbacks.readBatch.mockImplementation((path: string[]) =>
					hostData(path.length === 2 ? [{ id: 1 }, { id: 2 }] : { id: 1, name: 'n' }),
				);
				const rows = arrayProxy(callbacks, 10);
				void rows[0].id;
				void rows[1];
				JSON.stringify(rows[index]);
				void rows[3];

				expect(callbacks.readBatch.mock.calls.at(-1)).toEqual([
					['$json', 'rows'],
					3,
					1,
					WHOLE_VALUES,
				]);
			},
		);

		it('asks for fields by name after a read in full of a nested object of an item', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(objectOf(['id', 'address']));
			callbacks.getValueAtPath.mockReturnValue(objectOf(['city']));
			callbacks.readBatch.mockImplementation((path: string[]) =>
				hostData(path.length === 2 ? [{}] : { city: 'x' }),
			);
			const rows = arrayProxy(callbacks, 10);
			JSON.stringify(rows[0].address);
			void rows[1];

			expect(callbacks.readBatch.mock.calls.at(-1)).toEqual([['$json', 'rows'], 1, 0, ['address']]);
		});

		it('reads every field of an item one time when the expression lists its keys again', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(objectOf(['id', 'blob']));
			callbacks.getValueAtPath.mockReturnValue('blob');
			callbacks.readBatch
				.mockReturnValueOnce(hostData({ id: 0 }))
				.mockReturnValueOnce(objectOf(['id', 'blob']))
				.mockReturnValue(hostData({ id: 1, blob: 'blob' }));
			const rows = arrayProxy(callbacks, 10);
			JSON.stringify(rows[0]);
			const row = rows[1];
			Object.keys(row);
			void row.id;
			const hostReads = callbacks.getValueAtPath.mock.calls.length;
			Object.keys(row);

			expect(row.blob).toBe('blob');
			expect(callbacks.readBatch).toHaveBeenCalledTimes(3);
			expect(callbacks.getValueAtPath).toHaveBeenCalledTimes(hostReads);
		});

		it('asks for small rows after a read of two items of the first row', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockImplementation((path: string[]) =>
				path.length === 2 ? { __isArray: true, __length: 3 } : 0,
			);
			callbacks.readBatch.mockReturnValue(hostData([1]));
			const rows = arrayProxy(callbacks, 10);
			const row = rows[0];
			void row[0];
			void row[1];
			void rows[1];

			expect(callbacks.readBatch.mock.calls.at(-1)).toEqual([
				['$json', 'rows'],
				1,
				0,
				SMALL_VALUES,
			]);
		});

		it('asks for small rows after a read of the last item of the first row out of order', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockImplementation((path: string[]) =>
				path.length === 2 ? { __isArray: true, __length: 5 } : 0,
			);
			callbacks.readBatch.mockImplementation((path: string[]) =>
				hostData(path.length === 2 ? [[]] : [1]),
			);
			const rows = arrayProxy(callbacks, 10);
			const row = rows[0];
			void row[0];
			void row[1];
			void row[4];
			void rows[1];

			expect(callbacks.readBatch.mock.calls.at(-1)).toEqual([
				['$json', 'rows'],
				1,
				0,
				SMALL_VALUES,
			]);
		});

		it.each([
			['the cache', [1, 2]],
			['the host', [1]],
		])('asks for whole rows after a read of the first row to its last item from %s', (_, batch) => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockImplementation((path: string[]) =>
				path.length === 2 ? { __isArray: true, __length: 3 } : 0,
			);
			callbacks.readBatch.mockImplementation((path: string[]) =>
				hostData(path.length === 2 ? [[]] : batch),
			);
			const rows = arrayProxy(callbacks, 10);
			rows[0].join();
			void rows[1];

			expect(callbacks.readBatch.mock.calls.at(-1)).toEqual([
				['$json', 'rows'],
				1,
				0,
				WHOLE_VALUES,
			]);
		});

		it('asks for small items after a read of a named key of an array item', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue({ __isArray: true, __length: 2 });
			callbacks.getValueAtPath.mockReturnValue(undefined);
			callbacks.readBatch.mockReturnValue(hostData([1, 2]));
			const rows = arrayProxy(callbacks, 10);

			void rows[0].label;
			void rows[1];

			expect(callbacks.readBatch.mock.calls[0]).toEqual([['$json', 'rows'], 1, 0, SMALL_VALUES]);
		});

		it('keeps at most 8 field names', () => {
			const names = Array.from({ length: 10 }, (_, index) => `f${index}`);
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(objectOf([...names, 'unread']));
			callbacks.getValueAtPath.mockReturnValue(1);
			callbacks.readBatch.mockReturnValue(hostData([{}]));
			const rows = arrayProxy(callbacks, 10);
			names.forEach((name) => void rows[0][name]);
			void rows[1];

			expect(callbacks.readBatch.mock.calls[0][3]).toEqual(names.slice(0, 8));
		});

		it('throws the error that the host gives', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(0);
			callbacks.readBatch.mockReturnValue({ __isError: true, name: 'Error', message: 'boom' });
			const rows = arrayProxy(callbacks, 10);
			void rows[0];

			expect(() => rows[1]).toThrow(expect.objectContaining({ message: 'boom' }));
		});

		it('reads the items of a write in order', () => {
			const callbacks = createCallbacks();
			callbacks.getArrayElement.mockReturnValue(0);
			callbacks.readBatch.mockReturnValue(hostData([1, 2]));
			const rows = arrayProxy(callbacks, 3);
			rows.push(3);

			expect([...rows]).toEqual([0, 1, 2, 3]);
			expect(callbacks.getArrayElement).toHaveBeenCalledTimes(1);
			expect(callbacks.readBatch).toHaveBeenCalledTimes(1);
		});
	});

	describe('object fields', () => {
		it('reads every field in one host call when a value is read after the key list', () => {
			const callbacks = createCallbacks();
			callbacks.readBatch.mockReturnValue(hostData({ a: 1, b: { c: 2 } }));
			const item = objectProxy(callbacks, ['a', 'b']);

			expect(Object.entries(item)).toEqual([
				['a', 1],
				['b', { c: 2 }],
			]);
			expect(callbacks.readBatch.mock.calls).toEqual([[['$json'], 0, 0, SMALL_VALUES]]);
			expect(callbacks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('reads a field that the host left out from the host', () => {
			const callbacks = createCallbacks();
			callbacks.readBatch.mockReturnValue(hostData({ a: 1 }));
			callbacks.getValueAtPath.mockReturnValue(objectOf(['c']));
			const item = objectProxy(callbacks, ['a', 'big']);

			const values = Object.values(item);

			expect(values[0]).toBe(1);
			expect(getProxyPath(values[1] as object)).toEqual(['$json', 'big']);
			expect(callbacks.readBatch).toHaveBeenCalledTimes(1);
			expect(
				getProxyPath(Object.values(objectProxy(callbacks, ['a', 'constructor']))[1] as object),
			).toEqual(['$json', 'constructor']);
		});

		it('makes no host call for the key list alone', () => {
			const callbacks = createCallbacks();
			const item = objectProxy(callbacks, ['a', 'b']);

			expect(Object.keys(item)).toEqual(['a', 'b']);
			expect(callbacks.readBatch).not.toHaveBeenCalled();
			expect(callbacks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('reads a field by name alone', () => {
			const callbacks = createCallbacks();
			callbacks.getValueAtPath.mockReturnValue(1);
			const item = objectProxy(callbacks, ['a', 'b']);

			expect(item.a).toBe(1);
			expect(callbacks.readBatch).not.toHaveBeenCalled();
		});

		it('keeps a field that is already cached', () => {
			const callbacks = createCallbacks();
			callbacks.getValueAtPath.mockReturnValue('alone');
			callbacks.readBatch.mockReturnValue(hostData({ a: 'many', b: 'many' }));
			const item = objectProxy(callbacks, ['a', 'b']);
			void item.b;

			expect(Object.values(item)).toEqual(['many', 'alone']);
		});

		it('reads every field one time when the expression lists the keys again', () => {
			const callbacks = createCallbacks();
			callbacks.readBatch.mockReturnValue(hostData({ a: 1 }));
			callbacks.getValueAtPath.mockReturnValue(objectOf(['c']));
			const item = objectProxy(callbacks, ['a', 'big', 'large']);

			void Object.keys(item);
			void item.big;
			void Object.keys(item);
			void item.large;

			expect(callbacks.readBatch).toHaveBeenCalledTimes(1);
			expect(callbacks.getValueAtPath).toHaveBeenCalledTimes(2);
		});

		it('keeps the key order of the host after a write', () => {
			const callbacks = createCallbacks();
			callbacks.readBatch.mockReturnValue(hostData({ id: 1 }));
			callbacks.getValueAtPath.mockReturnValue('long text');
			const item = objectProxy(callbacks, ['big', 'id']);
			item.x = 1;

			expect(Object.keys(item)).toEqual(['big', 'id', 'x']);
		});

		it('keeps the fields in the order of the reads after a write', () => {
			const callbacks = createCallbacks();
			callbacks.readBatch.mockReturnValue(hostData({ a: 1, b: 2 }));
			const item = objectProxy(callbacks, ['a', 'b']);
			void Object.keys(item);
			void item.b;
			item.x = 1;

			expect(Object.keys(item)).toEqual(['b', 'a', 'x']);
		});

		it('makes no host call for a write after a read of every field', () => {
			const callbacks = createCallbacks();
			callbacks.readBatch.mockReturnValue(hostData({ a: 1, b: 2 }));
			const item = objectProxy(callbacks, ['a', 'b']);
			void Object.values(item);
			item.c = 3;

			expect({ ...item }).toEqual({ a: 1, b: 2, c: 3 });
			expect(callbacks.readBatch).toHaveBeenCalledTimes(1);
			expect(callbacks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('reads the fields of a write in one host call', () => {
			const callbacks = createCallbacks();
			callbacks.readBatch.mockReturnValue(hostData({ a: 1, b: 2 }));
			const item = objectProxy(callbacks, ['a', 'b']);
			item.c = 3;

			expect({ ...item }).toEqual({ a: 1, b: 2, c: 3 });
			expect(callbacks.readBatch.mock.calls).toEqual([[['$json'], 0, 0, SMALL_VALUES]]);
			expect(callbacks.getValueAtPath).not.toHaveBeenCalled();
		});

		it('throws the error that the host gives', () => {
			const callbacks = createCallbacks();
			callbacks.readBatch.mockReturnValue({ __isError: true, name: 'Error', message: 'boom' });
			const item = objectProxy(callbacks, ['a']);

			expect(() => Object.values(item)).toThrow(expect.objectContaining({ message: 'boom' }));
		});
	});

	it.each([['$input'], ['$node', 'A', 'json']])('reads one value at a time under %s', (...path) => {
		const callbacks = createCallbacks();
		callbacks.getArrayElement.mockReturnValue(1);
		callbacks.getValueAtPath.mockReturnValue(1);
		const rows: any = createDeepLazyProxy(path, { kind: 'array', length: 3 }, callbacks);
		const item: any = createDeepLazyProxy(path, { kind: 'object', keys: ['a'] }, callbacks);

		expect([...rows]).toEqual([1, 1, 1]);
		expect(Object.values(item)).toEqual([1]);
		expect(callbacks.readBatch).not.toHaveBeenCalled();
	});

	it('finds a key of a wide object without a host call', () => {
		const keys = Array.from({ length: 2000 }, (_, index) => `key${index}`);
		const callbacks = createCallbacks();
		const item = objectProxy(callbacks, keys);

		expect(Object.getOwnPropertyDescriptor(item, 'key1999')).toEqual({
			configurable: true,
			enumerable: true,
			writable: false,
			value: undefined,
		});
		expect(Object.getOwnPropertyDescriptor(item, 'nope')).toBeUndefined();
		expect(callbacks.getValueAtPath).not.toHaveBeenCalled();
	});
});
