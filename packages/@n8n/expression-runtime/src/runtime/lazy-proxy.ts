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

function isObjectMetadata(value: unknown): value is ObjectMetadata {
	return (
		typeof value === 'object' &&
		value !== null &&
		'__isObject' in value &&
		value.__isObject === true
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
 * Creates a deep lazy-loading proxy for workflow data.
 *
 * This proxy system enables on-demand loading of nested properties across
 * the isolate boundary using metadata-driven callbacks.
 *
 * Pattern:
 * 1. When property accessed: Call __getValueAtPath([path]) to get metadata
 * 2. Metadata indicates type: primitive, object, array, or function
 * 3. For objects/arrays: Create nested proxy for lazy loading
 * 4. For functions: Create wrapper that calls __callFunctionAtPath
 * 5. Cache all fetched values in target to avoid repeated callbacks
 *
 * @param basePath - Current path in object tree (e.g., ['$json', 'user'])
 * @returns Proxy object with lazy loading behavior
 */
export function createDeepLazyProxy(basePath: string[] = [], knownKeys?: string[]): any {
	// Cache for keys fetched from the bridge (root proxies without knownKeys).
	// Shared between ownKeys and getOwnPropertyDescriptor for consistency.
	let fetchedKeys: string[] | undefined;

	function resolveKeys(): string[] {
		if (knownKeys) return knownKeys;
		if (fetchedKeys) return fetchedKeys;
		const value = globalThis.__getValueAtPath.applySync(null, [basePath], {
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

	const proxy = new Proxy({} as Record<string, unknown>, {
		ownKeys(): string[] {
			return resolveKeys();
		},
		getOwnPropertyDescriptor(_target: any, prop: string | symbol): PropertyDescriptor | undefined {
			if (typeof prop === 'symbol') return undefined;
			if (resolveKeys().includes(prop)) {
				return { configurable: true, enumerable: true, writable: false };
			}
			return undefined;
		},
		get(target: any, prop: string | symbol): unknown {
			// Handle Symbol properties - return undefined
			// Symbols like Symbol.toStringTag are accessed internally
			// We can't transfer Symbols via isolated-vm
			if (typeof prop === 'symbol') {
				return undefined;
			}

			// Handle common Object.prototype methods within isolate
			// Don't fetch from parent to avoid native function transfer issues
			if (prop === 'toString') {
				return function () {
					return '[object Object]';
				};
			}
			if (prop === 'valueOf') {
				return function () {
					return target;
				};
			}

			// Check cache - if already fetched, return cached value
			if (prop in target) {
				return target[prop];
			}

			// Build path for this property
			const path = [...basePath, prop];

			// Call back to parent to get metadata/value
			// Note: __getValueAtPath is an ivm.Reference set by bridge
			const value = globalThis.__getValueAtPath.applySync(null, [path], {
				arguments: { copy: true },
				result: { copy: true },
			});

			// Handle undefined/null - cache and return
			if (value === undefined || value === null) {
				target[prop] = value;
				return value;
			}

			// Handle errors serialized by host-side callbacks — reconstruct and throw
			// so the isolate's outer try-catch can serialize them back via __reportError
			throwIfErrorSentinel(value);

			// Handle functions - metadata: { __isFunction: true, __name: string }
			if (value && typeof value === 'object' && value.__isFunction) {
				// Create function wrapper that calls back to parent
				target[prop] = function (...args: any[]) {
					const result = globalThis.__callFunctionAtPath.applySync(null, [path, ...args], {
						arguments: { copy: true },
						result: { copy: true },
					});
					// Check if the host-side function threw — reconstruct and throw
					throwIfErrorSentinel(result);
					return result;
				};
				return target[prop];
			}

			// Handle arrays - metadata: { __isArray: true, __length: number }
			if (value && typeof value === 'object' && value.__isArray) {
				const arrayProxy = new Proxy([] as any[], {
					has(arrTarget: any, arrProp: string | symbol): boolean {
						if (typeof arrProp === 'symbol') return arrProp in arrTarget;
						const index = Number(arrProp);
						if (!isNaN(index) && index >= 0 && index < value.__length) {
							return true;
						}
						return arrProp in arrTarget;
					},
					get(arrTarget: any, arrProp: string | symbol): unknown {
						// Symbols can't be transferred via isolated-vm; return undefined
						if (typeof arrProp === 'symbol') {
							return undefined;
						}

						// Handle array length
						if (arrProp === 'length') {
							return value.__length;
						}

						// Handle numeric index
						const index = Number(arrProp);
						if (!isNaN(index) && index >= 0) {
							// Check cache
							if (!(arrProp in arrTarget)) {
								// Fetch element from parent
								const element = globalThis.__getArrayElement.applySync(null, [path, index], {
									arguments: { copy: true },
									result: { copy: true },
								});
								throwIfErrorSentinel(element);
								// Handle element metadata (arrays and objects need proxies)
								if (element && typeof element === 'object' && element.__isArray) {
									const elementPath = [...path, String(index)];
									arrTarget[arrProp] = createDeepLazyProxy(elementPath);
								} else if (isObjectMetadata(element)) {
									// Object metadata: create nested proxy, passing known keys to
									// avoid an extra __getValueAtPath round-trip for ownKeys/Object.keys()
									const elementPath = [...path, String(index)];
									arrTarget[arrProp] = createDeepLazyProxy(elementPath, element.__keys);
								} else {
									// Primitive element
									arrTarget[arrProp] = element;
								}
							}
							return arrTarget[arrProp];
						}

						// Array methods (map, filter, etc.)
						// Note: These require full array - limitation for now
						return arrTarget[arrProp];
					},
				});

				target[prop] = arrayProxy;
				return target[prop];
			}

			// Handle objects - metadata: { __isObject: true, __keys: string[] }
			if (isObjectMetadata(value)) {
				// Create nested proxy for recursive lazy loading, passing known keys
				target[prop] = createDeepLazyProxy(path, value.__keys);
				return target[prop];
			}

			// Primitive value - cache and return
			target[prop] = value;
			return value;
		},

		has(target: any, prop: string | symbol): boolean {
			// Implement 'in' operator support
			// Example: '$json' in data

			if (typeof prop === 'symbol') return false;

			// Check cache first
			if (prop in target) {
				return true;
			}

			// Build path and check existence via callback
			const path = [...basePath, prop];
			const value = globalThis.__getValueAtPath.applySync(null, [path], {
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
