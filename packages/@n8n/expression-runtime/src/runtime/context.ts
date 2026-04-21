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

	const target: Record<string, unknown> = {};

	// Callback bundle passed to createDeepLazyProxy so proxies don't touch globalThis
	const callbacks = { getValueAtPath, getArrayElement, callFunctionAtPath };

	// __sanitize must be on the context because PrototypeSanitizer generates:
	// obj[this.__sanitize(expr)] where 'this' is the context (via .call(ctx) wrapping)
	// Use a non-writable property descriptor so override attempts throw instead of silently succeeding.
	Object.defineProperty(target, '__sanitize', {
		get: () => __sanitize,
		set: () => {
			throw new ExpressionError('Cannot override "__sanitize" due to security concerns');
		},
		enumerable: false,
		configurable: false,
	});

	// -------------------------------------------------------------------------
	// Create DateTime values inside the isolate (not lazy-loaded from host,
	// because host-side DateTime objects lose their prototype crossing the
	// boundary). The isolate has its own luxon with the correct timezone
	// already set via Settings.defaultZone above.
	// -------------------------------------------------------------------------

	target.$now = DateTime.now();
	target.$today = DateTime.now().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

	// -------------------------------------------------------------------------
	// Expose standalone functions (min, max, average, numberList, zip, $ifEmpty, etc.)
	// -------------------------------------------------------------------------

	Object.assign(target, extendedFunctions);

	// -------------------------------------------------------------------------
	// Expose globals on target so tournament's "x in this ? this.x : global.x"
	// pattern resolves them correctly (tournament checks ctx before global)
	// -------------------------------------------------------------------------

	target.DateTime = globalThis.DateTime;
	target.Duration = globalThis.Duration;
	target.Interval = globalThis.Interval;

	// Expose extend/extendOptional on target so tournament's "x in this ? this.x : global.x"
	// pattern resolves them correctly when the VM checks ctx first
	target.extend = extend;
	target.extendOptional = extendOptional;

	// Wire builtins so tournament's VariablePolyfill resolves them from ctx
	initializeBuiltins(target);

	// $item(itemIndex) returns a sub-proxy for the specified item (legacy syntax)
	target.$item = function (itemIndex: number) {
		const indexStr = String(itemIndex);
		return {
			$json: createDeepLazyProxy(['$item', indexStr, '$json'], undefined, callbacks),
			$binary: createDeepLazyProxy(['$item', indexStr, '$binary'], undefined, callbacks),
		};
	};

	// $() function for accessing other nodes
	target.$ = function (nodeName: string) {
		return createDeepLazyProxy(['$', nodeName], undefined, callbacks);
	};

	// -------------------------------------------------------------------------
	// Resolve an unknown key from the host. Called by the proxy's has/get traps
	// for keys not already on the target. The resolved value is cached on target
	// so each key is fetched at most once per evaluation.
	// -------------------------------------------------------------------------

	// Track keys we've already probed so we never call applySync twice
	// for the same key — even if the host returned undefined.
	const probedKeys = new Set<string>();

	function resolveFromHost(key: string): boolean {
		if (probedKeys.has(key)) return false;

		let value: unknown;
		try {
			value = getValueAtPath.applySync(null, [[key]], {
				arguments: { copy: true },
				result: { copy: true },
			});
		} catch {
			// Don't mark as probed — the throw may be transient
			// (e.g. host data not yet available) and a retry should be allowed.
			return false;
		}

		// Mark as probed only after a definitive answer from the host.
		probedKeys.add(key);

		if (value === undefined) return false;

		throwIfErrorSentinel(value);

		// Function metadata — create a callable wrapper
		if (value && typeof value === 'object' && (value as any).__isFunction) {
			target[key] = function (...args: unknown[]) {
				const result = callFunctionAtPath.applySync(null, [[key], ...args], {
					arguments: { copy: true },
					result: { copy: true },
				});
				throwIfErrorSentinel(result);
				return result;
			};
			return true;
		}

		// Object metadata — create a lazy proxy for deep access
		if (
			value &&
			typeof value === 'object' &&
			('__isObject' in (value as any) || '__isArray' in (value as any))
		) {
			target[key] = createDeepLazyProxy([key], undefined, callbacks);
			return true;
		}

		// Primitive or null — store directly
		target[key] = value;
		return true;
	}

	// -------------------------------------------------------------------------
	// Wrap target in a Proxy so unknown keys are resolved lazily from the host.
	// Tournament's VariablePolyfill transforms identifiers to:
	//   ("x" in this ? this : global).x
	// The has trap intercepts the "in" check, resolves the key on demand, and
	// caches it on target. The get trap then finds it cached.
	// -------------------------------------------------------------------------

	return new Proxy(target, {
		has(_target, prop) {
			if (typeof prop === 'symbol') return prop in target;
			if (prop in target) return true;
			return resolveFromHost(prop);
		},
		get(_target, prop) {
			if (typeof prop === 'symbol') return undefined;
			if (prop in target) return target[prop as string];
			// has() should have resolved it, but handle direct get() too
			resolveFromHost(prop as string);
			return target[prop as string];
		},
	});
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
