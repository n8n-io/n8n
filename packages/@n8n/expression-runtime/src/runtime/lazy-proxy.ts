// ============================================================================
// Deep Lazy Proxy System
// ============================================================================
// For more information about Proxies see
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy

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
export function createDeepLazyProxy(basePath: string[] = []): any {
	return new Proxy({} as Record<string, unknown>, {
		get(target: any, prop: string | symbol): unknown {
			// Handle Symbol properties - return undefined
			// Symbols like Symbol.toStringTag are accessed internally
			// We can't transfer Symbols via isolated-vm
			if (typeof prop === 'symbol') {
				return undefined;
			}

			// Special properties for introspection
			if (prop === '__isProxy') return true;
			if (prop === '__path') return basePath;

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
			const path = [...basePath, prop as string];

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

			// Handle functions - metadata: { __isFunction: true, __name: string }
			if (value && typeof value === 'object' && value.__isFunction) {
				// Create function wrapper that calls back to parent
				target[prop] = function (...args: any[]) {
					return globalThis.__callFunctionAtPath.applySync(null, [path, ...args], {
						arguments: { copy: true },
						result: { copy: true },
					});
				};
				return target[prop];
			}

			// Handle arrays - metadata: { __isArray: true, __length: number }
			if (value && typeof value === 'object' && value.__isArray) {
				const arrayProxy = new Proxy([] as any[], {
					get(arrTarget: any, arrProp: string | symbol): unknown {
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
								// Handle element metadata (arrays and objects need proxies)
								if (element && typeof element === 'object' && element.__isArray) {
									const elementPath = [...path, String(index)];
									arrTarget[arrProp] = createDeepLazyProxy(elementPath);
								} else if (element && typeof element === 'object' && element.__isObject) {
									// Object metadata: create nested proxy
									const elementPath = [...path, String(index)];
									arrTarget[arrProp] = createDeepLazyProxy(elementPath);
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
			if (value && typeof value === 'object' && value.__isObject) {
				// Create nested proxy for recursive lazy loading
				target[prop] = createDeepLazyProxy(path);
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
			const path = [...basePath, prop as string];
			const value = globalThis.__getValueAtPath.applySync(null, [path], {
				arguments: { copy: true },
				result: { copy: true },
			});

			// Property exists if value is not undefined
			// Note: null values mean property exists but is null
			return value !== undefined;
		},
	});
}
