import { DateTime, IANAZone, Settings } from 'luxon';

import { extend, extendOptional } from '../extensions/extend';
import { extendedFunctions } from '../extensions/function-extensions';

import { __sanitize, createSafeErrorSubclass, ExpressionError } from './safe-globals';
import {
	createDeepLazyProxy,
	isArrayMetadata,
	isObjectMetadata,
	throwIfErrorSentinel,
} from './lazy-proxy';
import { jmesPath } from './jmespath';
import { isKeyOf } from './utils';
import type { BridgeMessage } from '../bridge/bridge-messages';

// Pre-create safe error subclass wrappers (reused across evaluations)
const SafeTypeError = createSafeErrorSubclass(TypeError);
const SafeSyntaxError = createSafeErrorSubclass(SyntaxError);
const SafeEvalError = createSafeErrorSubclass(EvalError);
const SafeRangeError = createSafeErrorSubclass(RangeError);
const SafeReferenceError = createSafeErrorSubclass(ReferenceError);
const SafeURIError = createSafeErrorSubclass(URIError);

const NODE_RPC_TYPES = {
	first: 'getNodeFirst',
	last: 'getNodeLast',
	all: 'getNodeAll',
} as const satisfies Record<string, BridgeMessage['type']>;

// ============================================================================
// Build Context Function
// ============================================================================

/**
 * The subset of `ivm.Reference` shape the in-isolate runtime relies on.
 * Declared locally rather than importing from `isolated-vm` because this
 * module is bundled into the isolate IIFE, where the native module is
 * unavailable. The host wires real `ivm.Reference` instances which
 * structurally satisfy this interface.
 */
interface BridgeCallback {
	applySync(
		thisArg: unknown,
		args: unknown[],
		options?: { arguments?: { copy?: boolean }; result?: { copy?: boolean } },
	): unknown;
}

/**
 * Bridge callbacks the in-isolate runtime can invoke synchronously via
 * `ivm.Reference.applySync`.
 *
 *   - `getValueAtPath`, `getArrayElement`: data-access primitives used by the
 *     lazy-proxy system. Hot path; one ivm.Reference each for minimum overhead.
 *   - `callFunctionAtPath`: legacy generic dispatch; to be removed once
 *     every consumer has migrated to typed messages.
 *   - `callHost`: typed-RPC dispatcher. The in-isolate runtime constructs
 *     an envelope (e.g. `{ type: 'getNodeFirst', nodeName, ... }`) and the
 *     host-side dispatcher validates it with zod before routing to a handler.
 *     A single ivm.Reference covers every typed operation; new operations
 *     are new schemas in `bridge/bridge-messages.ts` + new cases in the
 *     dispatcher switch. The name reflects what this is: a synchronous
 *     host RPC, not a postMessage-style async send.
 *
 * The bridge wires all four callbacks unconditionally before invoking
 * `buildContext`, so the runtime treats them as present — no defensive
 * null/undefined checks at each call site.
 */
export interface BridgeCallbacks {
	getValueAtPath: BridgeCallback;
	getArrayElement: BridgeCallback;
	callFunctionAtPath: BridgeCallback;
	callHost: BridgeCallback;
}

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
 * @param callbacks - Bridge callbacks (data-access primitives + typed RPCs)
 * @param timezone - Optional IANA timezone string
 * @returns A context object with all workflow data, proxies, and builtins
 */
