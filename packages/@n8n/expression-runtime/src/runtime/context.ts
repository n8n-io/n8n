import { DateTime, IANAZone, Settings } from 'luxon';

import { extend, extendOptional } from '../extensions/extend';
import { extendedFunctions } from '../extensions/function-extensions';

import { __sanitize, createSafeErrorSubclass, ExpressionError } from './safe-globals';
import { createDeepLazyProxy, throwIfErrorSentinel } from './lazy-proxy';

// Pre-create safe error subclass wrappers (reused across evaluations)
const SafeTypeError = createSafeErrorSubclass(TypeError);
const SafeSyntaxError = createSafeErrorSubclass(SyntaxError);
const SafeEvalError = createSafeErrorSubclass(EvalError);
const SafeRangeError = createSafeErrorSubclass(RangeError);
const SafeReferenceError = createSafeErrorSubclass(ReferenceError);
const SafeURIError = createSafeErrorSubclass(URIError);

// ============================================================================
// Build Context Function
// ============================================================================

/**
 * Build a fresh, closure-scoped evaluation context.
 *
 * This function creates a context object that contains everything needed to
 * evaluate an expression, without touching any global mutable state
 * (except luxon's Settings.defaultZone which is process-wide).
 *
 * The returned object is used as tournament's `this` context in the
 * evalClosureSync wrapper.
 *
 * @param getValueAtPath - ivm.Reference for fetching values by path
 * @param getArrayElement - ivm.Reference for fetching array elements
 * @param callFunctionAtPath - ivm.Reference for calling functions by path
 * @param timezone - Optional IANA timezone string
 * @returns A context object with all workflow data, proxies, and builtins
 */
