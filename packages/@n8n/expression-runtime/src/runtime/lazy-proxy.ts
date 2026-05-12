// ============================================================================
// Deep Lazy Proxy System
// ============================================================================
// For more information about Proxies see
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy

// ---------------------------------------------------------------------------
// Proxy registry — used only for testing/introspection, not accessible from
// expression code. Avoids shadowing user data keys like __isProxy / __path.
// ---------------------------------------------------------------------------
const proxyPaths = new WeakMap<object, string[]>();

/**
 * Serialized error sentinel returned by host-side bridge callbacks.
 * When a callback throws, the bridge catches the error and returns this
 * sentinel instead of letting it cross the isolate boundary (which strips
 * custom class identity and properties).
 */
export interface ErrorSentinel {
	__isError: true;
	name: string;
	message: string;
	stack?: string;
	extra?: Record<string, unknown>;
}

interface ObjectMetadata {
	__isObject: true;
	__keys: string[];
}

interface ArrayMetadata {
	__isArray: true;
	__length: number;
}

export function isObjectMetadata(value: unknown): value is ObjectMetadata {
	return (
		typeof value === 'object' &&
		value !== null &&
		'__isObject' in value &&
		value.__isObject === true
	);
}

export function isArrayMetadata(value: unknown): value is ArrayMetadata {
	return (
		typeof value === 'object' && value !== null && '__isArray' in value && value.__isArray === true
	);
}

function isErrorSentinel(value: unknown): value is ErrorSentinel {
	return (
		typeof value === 'object' && value !== null && '__isError' in value && value.__isError === true
	);
}

/**
 * If `value` is an error sentinel from a host-side callback, throw it
 * directly. The isolate's outer try-catch will detect __isError and
 * return it as the result. Error reconstruction happens on the host only.
 */
export function throwIfErrorSentinel(value: unknown): void {
	if (isErrorSentinel(value)) {
		// eslint-disable-next-line @typescript-eslint/no-throw-literal -- sentinel is reconstructed on the host
		throw value;
	}
}

/** Returns true if `obj` is a deep lazy proxy created by createDeepLazyProxy. */
export function isLazyProxy(obj: unknown): boolean {
	return typeof obj === 'object' && obj !== null && proxyPaths.has(obj);
}

/** Returns the basePath the proxy was created with, or undefined if not a proxy. */
export function getProxyPath(obj: object): string[] | undefined {
	return proxyPaths.get(obj);
}

/**
 * Tagged-union shape descriptor for a deep lazy proxy.
 *
 * - `object` proxies wrap a plain object target. `keys` is optional —
 *   when omitted, ownKeys/Object.keys() trigger a lazy `getValueAtPath`
 *   round-trip to fetch them.
 * - `array` proxies wrap an array target so `Array.isArray(proxy)` is `true`
 *   and structured clone / `Array.prototype.map` iterate indices correctly.
 */
export type ProxyMeta = { kind: 'object'; keys?: string[] } | { kind: 'array'; length: number };

/**
 * Creates a deep lazy-loading proxy for workflow data.
 *
 * This proxy system enables on-demand loading of nested properties across
 * the isolate boundary using metadata-driven callbacks.
 *
 * Pattern:
 * 1. When property accessed: Call getValueAtPath([path]) to get metadata
 * 2. Metadata indicates type: primitive, object, array, or function
 * 3. For objects/arrays: Create nested proxy (shape-matched) for lazy loading
 * 4. For functions: Create wrapper that calls callFunctionAtPath
 * 5. Cache all fetched values in target to avoid repeated callbacks
 *
 * @param basePath - Current path in object tree (e.g., ['$json', 'user'])
 * @param meta - Optional shape descriptor (object/array + known keys/length)
 * @param callbacks - ivm.Reference callbacks for cross-isolate communication
 * @returns Proxy object with lazy loading behavior
 */
