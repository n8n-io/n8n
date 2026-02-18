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

		// Reset function (Step 3)
		var resetDataProxies: () => void;

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
// This will be populated by the reset function below
globalThis.__data = {};

// ============================================================================
// Reset Function for Data Proxies
// ============================================================================

/**
 * Reset workflow data proxies before each evaluation.
 *
 * This function is called from the bridge before executing each expression
 * to clear proxy caches and initialize fresh workflow data references.
 *
 * Pattern:
 * 1. Create lazy proxies for complex properties ($json, $binary, etc.)
 * 2. Fetch primitives directly ($runIndex, $itemIndex)
 * 3. Create function wrappers for callable properties ($items, etc.)
 * 4. Expose all properties to globalThis for expression access
 *
 * Called from bridge: context.evalSync('resetDataProxies()')
 */
function resetDataProxies(): void {
	// Clear existing __data object
	globalThis.__data = {};

	// Verify callbacks are available
	if (typeof globalThis.__getValueAtPath !== 'function') {
		throw new Error('__getValueAtPath callback not registered');
	}

	// -------------------------------------------------------------------------
	// Create lazy proxies for complex workflow properties
	// -------------------------------------------------------------------------

	globalThis.__data.$json = createDeepLazyProxy(['$json']);
	globalThis.__data.$binary = createDeepLazyProxy(['$binary']);
	globalThis.__data.$input = createDeepLazyProxy(['$input']);
	globalThis.__data.$node = createDeepLazyProxy(['$node']);
	globalThis.__data.$parameter = createDeepLazyProxy(['$parameter']);
	globalThis.__data.$workflow = createDeepLazyProxy(['$workflow']);
	globalThis.__data.$prevNode = createDeepLazyProxy(['$prevNode']);

	// -------------------------------------------------------------------------
	// Fetch primitives directly (no lazy loading needed for simple values)
	// -------------------------------------------------------------------------

	try {
		globalThis.__data.$runIndex = globalThis.__getValueAtPath.applySync(null, [['$runIndex']], {
			arguments: { copy: true },
			result: { copy: true },
		});
	} catch (error) {
		// Property doesn't exist - set to undefined
		globalThis.__data.$runIndex = undefined;
	}

	try {
		globalThis.__data.$itemIndex = globalThis.__getValueAtPath.applySync(null, [['$itemIndex']], {
			arguments: { copy: true },
			result: { copy: true },
		});
	} catch (error) {
		// Property doesn't exist - set to undefined
		globalThis.__data.$itemIndex = undefined;
	}

	// -------------------------------------------------------------------------
	// Expose workflow data to globalThis for expression access
	// -------------------------------------------------------------------------

	(globalThis as any).$json = globalThis.__data.$json;
	(globalThis as any).$binary = globalThis.__data.$binary;
	(globalThis as any).$input = globalThis.__data.$input;
	(globalThis as any).$node = globalThis.__data.$node;
	(globalThis as any).$parameter = globalThis.__data.$parameter;
	(globalThis as any).$workflow = globalThis.__data.$workflow;
	(globalThis as any).$prevNode = globalThis.__data.$prevNode;
	(globalThis as any).$runIndex = globalThis.__data.$runIndex;
	(globalThis as any).$itemIndex = globalThis.__data.$itemIndex;

	// -------------------------------------------------------------------------
	// Handle function properties (check if value is function metadata)
	// -------------------------------------------------------------------------

	// Check if $items exists and is a function
	if (typeof globalThis.__callFunctionAtPath === 'function') {
		try {
			const itemsValue = globalThis.__getValueAtPath.applySync(null, [['$items']], {
				arguments: { copy: true },
				result: { copy: true },
			});

			// If it's function metadata, create wrapper
			if (itemsValue && typeof itemsValue === 'object' && itemsValue.__isFunction) {
				(globalThis as any).$items = function (...args: any[]) {
					return globalThis.__callFunctionAtPath.applySync(null, [['$items'], ...args], {
						arguments: { copy: true },
						result: { copy: true },
					});
				};
				globalThis.__data.$items = (globalThis as any).$items;
			} else {
				// Not a function - set to undefined or the value itself
				(globalThis as any).$items = itemsValue;
				globalThis.__data.$items = itemsValue;
			}
		} catch (error) {
			// Property doesn't exist
			(globalThis as any).$items = undefined;
			globalThis.__data.$items = undefined;
		}
	}

	// TODO: Add other function properties as needed ($item, $vars, etc.)
}

// Expose resetDataProxies globally so bridge can call it
globalThis.resetDataProxies = resetDataProxies;