export function buildContext(
	callbacks: BridgeCallbacks,
	timezone?: string,
): Record<string, unknown> {
	if (timezone && !IANAZone.isValidZone(timezone)) {
		throw new Error(`Invalid timezone: "${timezone}"`);
	}
	Settings.defaultZone = timezone ?? 'system';

	const target: Record<string, unknown> = {};

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

	// Expose jmespath helpers in-isolate so they shadow the host-side
	// `data.$jmesPath` / `data.$jmespath` from WorkflowDataProxy. Same rationale
	// as extend / extendOptional above: keeping these in-isolate removes them
	// from the bridge's reachable host-callable surface.
	target.$jmesPath = jmesPath;
	target.$jmespath = jmesPath;

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

	// $() function for accessing other nodes.
	//
	// The returned object is a Proxy whose `get` trap intercepts properties
	// that have a typed RPC (e.g. `.first` → `getNodeFirst`) and routes them
	// through the `callHost` envelope. Everything else (properties like
	// `.params`, `.json`, and methods that don't yet have a typed RPC) is
	// read from an underlying lazy proxy via explicit delegation.
	//
	// Important: the synthetic Proxy's *target* is a plain `{}` rather than
	// the lazy proxy itself. Nesting one Proxy inside another causes V8 to
	// run invariant checks (`[[OwnPropertyKeys]]`, descriptor consistency)
	// against the inner target, which would trigger the lazy proxy's
	// `ownKeys` trap and an unnecessary `getValueAtPath` round-trip for the
	// whole node's keys. Using `{}` as the target keeps those checks cheap;
	// the lazy proxy lives in closure and is only consulted on demand.
	//
	// As more typed RPCs are added, more cases land in this trap.
	// The `has` trap mirrors the `get` trap for typed-RPC names so that
	// tournament's `"first" in this.$('Foo')` check resolves true even though
	// the inner target is empty.
	target.$ = function (nodeName: string) {
		const lazyProxy = createDeepLazyProxy(['$', nodeName], undefined, callbacks);
		const sendNodeMethod = (type: 'getNodeFirst' | 'getNodeLast' | 'getNodeAll') => {
			return (branchIndex?: number, runIndex?: number) => {
				const result = callbacks.callHost.applySync(
					null,
					[{ type, nodeName, branchIndex, runIndex }],
					{ arguments: { copy: true }, result: { copy: true } },
				);
				throwIfErrorSentinel(result);
				return result;
			};
		};
		return new Proxy({} as Record<string, unknown>, {
			get(_emptyTarget, prop) {
				if (isKeyOf(NODE_RPC_TYPES, prop)) {
					return sendNodeMethod(NODE_RPC_TYPES[prop]);
				}
				// Everything else: delegate to the lazy proxy. The lazy proxy's
				// own `get` trap handles caching, host fetching, and metadata.
				return (lazyProxy as Record<string | symbol, unknown>)[prop];
			},
			has(_emptyTarget, prop) {
				return (
					isKeyOf(NODE_RPC_TYPES, prop) || prop in (lazyProxy as Record<string | symbol, unknown>)
				);
			},
		});
	};

	// $input — current-node input proxy. Same synthetic-Proxy pattern as
	// `target.$()`: intercept the typed-RPC method names (`first`, `last`,
	// `all`, all zero-arg per the host's `WorkflowDataProxy`), delegate
	// everything else (notably the `.item` getter and `.params` / `.context`
	// properties) to a lazy proxy on `$input`.
	const lazyInputProxy = createDeepLazyProxy(['$input'], undefined, callbacks);
	const sendInputMethod = (type: 'getInputFirst' | 'getInputLast' | 'getInputAll') => {
		return () => {
			const result = callbacks.callHost.applySync(null, [{ type }], {
				arguments: { copy: true },
				result: { copy: true },
			});
			throwIfErrorSentinel(result);
			return result;
		};
	};
	target.$input = new Proxy({} as Record<string, unknown>, {
		get(_emptyTarget, prop) {
			if (prop === 'first') return sendInputMethod('getInputFirst');
			if (prop === 'last') return sendInputMethod('getInputLast');
			if (prop === 'all') return sendInputMethod('getInputAll');
			return (lazyInputProxy as Record<string | symbol, unknown>)[prop];
		},
		has(_emptyTarget, prop) {
			if (prop === 'first' || prop === 'last' || prop === 'all') return true;
			return prop in (lazyInputProxy as Record<string | symbol, unknown>);
		},
	});

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
			value = callbacks.getValueAtPath.applySync(null, [[key]], {
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
				const result = callbacks.callFunctionAtPath.applySync(null, [[key], ...args], {
					arguments: { copy: true },
					result: { copy: true },
				});
				throwIfErrorSentinel(result);
				return result;
			};
			return true;
		}

		// Object / array metadata — create a shape-matched lazy proxy for deep access
		if (isArrayMetadata(value)) {
			target[key] = createDeepLazyProxy(
				[key],
				{ kind: 'array', length: value.__length },
				callbacks,
			);
			return true;
		}
		if (isObjectMetadata(value)) {
			target[key] = createDeepLazyProxy([key], { kind: 'object', keys: value.__keys }, callbacks);
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