export function createDeepLazyProxy(
	basePath: string[] = [],
	meta?: ProxyMeta,
	callbacks?: {
		getValueAtPath: any;
		getArrayElement: any;
		callFunctionAtPath: any;
	},
): any {
	if (!callbacks) {
		throw new Error('createDeepLazyProxy requires callbacks parameter');
	}
	const { getValueAtPath, getArrayElement, callFunctionAtPath } = callbacks;

	const isArray = meta?.kind === 'array';
	const arrayLength = isArray ? meta.length : 0;
	const objectKeys = meta?.kind === 'object' ? meta.keys : undefined;

	// Cache for keys fetched from the bridge (root object proxies without known keys).
	// Shared between ownKeys and getOwnPropertyDescriptor for consistency.
	let fetchedKeys: string[] | undefined;

	function resolveObjectKeys(): string[] {
		if (objectKeys) return objectKeys;
		if (fetchedKeys) return fetchedKeys;
		const value = getValueAtPath.applySync(null, [basePath], {
			arguments: { copy: true },
			result: { copy: true },
		});
		throwIfErrorSentinel(value);
		if (isObjectMetadata(value)) {
			fetchedKeys = value.__keys;
			return fetchedKeys;
		}
		return [];
	}

	function isInArrayBounds(prop: string): number | undefined {
		const idx = Number(prop);
		if (!Number.isInteger(idx) || idx < 0 || idx >= arrayLength) return undefined;
		if (String(idx) !== prop) return undefined; // reject '00', '1.0', etc.
		return idx;
	}

	function materializeChild(basePath: string[], propOrIdx: string, value: unknown): unknown {
		if (value === undefined || value === null) return value;
		throwIfErrorSentinel(value);
		// `path = [...basePath, propOrIdx]` is built only inside the three branches
		// that actually use it, so non-metadata objects don't pay for the spread.
		if (value && typeof value === 'object' && (value as { __isFunction?: unknown }).__isFunction) {
			const path = [...basePath, propOrIdx];
			return function (...args: any[]) {
				const result = callFunctionAtPath.applySync(null, [path, ...args], {
					arguments: { copy: true },
					result: { copy: true },
				});
				throwIfErrorSentinel(result);
				return result;
			};
		}
		if (isArrayMetadata(value)) {
			const path = [...basePath, propOrIdx];
			return createDeepLazyProxy(path, { kind: 'array', length: value.__length }, callbacks);
		}
		if (isObjectMetadata(value)) {
			const path = [...basePath, propOrIdx];
			return createDeepLazyProxy(path, { kind: 'object', keys: value.__keys }, callbacks);
		}
		return value;
	}

	const target: object = isArray ? [] : {};

	const proxy = new Proxy(target as any, {
		ownKeys(): Array<string | symbol> {
			if (isArray) {
				const keys: Array<string | symbol> = Array.from({ length: arrayLength }, (_, i) =>
					String(i),
				);
				// Required by proxy invariant: target [] has non-configurable 'length'
				keys.push('length');
				return keys;
			}
			return resolveObjectKeys();
		},
		getOwnPropertyDescriptor(_target: any, prop: string | symbol): PropertyDescriptor | undefined {
			if (typeof prop === 'symbol') return undefined;
			if (isArray) {
				if (prop === 'length') {
					// Match the target array's own length descriptor shape so the
					// proxy invariant holds: writable & non-configurable.
					return {
						configurable: false,
						enumerable: false,
						writable: true,
						value: arrayLength,
					};
				}
				if (isInArrayBounds(prop) !== undefined) {
					// Lazy proxies are read-only views of host data — writes from
					// expression code must not propagate back across the isolate.
					// Reading `proxy[prop]` triggers the get trap, which fetches the
					// element from the host (if not cached) and stores it on the
					// target. Including `value` matches a native array's data
					// descriptor; the fetch is one-shot per index because of caching.
					return {
						configurable: true,
						enumerable: true,
						writable: false,
						value: proxy[prop],
					};
				}
				return undefined;
			}
			if (resolveObjectKeys().includes(prop)) {
				return { configurable: true, enumerable: true, writable: false };
			}
			return undefined;
		},
		get(targetObj: any, prop: string | symbol): unknown {
			// Symbol-keyed access falls through to the proxy target so that
			// well-known symbols on the prototype chain are reachable. For array
			// proxies this exposes `Array.prototype[Symbol.iterator]` etc., which
			// `[...arr]`, `for…of`, and destructuring need. For object proxies the
			// `{}` target has no own symbol-keyed entries; reads return undefined.
			// Symbols themselves aren't transferred across the isolate boundary —
			// only the values yielded by iteration, which already pay the proxy's
			// indexed `[[Get]]` (primitives or sub-proxies).
			if (typeof prop === 'symbol') {
				return targetObj[prop];
			}

			// `toString` and `valueOf` aren't intercepted — they fall through to the
			// target's prototype via the cache check below. That means `arr.toString()`
			// returns the canonical comma-joined string (via `Array.prototype.toString`
			// → `.join(',')`, paying one bridge call per element), and `obj.valueOf()`
			// returns the proxy itself instead of the internal target. Pre-fix this
			// trap shortcut to `''` / `targetObj` to avoid the O(n) cost, but the
			// divergence from native was surprising in expressions like
			// `={{ "items: " + $json.arr }}`. Users who care about the cost can call
			// `$json.arr.length` and index explicitly.

			// Array length is known at construction — no bridge call needed
			if (isArray && prop === 'length') {
				return arrayLength;
			}

			// Check cache - if already fetched, return cached value
			if (prop in targetObj) {
				return targetObj[prop];
			}

			if (isArray) {
				const idx = isInArrayBounds(prop);
				if (idx === undefined) return undefined;
				const element = getArrayElement.applySync(null, [basePath, idx], {
					arguments: { copy: true },
					result: { copy: true },
				});
				// Primitives (and null) skip `materializeChild`'s metadata checks.
				if (element === null || typeof element !== 'object') {
					targetObj[prop] = element;
					return element;
				}
				targetObj[prop] = materializeChild(basePath, String(idx), element);
				return targetObj[prop];
			}

			// Build path for this property — needed for the getValueAtPath call.
			// materializeChild rebuilds it only inside metadata branches.
			const path = [...basePath, prop];

			// Call back to host to get metadata/value
			// Note: getValueAtPath is an ivm.Reference passed via callbacks
			const value = getValueAtPath.applySync(null, [path], {
				arguments: { copy: true },
				result: { copy: true },
			});

			targetObj[prop] = materializeChild(basePath, prop, value);
			return targetObj[prop];
		},

		has(targetObj: any, prop: string | symbol): boolean {
			// Implement 'in' operator support
			// Example: '$json' in data

			// Mirror the get trap: symbol-keyed lookups defer to the target so
			// `Symbol.iterator in arr` reflects the prototype chain.
			if (typeof prop === 'symbol') return prop in targetObj;

			if (isArray) {
				if (prop === 'length') return true;
				if (prop in targetObj) return true;
				return isInArrayBounds(prop) !== undefined;
			}

			// Check cache first
			if (prop in targetObj) {
				return true;
			}

			// Build path and check existence via callback
			const path = [...basePath, prop];
			const value = getValueAtPath.applySync(null, [path], {
				arguments: { copy: true },
				result: { copy: true },
			});

			// Handle errors serialized by host-side callbacks — reconstruct and throw
			// so the isolate's outer try-catch can serialize them back via __reportError
			throwIfErrorSentinel(value);

			// Property exists if value is not undefined
			// Note: null values mean property exists but is null
			return value !== undefined;
		},
	});

	proxyPaths.set(proxy, basePath);
	return proxy;
}
