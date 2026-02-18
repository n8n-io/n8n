import { DateTime, Duration, Interval } from 'luxon';
import * as lodash from 'lodash';

// Augment globalThis with runtime properties
declare global {
	namespace globalThis {
		// Callbacks from bridge (ivm.Reference)
		var __getValueAtPath: any;
		var __getArrayElement: any;
		var __callFunctionAtPath: any;

		// Data container
		var __data: Record<string, unknown>;

		// Proxy creator function
		var createDeepLazyProxy: (basePath?: string[]) => any;

		// Safe wrappers
		var SafeObject: typeof Object;
		var SafeError: typeof Error;

		// Libraries (already declared via lodash import, but needed for runtime)
		// Note: _ causes duplicate identifier error, will be assigned without type declaration
		var DateTime: typeof import('luxon').DateTime;
		var Duration: typeof import('luxon').Duration;
		var Interval: typeof import('luxon').Interval;
	}
}

// ============================================================================
// Library Setup
// ============================================================================

// @ts-ignore - _ is assigned to globalThis for expression runtime
globalThis._ = lodash;

// Expose Luxon both as individual globals and as luxon object
globalThis.DateTime = DateTime;
globalThis.Duration = Duration;
globalThis.Interval = Interval;

// Also expose as luxon namespace (for expressions like luxon.DateTime.now())
(globalThis as any).luxon = {
	DateTime,
	Duration,
	Interval,
};

// ============================================================================
// Safe Wrappers for Security-Sensitive Globals
// ============================================================================

/**
 * SafeObject - Blocks dangerous Object methods that could lead to RCE
 *
 * Blocked methods:
 * - defineProperty, setPrototypeOf: Prevent prototype pollution
 * - getOwnPropertyDescriptor: Prevent property descriptor manipulation
 * - __defineGetter__, __defineSetter__: Legacy descriptor manipulation
 */
const SafeObject = new Proxy(Object, {
	get(target, prop) {
		// Block dangerous methods (return undefined)
		const blockedMethods = [
			'defineProperty',
			'defineProperties',
			'setPrototypeOf',
			'getOwnPropertyDescriptor',
			'getOwnPropertyDescriptors',
			'__defineGetter__',
			'__defineSetter__',
			'__lookupGetter__',
			'__lookupSetter__',
		];

		if (blockedMethods.includes(prop as string)) {
			return undefined;
		}

		// Block getPrototypeOf by throwing (more secure than returning undefined)
		if (prop === 'getPrototypeOf') {
			throw new Error('Object.getPrototypeOf is not allowed');
		}

		// Allow other Object methods
		const value = (target as any)[prop];
		if (typeof value === 'function') {
			// Use arrow function wrapper to preserve 'this' binding
			return (...args: any[]) => value.apply(target, args);
		}
		return value;
	},
});

/**
 * SafeError - Blocks stack manipulation methods
 *
 * Blocked properties:
 * - stackTraceLimit, captureStackTrace, prepareStackTrace: Prevent stack manipulation attacks
 */
const SafeError = new Proxy(Error, {
	get(target, prop) {
		// Block stack manipulation (return undefined)
		const blockedProps = ['stackTraceLimit', 'captureStackTrace', 'prepareStackTrace'];
		if (blockedProps.includes(prop as string)) {
			return undefined;
		}

		// Block dangerous methods
		const blockedMethods = ['__defineGetter__', '__defineSetter__'];
		if (blockedMethods.includes(prop as string)) {
			return undefined;
		}

		const value = (target as any)[prop];
		if (typeof value === 'function') {
			return (...args: any[]) => value.apply(target, args);
		}
		return value;
	},
	set(target, prop, value) {
		// Block setting prepareStackTrace
		if (prop === 'prepareStackTrace') {
			return false;
		}
		(target as any)[prop] = value;
		return true;
	},
});

// Expose SafeObject and SafeError globally for expression use
globalThis.SafeObject = SafeObject;
globalThis.SafeError = SafeError;

// ============================================================================
// Deep Lazy Proxy System
// ============================================================================

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
function createDeepLazyProxy(basePath: string[] = []): any {
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

			// Handle arrays - metadata: { __isArray: true, __length: number, __data?: any[] }
			if (value && typeof value === 'object' && value.__isArray) {
				// Small array: metadata includes data
				if (value.__data) {
					target[prop] = value.__data;
					return target[prop];
				}

				// Large array: create array proxy for lazy element loading
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
								arrTarget[arrProp] = element;
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

// Make createDeepLazyProxy available globally for reset function
globalThis.createDeepLazyProxy = createDeepLazyProxy;

// ============================================================================
// Initialize Data Container
// ============================================================================

// Initialize empty __data object
// This will be populated by the reset function (Step 3)
globalThis.__data = {};
