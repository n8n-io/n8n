import type { ProxyCallbacks, ValueMetadata } from './types';

/**
 * Creates a deep lazy-loading proxy
 * @param basePath - Current path in the object tree
 * @param callbacks - Functions to fetch data
 * @returns Proxy object with lazy loading
 */
export function createDeepLazyProxy(basePath: string[], callbacks: ProxyCallbacks): any {
	return new Proxy({} as Record<string, unknown>, {
		get(target, prop): unknown {
			// Handle symbols (return undefined)
			if (typeof prop === 'symbol') {
				return undefined;
			}

			// Special properties
			if (prop === '__isProxy') return true;
			if (prop === '__path') return basePath;

			// Common Object methods (handle in proxy to avoid callback)
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

			// Check cache
			if (prop in target) {
				return target[prop];
			}

			// Build path and fetch
			const path = [...basePath, prop];
			const value = callbacks.getValueAtPath(path);

			// Handle undefined/null
			if (value === undefined || value === null) {
				target[prop] = value;
				return value;
			}

			// Handle functions (returned directly from callback)
			if (typeof value === 'function') {
				target[prop] = value;
				return value;
			}

			// Handle array metadata
			if (typeof value === 'object' && value !== null && '__isArray' in value) {
				const arrayMeta = value as { __isArray: true; __length: number; __data: unknown[] | null };

				// Small array with data
				if (arrayMeta.__data) {
					target[prop] = arrayMeta.__data;
					return target[prop];
				}

				// Large array - create array proxy
				const arrayProxy = createArrayProxy(path, arrayMeta.__length, callbacks);
				target[prop] = arrayProxy;
				return target[prop];
			}

			// Handle object metadata
			if (typeof value === 'object' && value !== null && '__isObject' in value) {
				// Create nested proxy
				target[prop] = createDeepLazyProxy(path, callbacks);
				return target[prop];
			}

			// Primitive value
			target[prop] = value;
			return value;
		},

		has(target, prop): boolean {
			// Implement 'in' operator
			if (typeof prop === 'symbol') return false;
			if (prop in target) return true;

			const path = [...basePath, prop];
			const value = callbacks.getValueAtPath(path);
			return value !== undefined;
		},
	});
}

/**
 * Creates a lazy-loading array proxy
 */
function createArrayProxy(
	basePath: string[],
	length: number,
	callbacks: ProxyCallbacks,
): unknown[] {
	return new Proxy([] as unknown[], {
		get(target, prop): unknown {
			// Handle length
			if (prop === 'length') {
				return length;
			}

			// Numeric index
			const index = Number(prop);
			if (!isNaN(index) && index >= 0 && index < length) {
				// Check cache
				if (!(prop in target)) {
					const element = callbacks.getArrayElement(basePath, index);

					// Handle metadata for nested objects/arrays
					if (element !== null && typeof element === 'object') {
						if ('__isArray' in element) {
							const arrayMeta = element as {
								__isArray: true;
								__length: number;
								__data: unknown[] | null;
							};
							if (arrayMeta.__data) {
								// Small nested array - use data directly
								target[index] = arrayMeta.__data;
							} else {
								// Large nested array - create array proxy
								const elementPath = [...basePath, String(index)];
								target[index] = createArrayProxy(elementPath, arrayMeta.__length, callbacks);
							}
						} else if ('__isObject' in element) {
							// Nested object - create object proxy
							const elementPath = [...basePath, String(index)];
							target[index] = createDeepLazyProxy(elementPath, callbacks);
						} else {
							// Regular object (shouldn't happen, but handle it)
							target[index] = element;
						}
					} else {
						// Primitive element
						target[index] = element;
					}
				}
				return target[index];
			}

			// Array methods (map, filter, etc.)
			// Note: These require full array - limitation for now
			return (target as unknown[])[prop as keyof unknown[]];
		},
	});
}
