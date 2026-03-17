import { DateTime, IANAZone, Settings } from 'luxon';

import { extend, extendOptional } from '../extensions/extend';
import { extendedFunctions } from '../extensions/function-extensions';

import { __sanitize, createSafeErrorSubclass, ExpressionError } from './safe-globals';
import { createDeepLazyProxy } from './lazy-proxy';

// Pre-create safe error subclass wrappers (reused across evaluations)
const SafeTypeError = createSafeErrorSubclass(TypeError);
const SafeSyntaxError = createSafeErrorSubclass(SyntaxError);
const SafeEvalError = createSafeErrorSubclass(EvalError);
const SafeRangeError = createSafeErrorSubclass(RangeError);
const SafeReferenceError = createSafeErrorSubclass(ReferenceError);
const SafeURIError = createSafeErrorSubclass(URIError);

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
export function resetDataProxies(timezone?: string): void {
	if (timezone && !IANAZone.isValidZone(timezone)) {
		throw new Error(`Invalid timezone: "${timezone}"`);
	}
	Settings.defaultZone = timezone ?? 'system';

	// Clear existing __data object
	globalThis.__data = {};

	// __sanitize must be on __data because PrototypeSanitizer generates:
	// obj[this.__sanitize(expr)] where 'this' is __data (via .call(__data) wrapping)
	// Use a non-writable property descriptor so override attempts throw instead of silently succeeding.
	Object.defineProperty(globalThis.__data, '__sanitize', {
		get: () => __sanitize,
		set: () => {
			throw new ExpressionError('Cannot override "__sanitize" due to security concerns');
		},
		enumerable: false,
		configurable: false,
	});

	// Verify callbacks are available
	// Note: ivm.Reference may not be typeof 'function', check for existence
	if (!globalThis.__getValueAtPath) {
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
	globalThis.__data.$data = createDeepLazyProxy(['$data']);
	globalThis.__data.$env = createDeepLazyProxy(['$env']);

	// -------------------------------------------------------------------------
	// Create DateTime values inside the isolate (not lazy-loaded from host,
	// because host-side DateTime objects lose their prototype crossing the
	// boundary). The isolate has its own luxon with the correct timezone
	// already set via Settings.defaultZone above.
	// -------------------------------------------------------------------------

	globalThis.__data.$now = DateTime.now();
	globalThis.__data.$today = DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

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

	globalThis.$json = globalThis.__data.$json;
	globalThis.$binary = globalThis.__data.$binary;
	globalThis.$input = globalThis.__data.$input;
	globalThis.$node = globalThis.__data.$node;
	globalThis.$parameter = globalThis.__data.$parameter;
	globalThis.$workflow = globalThis.__data.$workflow;
	globalThis.$prevNode = globalThis.__data.$prevNode;
	globalThis.$runIndex = globalThis.__data.$runIndex as number | undefined;
	globalThis.$itemIndex = globalThis.__data.$itemIndex as number | undefined;
	globalThis.$data = globalThis.__data.$data;
	globalThis.$env = globalThis.__data.$env;
	globalThis.$now = globalThis.__data.$now as DateTime;
	globalThis.$today = globalThis.__data.$today as DateTime;

	// Expose standalone functions (min, max, average, numberList, zip, $ifEmpty, etc.)
	Object.assign(globalThis.__data, extendedFunctions);

	// -------------------------------------------------------------------------
	// Handle function properties (check if value is function metadata)
	// -------------------------------------------------------------------------

	// Check if $items exists and is a function
	if (globalThis.__callFunctionAtPath) {
		try {
			const itemsValue = globalThis.__getValueAtPath.applySync(null, [['$items']], {
				arguments: { copy: true },
				result: { copy: true },
			});

			// If it's function metadata, create wrapper
			if (itemsValue && typeof itemsValue === 'object' && itemsValue.__isFunction) {
				globalThis.$items = function (...args: unknown[]) {
					return globalThis.__callFunctionAtPath.applySync(null, [['$items'], ...args], {
						arguments: { copy: true },
						result: { copy: true },
					});
				};
				globalThis.__data.$items = globalThis.$items;
			} else {
				// Not a function - set to undefined or the value itself
				globalThis.$items = itemsValue;
				globalThis.__data.$items = itemsValue;
			}
		} catch (error) {
			// Property doesn't exist
			globalThis.$items = undefined;
			globalThis.__data.$items = undefined;
		}
	}

	// -------------------------------------------------------------------------
	// Expose globals on __data so tournament's "x in this ? this.x : global.x"
	// pattern resolves them correctly (tournament checks __data before global)
	// -------------------------------------------------------------------------

	globalThis.__data.DateTime = globalThis.DateTime;
	globalThis.__data.Duration = globalThis.Duration;
	globalThis.__data.Interval = globalThis.Interval;

	// Expose extend/extendOptional on __data so tournament's "x in this ? this.x : global.x"
	// pattern resolves them correctly when the VM checks __data first
	globalThis.__data.extend = extend;
	globalThis.__data.extendOptional = extendOptional;

	// Wire builtins so tournament's VariablePolyfill resolves them from __data
	initializeBuiltins(globalThis.__data as Record<string, unknown>);

	// $item(itemIndex) returns a sub-proxy for the specified item (legacy syntax)
	globalThis.__data.$item = function (itemIndex: number) {
		const indexStr = String(itemIndex);
		return {
			$json: createDeepLazyProxy(['$item', indexStr, '$json']),
			$binary: createDeepLazyProxy(['$item', indexStr, '$binary']),
		};
	};
}

// Matches initializeGlobalContext() lines 262-318 in packages/workflow/src/expression.ts
const DENYLISTED_GLOBALS = [
	'document',
	'global',
	'window',
	'Window',
	'globalThis',
	'self',
	'alert',
	'prompt',
	'confirm',
	'eval',
	'uneval',
	'setTimeout',
	'setInterval',
	'setImmediate',
	'clearImmediate',
	'queueMicrotask',
	'Function',
	'require',
	'module',
	'Buffer',
	'__dirname',
	'__filename',
	'fetch',
	'XMLHttpRequest',
	'Promise',
	'Generator',
	'GeneratorFunction',
	'AsyncFunction',
	'AsyncGenerator',
	'AsyncGeneratorFunction',
	'WebAssembly',
	'Reflect',
	'Proxy',
	'escape',
	'unescape',
] as const;

/**
 * Wire builtins onto __data so tournament's VariablePolyfill resolves them.
 *
 * Tournament transforms `Object` → `("Object" in this ? this : window).Object`.
 * `this` = __data. Without these entries on __data, builtins fall through to
 * `window` which doesn't exist in the isolate, causing a ReferenceError.
 *
 * Mirrors Expression.initializeGlobalContext() in packages/workflow/src/expression.ts.
 */
function initializeBuiltins(data: Record<string, unknown>): void {
	// ── Denylist: dangerous globals → empty objects ──
	for (const key of DENYLISTED_GLOBALS) {
		data[key] = {};
	}
	data.__lookupGetter__ = undefined;
	data.__lookupSetter__ = undefined;
	data.__defineGetter__ = undefined;
	data.__defineSetter__ = undefined;

	// ── Allowlist: safe versions of builtins ──

	// Object — use SafeObject wrapper from the runtime bundle
	data.Object = globalThis.SafeObject;

	// Error types — use SafeError and safe subclass wrappers
	data.Error = globalThis.SafeError;
	data.TypeError = SafeTypeError;
	data.SyntaxError = SafeSyntaxError;
	data.EvalError = SafeEvalError;
	data.RangeError = SafeRangeError;
	data.ReferenceError = SafeReferenceError;
	data.URIError = SafeURIError;

	// Arrays
	data.Array = Array;
	data.Int8Array = Int8Array;
	data.Uint8Array = Uint8Array;
	data.Uint8ClampedArray = Uint8ClampedArray;
	data.Int16Array = Int16Array;
	data.Uint16Array = Uint16Array;
	data.Int32Array = Int32Array;
	data.Uint32Array = Uint32Array;
	data.Float32Array = Float32Array;
	data.Float64Array = Float64Array;
	data.BigInt64Array = typeof BigInt64Array !== 'undefined' ? BigInt64Array : {};
	data.BigUint64Array = typeof BigUint64Array !== 'undefined' ? BigUint64Array : {};

	// Collections
	data.Map = Map;
	data.WeakMap = WeakMap;
	data.Set = Set;
	data.WeakSet = WeakSet;

	// Internationalization
	data.Intl = typeof Intl !== 'undefined' ? Intl : {};

	// Text
	data.String = String;

	// Numbers
	data.Number = Number;
	data.BigInt = typeof BigInt !== 'undefined' ? BigInt : {};
	data.Infinity = Infinity;
	data.parseFloat = parseFloat;
	data.parseInt = parseInt;

	// Structured data
	data.JSON = JSON;
	data.ArrayBuffer = typeof ArrayBuffer !== 'undefined' ? ArrayBuffer : {};
	data.SharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : {};
	data.Atomics = typeof Atomics !== 'undefined' ? Atomics : {};
	data.DataView = typeof DataView !== 'undefined' ? DataView : {};

	// Encoding
	data.encodeURI = encodeURI;
	data.encodeURIComponent = encodeURIComponent;
	data.decodeURI = decodeURI;
	data.decodeURIComponent = decodeURIComponent;

	// Other
	data.Boolean = Boolean;
	data.Symbol = Symbol;
}