export function buildContext(
	getValueAtPath: any,
	getArrayElement: any,
	callFunctionAtPath: any,
	timezone?: string,
): Record<string, unknown> {
	if (timezone && !IANAZone.isValidZone(timezone)) {
		throw new Error(`Invalid timezone: "${timezone}"`);
	}
	Settings.defaultZone = timezone ?? 'system';

	const ctx: Record<string, unknown> = {};

	// Callback bundle passed to createDeepLazyProxy so proxies don't touch globalThis
	const callbacks = { getValueAtPath, getArrayElement, callFunctionAtPath };

	// __sanitize must be on the context because PrototypeSanitizer generates:
	// obj[this.__sanitize(expr)] where 'this' is the context (via .call(ctx) wrapping)
	// Use a non-writable property descriptor so override attempts throw instead of silently succeeding.
	Object.defineProperty(ctx, '__sanitize', {
		get: () => __sanitize,
		set: () => {
			throw new ExpressionError('Cannot override "__sanitize" due to security concerns');
		},
		enumerable: false,
		configurable: false,
	});

	// -------------------------------------------------------------------------
	// Create lazy proxies for complex workflow properties
	// -------------------------------------------------------------------------

	ctx.$json = createDeepLazyProxy(['$json'], undefined, callbacks);
	ctx.$binary = createDeepLazyProxy(['$binary'], undefined, callbacks);
	ctx.$input = createDeepLazyProxy(['$input'], undefined, callbacks);
	ctx.$node = createDeepLazyProxy(['$node'], undefined, callbacks);
	ctx.$parameter = createDeepLazyProxy(['$parameter'], undefined, callbacks);
	ctx.$workflow = createDeepLazyProxy(['$workflow'], undefined, callbacks);
	ctx.$prevNode = createDeepLazyProxy(['$prevNode'], undefined, callbacks);
	ctx.$data = createDeepLazyProxy(['$data'], undefined, callbacks);
	ctx.$env = createDeepLazyProxy(['$env'], undefined, callbacks);
	ctx.process = createDeepLazyProxy(['process'], undefined, callbacks);
	ctx.$execution = createDeepLazyProxy(['$execution'], undefined, callbacks);
	ctx.$vars = createDeepLazyProxy(['$vars'], undefined, callbacks);
	ctx.$secrets = createDeepLazyProxy(['$secrets'], undefined, callbacks);

	// -------------------------------------------------------------------------
	// Create DateTime values inside the isolate (not lazy-loaded from host,
	// because host-side DateTime objects lose their prototype crossing the
	// boundary). The isolate has its own luxon with the correct timezone
	// already set via Settings.defaultZone above.
	// -------------------------------------------------------------------------

	ctx.$now = DateTime.now();
	ctx.$today = DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

	// -------------------------------------------------------------------------
	// Fetch primitives directly (no lazy loading needed for simple values)
	// -------------------------------------------------------------------------

	function fetchPrimitive(key: string): unknown {
		try {
			return getValueAtPath.applySync(null, [[key]], {
				arguments: { copy: true },
				result: { copy: true },
			});
		} catch {
			return undefined;
		}
	}

	ctx.$runIndex = fetchPrimitive('$runIndex');
	ctx.$itemIndex = fetchPrimitive('$itemIndex');
	ctx.$executionId = fetchPrimitive('$executionId');
	ctx.$resumeWebhookUrl = fetchPrimitive('$resumeWebhookUrl');
	ctx.$webhookId = fetchPrimitive('$webhookId');
	ctx.$nodeId = fetchPrimitive('$nodeId');
	ctx.$nodeVersion = fetchPrimitive('$nodeVersion');

	// -------------------------------------------------------------------------
	// Expose standalone functions (min, max, average, numberList, zip, $ifEmpty, etc.)
	// -------------------------------------------------------------------------

	Object.assign(ctx, extendedFunctions);

	// -------------------------------------------------------------------------
	// Handle function properties (check if value is function metadata)
	// -------------------------------------------------------------------------

	// Probe a host-side property: if it is a function, create an isolate
	// wrapper that forwards calls via callFunctionAtPath; otherwise copy
	// the value as-is.
	function exposeHostFunction(name: string): void {
		if (!callFunctionAtPath) return;
		try {
			const value = getValueAtPath.applySync(null, [[name]], {
				arguments: { copy: true },
				result: { copy: true },
			});

			if (value && typeof value === 'object' && value.__isFunction) {
				ctx[name] = function (...args: unknown[]) {
					const result = callFunctionAtPath.applySync(null, [[name], ...args], {
						arguments: { copy: true },
						result: { copy: true },
					});
					throwIfErrorSentinel(result);
					return result;
				};
			} else {
				ctx[name] = value;
			}
		} catch {
			ctx[name] = undefined;
		}
	}

	exposeHostFunction('$items');
	exposeHostFunction('$fromAI');
	exposeHostFunction('$fromai');
	exposeHostFunction('$fromAi');

	// -------------------------------------------------------------------------
	// Expose globals on ctx so tournament's "x in this ? this.x : global.x"
	// pattern resolves them correctly (tournament checks ctx before global)
	// -------------------------------------------------------------------------

	ctx.DateTime = globalThis.DateTime;
	ctx.Duration = globalThis.Duration;
	ctx.Interval = globalThis.Interval;

	// Expose extend/extendOptional on ctx so tournament's "x in this ? this.x : global.x"
	// pattern resolves them correctly when the VM checks ctx first
	ctx.extend = extend;
	ctx.extendOptional = extendOptional;

	// Wire builtins so tournament's VariablePolyfill resolves them from ctx
	initializeBuiltins(ctx);

	// $item(itemIndex) returns a sub-proxy for the specified item (legacy syntax)
	ctx.$item = function (itemIndex: number) {
		const indexStr = String(itemIndex);
		return {
			$json: createDeepLazyProxy(['$item', indexStr, '$json'], undefined, callbacks),
			$binary: createDeepLazyProxy(['$item', indexStr, '$binary'], undefined, callbacks),
		};
	};

	// $() function for accessing other nodes
	ctx.$ = function (nodeName: string) {
		return createDeepLazyProxy(['$', nodeName], undefined, callbacks);
	};

	return ctx;
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
 * Wire builtins onto a context object so tournament's VariablePolyfill resolves them.
 *
 * Tournament transforms `Object` → `("Object" in this ? this : window).Object`.
 * `this` = ctx. Without these entries on ctx, builtins fall through to
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
