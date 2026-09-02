import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

import type { RuntimeBridge, BridgeConfig, ExecuteOptions, WorkflowData } from '../types';
import { DEFAULT_BRIDGE_CONFIG, TimeoutError, MemoryLimitError } from '../types';
import type { ErrorSentinel } from '../runtime/lazy-proxy';
import { bridgeMessageSchema } from './bridge-messages';

// Lazy-loaded quickjs-emscripten — avoids loading WASM when the barrel
// file is statically imported (e.g. for error classes). The module is
// only loaded when QuickJsBridge.initialize() is actually called.
type QuickJSModule = typeof import('quickjs-emscripten');
type QuickJSWasm = Awaited<ReturnType<QuickJSModule['getQuickJS']>>;
let _quickjs: QuickJSModule | null = null;

/**
 * The instantiated WASM module, cached after the first async initialize().
 * Creating runtimes/contexts from it is synchronous, so once it is cached
 * (pool warmup does this) initializeSync() can build a bridge on demand.
 */
let _quickjsWasm: QuickJSWasm | null = null;

async function getQuickJSModule(): Promise<QuickJSModule> {
	if (!_quickjs) {
		_quickjs = await import('quickjs-emscripten');
	}
	return _quickjs;
}

const BUNDLE_RELATIVE_PATH = path.join('dist', 'bundle', 'runtime.iife.js');

// ============================================================================
// Sentinel helpers
//
// QuickJS's vm.dump() loses Date / NaN / Map / Set / Error type identity
// (Date → ISO string, NaN → null, Map/Set/Error → empty plain object). Inside
// the QuickJS context we wrap those values as sentinel objects
// ({ __isDate: true, __isoString: ... } etc.) before they cross the boundary,
// then unwrap them on the host side. The isolated-vm bridge does NOT need this
// — structured clone preserves type identity natively.
// ============================================================================

function isDateSentinel(value: unknown): value is { __isDate: true; __isoString: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isDate === true &&
		typeof (value as Record<string, unknown>).__isoString === 'string'
	);
}

function isNaNSentinel(value: unknown): value is { __isNaN: true } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isNaN === true
	);
}

function isErrorValueSentinel(value: unknown): value is {
	__isErrorValue: true;
	__name: string;
	__message: string;
	__extra: Record<string, unknown>;
} {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isErrorValue === true
	);
}

function isMapSentinel(
	value: unknown,
): value is { __isMap: true; __entries: Array<[unknown, unknown]> } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isMap === true
	);
}

function isSetSentinel(value: unknown): value is { __isSet: true; __values: unknown[] } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isSet === true
	);
}

function isErrorSentinel(value: unknown): value is ErrorSentinel {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isError === true
	);
}

function isEscapedObject(
	value: unknown,
): value is { __isEscaped: true; __value: Record<string, unknown> } {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isEscaped === true
	);
}

/**
 * Recursively reconstruct Date objects, NaN values, Map, and Set from
 * sentinels produced by the QuickJS-side __prepareForTransfer wrapper.
 */
function unwrapSentinels(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value !== 'object') return value;
	// Escaped user objects: keys collided with the sentinel markers, so the
	// guest wrapped them (see injectTransferWrapper). Unwrap the values but
	// treat the object itself as plain data.
	if (isEscapedObject(value)) {
		const inner = value.__value;
		const result: Record<string, unknown> = {};
		for (const key of Object.keys(inner)) {
			result[key] = unwrapSentinels(inner[key]);
		}
		return result;
	}
	if (isDateSentinel(value)) return new Date(value.__isoString);
	if (isNaNSentinel(value)) return NaN;
	if (isErrorValueSentinel(value)) {
		const ErrorCtor =
			(
				{
					TypeError,
					SyntaxError,
					EvalError,
					RangeError,
					ReferenceError,
					URIError,
				} as Record<string, ErrorConstructor>
			)[value.__name] ?? Error;
		const err = new ErrorCtor(value.__message);
		if (value.__extra) {
			for (const [k, v] of Object.entries(value.__extra)) {
				(err as unknown as Record<string, unknown>)[k] = unwrapSentinels(v);
			}
		}
		return err;
	}
	if (isMapSentinel(value)) {
		return new Map(value.__entries.map(([k, v]) => [unwrapSentinels(k), unwrapSentinels(v)]));
	}
	if (isSetSentinel(value)) {
		return new Set(value.__values.map(unwrapSentinels));
	}
	if (Array.isArray(value)) return value.map(unwrapSentinels);
	// Pass error sentinels through untouched — execute() detects them after
	// unwrapping and reconstructs the Error on the host.
	if (isErrorSentinel(value)) return value;
	const result: Record<string, unknown> = {};
	for (const key of Object.keys(value as Record<string, unknown>)) {
		result[key] = unwrapSentinels((value as Record<string, unknown>)[key]);
	}
	return result;
}

/** Keys the transfer encoding reserves — keep in sync with the guest-side wrappers in injectTransferWrapper(). */
const TRANSFER_MARKER_KEYS = new Set([
	'__isDate',
	'__isNaN',
	'__isErrorValue',
	'__isMap',
	'__isSet',
	'__isEscaped',
]);

/**
 * Recursively wrap host values that JSON.stringify would flatten (Date, NaN,
 * Map, Set) into the same sentinel format the guest transfer wrapper uses,
 * escaping user objects whose keys collide with the markers. The guest
 * rebuilds real instances via __unwrapFromHost (see injectTransferWrapper),
 * so host-callback results match what isolated-vm's structured clone delivers.
 */
function wrapSpecialValuesForGuest(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (value instanceof Date) {
		// Invalid Dates have no ISO string; '' rebuilds an Invalid Date in the guest.
		return { __isDate: true, __isoString: isNaN(value.getTime()) ? '' : value.toISOString() };
	}
	if (typeof value === 'number' && Number.isNaN(value)) return { __isNaN: true };
	if (typeof value !== 'object') return value;
	if (value instanceof Map) {
		return {
			__isMap: true,
			__entries: [...value.entries()].map(([k, v]) => [
				wrapSpecialValuesForGuest(k),
				wrapSpecialValuesForGuest(v),
			]),
		};
	}
	if (value instanceof Set) {
		return { __isSet: true, __values: [...value.values()].map(wrapSpecialValuesForGuest) };
	}
	if (Array.isArray(value)) return value.map(wrapSpecialValuesForGuest);
	// Error sentinels are already in transfer shape — leave them intact.
	if (isErrorSentinel(value)) return value;
	const record = value as Record<string, unknown>;
	const result: Record<string, unknown> = {};
	let collides = false;
	for (const key of Object.keys(record)) {
		if (TRANSFER_MARKER_KEYS.has(key)) collides = true;
		result[key] = wrapSpecialValuesForGuest(record[key]);
	}
	return collides ? { __isEscaped: true, __value: result } : result;
}

/**
 * Serialize an error into a transferable metadata object.
 *
 * Host-side callbacks (getValueAtPath, etc.) catch errors and return this
 * sentinel instead of letting the error cross the boundary (which strips
 * custom class identity and properties). The in-context proxy detects
 * __isError and throws the sentinel; the host reconstructs a real Error
 * after it round-trips back (see execute() / reconstructError).
 */
function serializeError(err: unknown): ErrorSentinel {
	if (err instanceof Error) {
		const extra = Object.fromEntries(
			Object.entries(err).filter(([key]) => key !== 'name' && key !== 'message' && key !== 'stack'),
		);
		return {
			__isError: true,
			name: err.name,
			message: err.message,
			stack: err.stack,
			extra,
		};
	}
	return { __isError: true, name: 'Error', message: String(err), extra: {} };
}

/**
 * Read the runtime IIFE bundle by walking up from `__dirname` until
 * `dist/bundle/runtime.iife.js` is found. Walking up (rather than a fixed
 * relative path) works from either compiled output dir — `dist/cjs/bridge/`
 * and `dist/esm/bridge/` sit at different depths from the bundle.
 */
let _runtimeBundle: string | null = null;

async function readRuntimeBundle(): Promise<string> {
	if (_runtimeBundle !== null) return _runtimeBundle;
	let dir = __dirname;
	while (dir !== path.dirname(dir)) {
		try {
			_runtimeBundle = await readFile(path.join(dir, BUNDLE_RELATIVE_PATH), 'utf-8');
			return _runtimeBundle;
		} catch {}
		dir = path.dirname(dir);
	}
	throw new Error(
		`Could not find runtime bundle (${BUNDLE_RELATIVE_PATH}) in any parent of ${__dirname}`,
	);
}

/**
 * Convert a host JavaScript value to a JSON string suitable for round-tripping
 * into QuickJS via evalCode. Handles undefined (not valid JSON) by returning
 * the string "undefined".
 *
 * Only objects/arrays reach this — primitives (including top-level NaN via
 * newNumber) and Date are handled directly by the caller. Everything else
 * (lazy-proxy metadata, Intl outputs, typed-RPC results, error-sentinel
 * extras) is sentinel-wrapped first so nested Date/NaN/Map/Set survive the
 * JSON round-trip and rebuild in the guest via __unwrapFromHost — matching
 * what isolated-vm's structured clone delivers.
 */
function hostValueToJson(value: unknown): string {
	if (value === undefined) return 'undefined';
	if (value === null) return 'null';
	try {
		return JSON.stringify(wrapSpecialValuesForGuest(value));
	} catch {
		return 'undefined';
	}
}

/**
 * Navigate data object by path and return metadata or primitive value.
 * Mirrors the IsolatedVmBridge getValueAtPath callback so QuickJS
 * matches isolated-vm semantics, including special-cased $/$item navigation.
 */
function getValueAtPath(data: Record<string, unknown>, pathArr: string[]): unknown {
	let value: unknown = data;
	let startIndex = 0;
	const itemFn = (data as Record<string, unknown>).$item;
	if (pathArr.length >= 2 && pathArr[0] === '$item' && typeof itemFn === 'function') {
		const itemIndex = parseInt(pathArr[1], 10);
		if (!isNaN(itemIndex)) {
			value = (itemFn as (i: number) => unknown)(itemIndex);
			startIndex = 2;
		}
	} else {
		const dollarFn = (data as Record<string, unknown>).$;
		if (pathArr.length >= 2 && pathArr[0] === '$' && typeof dollarFn === 'function') {
			value = (dollarFn as (name: string) => unknown)(pathArr[1]);
			startIndex = 2;
		}
	}
	for (let i = startIndex; i < pathArr.length; i++) {
		value = (value as Record<string, unknown>)?.[pathArr[i]];
		if (value === undefined || value === null) {
			return value;
		}
	}

	// Functions must never cross the boundary — resolve them as undefined,
	// matching IsolatedVmBridge (invariant: __tests__/host-fn-shadowing.test.ts).
	if (typeof value === 'function') {
		return undefined;
	}

	if (Array.isArray(value)) {
		return {
			__isArray: true,
			__length: value.length,
			__data: null,
		};
	}

	// Dates have no enumerable own keys; pass through instead of
	// marshaling as an empty object.
	if (value instanceof Date) {
		return value;
	}

	if (value !== null && typeof value === 'object') {
		return {
			__isObject: true,
			__keys: Object.keys(value),
		};
	}

	return value;
}

function getArrayElement(data: Record<string, unknown>, pathArr: string[], index: number): unknown {
	let arr: unknown = data;
	let startIndex = 0;
	const itemFn = (data as Record<string, unknown>).$item;
	if (pathArr.length >= 2 && pathArr[0] === '$item' && typeof itemFn === 'function') {
		const itemIndex = parseInt(pathArr[1], 10);
		if (!isNaN(itemIndex)) {
			arr = (itemFn as (i: number) => unknown)(itemIndex);
			startIndex = 2;
		}
	} else {
		const dollarFn = (data as Record<string, unknown>).$;
		if (pathArr.length >= 2 && pathArr[0] === '$' && typeof dollarFn === 'function') {
			arr = (dollarFn as (name: string) => unknown)(pathArr[1]);
			startIndex = 2;
		}
	}
	for (let i = startIndex; i < pathArr.length; i++) {
		arr = (arr as Record<string, unknown>)?.[pathArr[i]];
		if (arr === undefined || arr === null) {
			return undefined;
		}
	}

	if (!Array.isArray(arr)) {
		return undefined;
	}

	// Reject non-integer / negative indices so a crafted "index" can't read off
	// the prototype chain. Mirrors IsolatedVmBridge.getArrayElement.
	if (!Number.isInteger(index) || index < 0) {
		return undefined;
	}

	const element = arr[index];

	// Functions must never cross the boundary — resolve as undefined, matching
	// getValueAtPath and IsolatedVmBridge (invariant: host-fn-shadowing.test.ts).
	if (typeof element === 'function') {
		return undefined;
	}

	// Dates have no enumerable own keys; pass through instead of
	// marshaling as an empty object.
	if (element instanceof Date) {
		return element;
	}

	if (element !== null && typeof element === 'object') {
		if (Array.isArray(element)) {
			return {
				__isArray: true,
				__length: element.length,
				__data: null,
			};
		}
		return {
			__isObject: true,
			__keys: Object.keys(element),
		};
	}

	return element;
}

/**
 * Host-side dispatcher for the typed-RPC `callHost` channel.
 *
 * Mirrors IsolatedVmBridge's dispatcher — see isolated-vm-bridge.ts for the
 * per-message rationale. The two copies are kept in sync at compile time:
 * the `never` check in the default case fails to compile when a new schema
 * lands in bridge-messages.ts without a matching case here.
 */
function dispatchHostCall(rawMsg: unknown, data: WorkflowData): unknown {
	const msg = bridgeMessageSchema.parse(rawMsg);
	switch (msg.type) {
		case 'getNodeFirst':
			return data.$?.(msg.nodeName)?.first?.(msg.branchIndex, msg.runIndex);
		case 'getNodeLast':
			return data.$?.(msg.nodeName)?.last?.(msg.branchIndex, msg.runIndex);
		case 'getNodeAll':
			return data.$?.(msg.nodeName)?.all?.(msg.branchIndex, msg.runIndex);
		case 'getInputFirst':
			return data.$input?.first?.();
		case 'getInputLast':
			return data.$input?.last?.();
		case 'getInputAll':
			return data.$input?.all?.();
		case 'getItems':
			return data.$items?.(msg.nodeName, msg.outputIndex, msg.runIndex);
		case 'fromAi':
			return data.$fromAI?.(msg.name, msg.description, msg.valueType, msg.defaultValue);
		case 'getNodePairedItem':
			return data.$?.(msg.nodeName)?.pairedItem?.(msg.itemIndex);
		case 'getNodeItemMatching':
			return data.$?.(msg.nodeName)?.itemMatching?.(msg.itemIndex);
		case 'getNodeItem':
			// `.item` is a host getter — accessing it invokes the resolver.
			return data.$?.(msg.nodeName)?.item;
		case 'evaluateExpression':
			return data.$evaluateExpression?.(msg.expression, msg.itemIndex);
		case 'getPairedItem':
			return data.$getPairedItem?.(
				msg.destinationNodeName,
				msg.incomingSourceData,
				msg.initialPairedItem,
			);
		default: {
			// Unreachable at runtime — zod rejects unknown `type` values before
			// the switch. The `never` assignment is the compile-time guard.
			const exhaustive: never = msg;
			void exhaustive;
			throw new Error('Unhandled bridge message');
		}
	}
}

/**
 * QuickJsBridge - Runtime bridge using quickjs-emscripten for expression evaluation.
 *
 * Mirrors the IsolatedVmBridge contract:
 * - Memory limit enforcement
 * - No access to Node.js APIs
 * - Timeout enforcement via interrupt handler
 * - Complete isolation from host process
 *
 * Callbacks are scoped per execute() call (see createCallbackHandles), so
 * concurrent / nested evaluations see fresh data. The runtime treats bridge
 * callbacks as plain functions, so `buildContext(callbacks, timezone)` gets
 * the host callback functions directly.
 */
export class QuickJsBridge implements RuntimeBridge {
	private runtime: import('quickjs-emscripten').QuickJSRuntime | undefined;
	private vm: import('quickjs-emscripten').QuickJSContext | undefined;
	private initialized = false;
	private disposed = false;
	private config: Required<BridgeConfig>;
	private logger: Required<BridgeConfig>['logger'];

	// Long-lived host-callback handles (Intl polyfills) — disposed on dispose()
	private intlHandles: Array<import('quickjs-emscripten').QuickJSHandle> = [];

	// Wall-clock deadlines of the execute() calls currently in flight, outer to
	// inner. execute() can re-enter (e.g. $evaluateExpression), and the runtime
	// has a single interrupt handler; the handler interrupts once the earliest
	// deadline passes, so a nested call cannot extend the outer call's budget.
	private deadlines: number[] = [];

	constructor(config: BridgeConfig = {}) {
		this.config = {
			...DEFAULT_BRIDGE_CONFIG,
			...config,
		};
		this.logger = this.config.logger;
	}

	async initialize(): Promise<void> {
		// Disposal is terminal (matches IsolatedVmBridge, whose isolate cannot be revived).
		if (this.disposed) throw new Error('Bridge has been disposed and cannot be reinitialized.');
		if (this.initialized) return;

		const { getQuickJS } = await getQuickJSModule();
		const QuickJS = await getQuickJS();
		_quickjsWasm = QuickJS;

		this.setupContext(QuickJS, await readRuntimeBundle());
	}

	/**
	 * Synchronous variant of initialize(), for on-demand creation inside the
	 * synchronous evaluate() path (lazy acquisition with an exhausted pool).
	 * Requires the WASM module to have been instantiated by an earlier async
	 * initialize() in this process — pool warmup provides that.
	 */
	initializeSync(): void {
		if (this.disposed) throw new Error('Bridge has been disposed and cannot be reinitialized.');
		if (this.initialized) return;

		// Both caches are populated by the same async initialize() (pool
		// warmup), so the sync path never touches the filesystem or the
		// event loop beyond the context setup itself.
		if (_quickjsWasm === null || _runtimeBundle === null) {
			throw new Error(
				'QuickJS WASM module and runtime bundle are not loaded yet: an async initialize() ' +
					'must run once (pool warmup) before bridges can be created synchronously',
			);
		}

		this.setupContext(_quickjsWasm, _runtimeBundle);
	}

	/** Everything after module/bundle acquisition is synchronous and shared. */
	private setupContext(QuickJS: QuickJSWasm, runtimeBundle: string): void {
		// Create runtime with memory limit (MB → bytes)
		this.runtime = QuickJS.newRuntime();
		this.runtime.setMemoryLimit(this.config.memoryLimit * 1024 * 1024);

		this.vm = this.runtime.newContext();

		// Install the interrupt handler once. It reads the live deadline stack, so
		// nested execute() calls share one budget: the earliest deadline wins.
		// Math.min() of an empty stack is Infinity, so an idle runtime never fires.
		this.runtime.setInterruptHandler(() => Date.now() > Math.min(...this.deadlines));

		// Set up 'global' / 'globalThis' self-reference
		const globalHandle = this.vm.global;
		this.vm.setProp(globalHandle, 'global', globalHandle);
		this.vm.setProp(globalHandle, 'globalThis', globalHandle);

		// Inject Intl polyfill — QuickJS doesn't include Intl, but Luxon needs it
		this.injectIntlPolyfill();

		// Load runtime bundle (DateTime, extend, SafeObject, proxy system, buildContext)
		this.loadRuntimeBundle(runtimeBundle);

		// Wrap __prepareForTransfer to mark Date/NaN/Map/Set/Error so they survive vm.dump()
		this.injectTransferWrapper();

		// Inject E() error handler matching IsolatedVmBridge's E() semantics
		this.injectErrorHandler();

		this.verifyProxySystem();

		this.initialized = true;

		this.logger.info('[QuickJsBridge] Initialized successfully');
	}

	/**
	 * Load the runtime IIFE bundle and verify required globals are present.
	 */
	private loadRuntimeBundle(runtimeBundle: string): void {
		if (!this.vm) throw new Error('Context not initialized');

		const result = this.vm.evalCode(runtimeBundle);
		if (result.error) {
			const errorStr = this.vm.dump(result.error);
			result.error.dispose();
			throw new Error(`Failed to load runtime bundle: ${String(errorStr)}`);
		}
		result.value.dispose();

		this.logger.info('[QuickJsBridge] Runtime bundle loaded');

		this.evalCodeOrThrow('typeof DateTime !== "undefined"', 'DateTime verification');
		this.evalCodeOrThrow('typeof extend !== "undefined"', 'extend verification');

		this.logger.info('[QuickJsBridge] Vendor libraries verified successfully');
	}

	/**
	 * Inject a polyfill for the Intl API.
	 *
	 * QuickJS doesn't include Intl, but Luxon (bundled in the runtime) uses
	 * Intl.DateTimeFormat, Intl.NumberFormat, Intl.RelativeTimeFormat, and
	 * Intl.ListFormat extensively. Rather than shimming all of this in pure JS,
	 * we register host callback functions that delegate to Node.js's real Intl
	 * implementation, then build lightweight JS wrapper classes that call them.
	 */
	private injectIntlPolyfill(): void {
		if (!this.vm) throw new Error('Context not initialized');

		const vm = this.vm;

		const dtfFn = vm.newFunction('__intl_dtf', (...handles) => {
			const args = handles.map((h) => vm.dump(h));
			const op = args[0] as string;
			const locales = args[1] as string | string[] | undefined;
			const options = args[2] as Intl.DateTimeFormatOptions | undefined;

			try {
				if (op === 'resolvedOptions') {
					const fmt = new Intl.DateTimeFormat(locales, options);
					return this.hostValueToQuickJSHandle(fmt.resolvedOptions());
				}
				if (op === 'format') {
					const fmt = new Intl.DateTimeFormat(locales, options);
					const ts = args[3] as number | undefined;
					const date = ts !== undefined ? new Date(ts) : new Date();
					return this.hostValueToQuickJSHandle(fmt.format(date));
				}
				if (op === 'formatToParts') {
					const fmt = new Intl.DateTimeFormat(locales, options);
					const ts = args[3] as number | undefined;
					const date = ts !== undefined ? new Date(ts) : new Date();
					return this.hostValueToQuickJSHandle(fmt.formatToParts(date));
				}
				if (op === 'supportedLocalesOf') {
					return this.hostValueToQuickJSHandle(
						Intl.DateTimeFormat.supportedLocalesOf(locales ?? []),
					);
				}
			} catch (err) {
				return this.hostValueToQuickJSHandle({
					__intlError: true,
					message: err instanceof Error ? err.message : String(err),
				});
			}
			return vm.undefined;
		});
		vm.setProp(vm.global, '__intl_dtf', dtfFn);
		this.intlHandles.push(dtfFn);

		const nfFn = vm.newFunction('__intl_nf', (...handles) => {
			const args = handles.map((h) => vm.dump(h));
			const op = args[0] as string;
			const locales = args[1] as string | string[] | undefined;
			const options = args[2] as Intl.NumberFormatOptions | undefined;

			try {
				if (op === 'resolvedOptions') {
					const fmt = new Intl.NumberFormat(locales, options);
					return this.hostValueToQuickJSHandle(fmt.resolvedOptions());
				}
				if (op === 'format') {
					const fmt = new Intl.NumberFormat(locales, options);
					const num = args[3] as number;
					return this.hostValueToQuickJSHandle(fmt.format(num));
				}
				if (op === 'formatToParts') {
					const fmt = new Intl.NumberFormat(locales, options);
					const num = args[3] as number;
					return this.hostValueToQuickJSHandle(fmt.formatToParts(num));
				}
			} catch (err) {
				return this.hostValueToQuickJSHandle({
					__intlError: true,
					message: err instanceof Error ? err.message : String(err),
				});
			}
			return vm.undefined;
		});
		vm.setProp(vm.global, '__intl_nf', nfFn);
		this.intlHandles.push(nfFn);

		const rtfFn = vm.newFunction('__intl_rtf', (...handles) => {
			const args = handles.map((h) => vm.dump(h));
			const op = args[0] as string;
			const locales = args[1] as string | string[] | undefined;
			const options = args[2] as Intl.RelativeTimeFormatOptions | undefined;

			try {
				if (op === 'resolvedOptions') {
					const fmt = new Intl.RelativeTimeFormat(locales, options);
					return this.hostValueToQuickJSHandle(fmt.resolvedOptions());
				}
				if (op === 'format') {
					const fmt = new Intl.RelativeTimeFormat(locales, options);
					const value = args[3] as number;
					const unit = args[4] as Intl.RelativeTimeFormatUnit;
					return this.hostValueToQuickJSHandle(fmt.format(value, unit));
				}
				if (op === 'formatToParts') {
					const fmt = new Intl.RelativeTimeFormat(locales, options);
					const value = args[3] as number;
					const unit = args[4] as Intl.RelativeTimeFormatUnit;
					return this.hostValueToQuickJSHandle(fmt.formatToParts(value, unit));
				}
			} catch (err) {
				return this.hostValueToQuickJSHandle({
					__intlError: true,
					message: err instanceof Error ? err.message : String(err),
				});
			}
			return vm.undefined;
		});
		vm.setProp(vm.global, '__intl_rtf', rtfFn);
		this.intlHandles.push(rtfFn);

		const lfFn = vm.newFunction('__intl_lf', (...handles) => {
			const args = handles.map((h) => vm.dump(h));
			const op = args[0] as string;
			const locales = args[1] as string | string[] | undefined;
			const options = args[2] as Intl.ListFormatOptions | undefined;

			try {
				if (op === 'format') {
					const fmt = new Intl.ListFormat(locales, options);
					const list = args[3] as string[];
					return this.hostValueToQuickJSHandle(fmt.format(list));
				}
				if (op === 'formatToParts') {
					const fmt = new Intl.ListFormat(locales, options);
					const list = args[3] as string[];
					return this.hostValueToQuickJSHandle(fmt.formatToParts(list));
				}
				if (op === 'resolvedOptions') {
					const fmt = new Intl.ListFormat(locales, options);
					return this.hostValueToQuickJSHandle(fmt.resolvedOptions());
				}
			} catch (err) {
				return this.hostValueToQuickJSHandle({
					__intlError: true,
					message: err instanceof Error ? err.message : String(err),
				});
			}
			return vm.undefined;
		});
		vm.setProp(vm.global, '__intl_lf', lfFn);
		this.intlHandles.push(lfFn);

		const shimCode = `
(function() {
	function checkError(result) {
		if (result && typeof result === 'object' && result.__intlError) {
			throw new Error(result.message);
		}
		return result;
	}

	function DateTimeFormat(locales, options) {
		this._locales = locales;
		this._options = options || {};
	}
	DateTimeFormat.prototype.resolvedOptions = function() {
		return checkError(__intl_dtf('resolvedOptions', this._locales, this._options));
	};
	DateTimeFormat.prototype.format = function(date) {
		var ts = date instanceof Date ? date.getTime() : (typeof date === 'number' ? date : Date.now());
		return checkError(__intl_dtf('format', this._locales, this._options, ts));
	};
	DateTimeFormat.prototype.formatToParts = function(date) {
		var ts = date instanceof Date ? date.getTime() : (typeof date === 'number' ? date : Date.now());
		return checkError(__intl_dtf('formatToParts', this._locales, this._options, ts));
	};
	DateTimeFormat.supportedLocalesOf = function(locales) {
		return checkError(__intl_dtf('supportedLocalesOf', locales));
	};

	function NumberFormat(locales, options) {
		this._locales = locales;
		this._options = options || {};
	}
	NumberFormat.prototype.resolvedOptions = function() {
		return checkError(__intl_nf('resolvedOptions', this._locales, this._options));
	};
	NumberFormat.prototype.format = function(num) {
		return checkError(__intl_nf('format', this._locales, this._options, num));
	};
	NumberFormat.prototype.formatToParts = function(num) {
		return checkError(__intl_nf('formatToParts', this._locales, this._options, num));
	};

	function RelativeTimeFormat(locales, options) {
		this._locales = locales;
		this._options = options || {};
	}
	RelativeTimeFormat.prototype.resolvedOptions = function() {
		return checkError(__intl_rtf('resolvedOptions', this._locales, this._options));
	};
	RelativeTimeFormat.prototype.format = function(value, unit) {
		return checkError(__intl_rtf('format', this._locales, this._options, value, unit));
	};
	RelativeTimeFormat.prototype.formatToParts = function(value, unit) {
		return checkError(__intl_rtf('formatToParts', this._locales, this._options, value, unit));
	};

	function ListFormat(locales, options) {
		this._locales = locales;
		this._options = options || {};
	}
	ListFormat.prototype.format = function(list) {
		return checkError(__intl_lf('format', this._locales, this._options, list));
	};
	ListFormat.prototype.formatToParts = function(list) {
		return checkError(__intl_lf('formatToParts', this._locales, this._options, list));
	};
	ListFormat.prototype.resolvedOptions = function() {
		return checkError(__intl_lf('resolvedOptions', this._locales, this._options));
	};

	globalThis.Intl = {
		DateTimeFormat: DateTimeFormat,
		NumberFormat: NumberFormat,
		RelativeTimeFormat: RelativeTimeFormat,
		ListFormat: ListFormat,
		Locale: function Locale(tag) { this.baseName = tag; this.language = tag.split('-')[0]; }
	};

	// QuickJS's built-in toLocale* methods are locale-unaware (no ECMA-402) and
	// ignore locales/options. Route them through the polyfill so they format on
	// the host, like the spec routes them through NumberFormat/DateTimeFormat.
	Number.prototype.toLocaleString = function(locales, options) {
		return new NumberFormat(locales, options).format(Number(this));
	};

	function hasAny(options, keys) {
		if (!options) return false;
		for (var i = 0; i < keys.length; i++) {
			if (options[keys[i]] !== undefined) return true;
		}
		return false;
	}
	var DATE_COMPONENTS = ['weekday', 'year', 'month', 'day'];
	var TIME_COMPONENTS = ['dayPeriod', 'hour', 'minute', 'second', 'fractionalSecondDigits'];
	// ToDateTimeOptions (ECMA-402 sec. 12): reject the style option the method
	// doesn't cover (as V8 does), and when options carry none of the method's
	// required components (and no dateStyle/timeStyle), fill in the method's
	// numeric defaults so e.g. toLocaleTimeString() shows a time.
	function toDateTimeOptions(options, requiredKeys, addDate, addTime, rejectedStyle) {
		if (rejectedStyle && options && options[rejectedStyle] !== undefined) {
			throw new TypeError('Invalid option : ' + rejectedStyle);
		}
		var merged = {};
		for (var k in options || {}) merged[k] = options[k];
		if (merged.dateStyle !== undefined || merged.timeStyle !== undefined) return merged;
		if (hasAny(options, requiredKeys)) return merged;
		if (addDate) { merged.year = 'numeric'; merged.month = 'numeric'; merged.day = 'numeric'; }
		if (addTime) { merged.hour = 'numeric'; merged.minute = 'numeric'; merged.second = 'numeric'; }
		return merged;
	}
	var ANY_COMPONENTS = DATE_COMPONENTS.concat(TIME_COMPONENTS);
	Date.prototype.toLocaleString = function(locales, options) {
		return new DateTimeFormat(locales, toDateTimeOptions(options, ANY_COMPONENTS, true, true)).format(this);
	};
	Date.prototype.toLocaleDateString = function(locales, options) {
		return new DateTimeFormat(locales, toDateTimeOptions(options, DATE_COMPONENTS, true, false, 'timeStyle')).format(this);
	};
	Date.prototype.toLocaleTimeString = function(locales, options) {
		return new DateTimeFormat(locales, toDateTimeOptions(options, TIME_COMPONENTS, false, true, 'dateStyle')).format(this);
	};
})();
`;

		const result = this.vm.evalCode(shimCode);
		if (result.error) {
			const errStr = this.vm.dump(result.error);
			result.error.dispose();
			throw new Error(
				`Failed to inject Intl polyfill: ${typeof errStr === 'object' ? JSON.stringify(errStr) : String(errStr)}`,
			);
		}
		result.value.dispose();

		this.logger.debug('[QuickJsBridge] Intl polyfill injected');
	}

	/**
	 * Wrap __prepareForTransfer so values that don't survive vm.dump()
	 * (Date, NaN, Map, Set, Error) are converted to sentinel objects.
	 * The host post-processes vm.dump() output to reconstruct real instances
	 * via unwrapSentinels(). Also injects __unwrapFromHost, the guest-side
	 * reverse: it rebuilds instances from the sentinels the host's
	 * wrapSpecialValuesForGuest() emits for callback results.
	 */
	private injectTransferWrapper(): void {
		if (!this.vm) throw new Error('Context not initialized');

		const wrapperCode = `
(function() {
	var original = __prepareForTransfer;
	globalThis.__prepareForTransfer = function(value) {
		var prepared = original(value);
		return wrapSpecialValues(prepared);
	};
	function wrapSpecialValues(v) {
		if (v === null || v === undefined) return v;
		// Functions and Promises must not leave the sandbox as results.
		// isolated-vm's structured clone rejects them; match its error.
		if (typeof v === 'function') {
			throw new TypeError(String(v) + ' could not be cloned');
		}
		if (v instanceof Date) {
			// Invalid Dates have no ISO string; '' rebuilds an Invalid Date on the host.
			return { __isDate: true, __isoString: isNaN(v.getTime()) ? '' : v.toISOString() };
		}
		if (typeof v === 'number' && isNaN(v)) {
			return { __isNaN: true };
		}
		if (typeof v !== 'object') return v;
		if (v instanceof Promise) {
			throw new TypeError('#<Promise> could not be cloned');
		}
		if (v instanceof Error) {
			var errExtra = {};
			var errKeys = Object.keys(v);
			for (var ei = 0; ei < errKeys.length; ei++) {
				if (errKeys[ei] !== 'name' && errKeys[ei] !== 'message' && errKeys[ei] !== 'stack') {
					errExtra[errKeys[ei]] = wrapSpecialValues(v[errKeys[ei]]);
				}
			}
			return { __isErrorValue: true, __name: v.name || 'Error', __message: v.message || '', __extra: errExtra };
		}
		if (v instanceof Map) {
			var entries = [];
			v.forEach(function(val, key) {
				entries.push([wrapSpecialValues(key), wrapSpecialValues(val)]);
			});
			return { __isMap: true, __entries: entries };
		}
		if (v instanceof Set) {
			var values = [];
			v.forEach(function(val) {
				values.push(wrapSpecialValues(val));
			});
			return { __isSet: true, __values: values };
		}
		if (Array.isArray(v)) return v.map(wrapSpecialValues);
		// Error sentinels are already in transfer shape — leave them intact.
		if (v.__isError) return v;
		var result = {};
		var keys = Object.keys(v);
		var collides = false;
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			if (
				key === '__isDate' || key === '__isNaN' || key === '__isErrorValue' ||
				key === '__isMap' || key === '__isSet' || key === '__isEscaped'
			) {
				collides = true;
			}
			result[key] = wrapSpecialValues(v[key]);
		}
		// User objects whose keys collide with transfer markers are escaped so
		// the host returns them as plain data (as isolated-vm does) instead of
		// misreading them as sentinels.
		return collides ? { __isEscaped: true, __value: result } : result;
	}

	// Reverse direction: rebuild real instances from the sentinels the host's
	// wrapSpecialValuesForGuest() produces for callback results.
	globalThis.__unwrapFromHost = function unwrapFromHost(v) {
		if (v === null || typeof v !== 'object') return v;
		// Error sentinels stay as-is — the in-context proxy detects and throws them.
		if (v.__isError === true) return v;
		if (v.__isDate === true) return new Date(v.__isoString);
		if (v.__isNaN === true) return NaN;
		if (v.__isMap === true) {
			var m = new Map();
			for (var i = 0; i < v.__entries.length; i++) {
				m.set(unwrapFromHost(v.__entries[i][0]), unwrapFromHost(v.__entries[i][1]));
			}
			return m;
		}
		if (v.__isSet === true) {
			var s = new Set();
			for (var j = 0; j < v.__values.length; j++) s.add(unwrapFromHost(v.__values[j]));
			return s;
		}
		if (v.__isEscaped === true) {
			var inner = v.__value;
			var out = {};
			var ekeys = Object.keys(inner);
			for (var e = 0; e < ekeys.length; e++) out[ekeys[e]] = unwrapFromHost(inner[ekeys[e]]);
			return out;
		}
		if (Array.isArray(v)) return v.map(unwrapFromHost);
		var result = {};
		var keys = Object.keys(v);
		for (var n = 0; n < keys.length; n++) result[keys[n]] = unwrapFromHost(v[keys[n]]);
		return result;
	};
})();
`;

		const result = this.vm.evalCode(wrapperCode);
		if (result.error) {
			const errStr = this.vm.dump(result.error);
			result.error.dispose();
			throw new Error(
				`Failed to inject transfer wrapper: ${typeof errStr === 'object' ? JSON.stringify(errStr) : String(errStr)}`,
			);
		}
		result.value.dispose();

		this.logger.debug('[QuickJsBridge] Transfer wrapper injected');
	}

	/**
	 * Inject the E() error handler matching IsolatedVmBridge semantics:
	 * - Re-throw ExpressionError / ExpressionExtensionError
	 * - Swallow everything else (TypeErrors, generic Errors, etc.)
	 *
	 * Errors from host callbacks arrive as sentinel objects (not class
	 * instances), so we match by `name` instead of instanceof.
	 */
	private injectErrorHandler(): void {
		if (!this.vm) throw new Error('Context not initialized');

		const result = this.vm.evalCode(`
			if (typeof E === 'undefined') {
				globalThis.E = function(error, _context) {
					var name = error && error.name;
					if (name === 'ExpressionError' || name === 'ExpressionExtensionError') {
						throw error;
					}
					return undefined;
				};
			}
		`);
		if (result.error) {
			const errorStr = this.vm.dump(result.error);
			result.error.dispose();
			throw new Error(`Failed to inject error handler: ${String(errorStr)}`);
		}
		result.value.dispose();

		this.logger.debug('[QuickJsBridge] Error handler injected');
	}

	private verifyProxySystem(): void {
		if (!this.vm) throw new Error('Context not initialized');

		const checks = [
			['createDeepLazyProxy', 'typeof createDeepLazyProxy !== "undefined"'],
			['buildContext', 'typeof buildContext !== "undefined"'],
			['SafeObject', 'typeof SafeObject !== "undefined"'],
			['SafeError', 'typeof SafeError !== "undefined"'],
		] as const;

		for (const [name, code] of checks) {
			const result = this.vm.evalCode(code);
			if (result.error) {
				result.error.dispose();
				throw new Error(`Proxy system verification failed: ${name} check errored`);
			}
			const val = this.vm.dump(result.value);
			result.value.dispose();
			if (val !== true) {
				throw new Error(`Proxy system verification failed: ${name} not available`);
			}
		}

		this.logger.debug('[QuickJsBridge] Proxy system verified');
	}

	/**
	 * Create per-execute callback function handles, closure-scoped to `data`.
	 *
	 * The handles are passed as arguments into the per-call wrapper function
	 * (see execute()) instead of being set as VM globals: `execute()` can
	 * re-enter synchronously (e.g. `$evaluateExpression`), and globals would
	 * let the nested call's callbacks clobber the in-flight outer call's data
	 * bindings. This mirrors IsolatedVmBridge's closure-scoped `$0`/`$1`/`$2`
	 * evalClosureSync references.
	 *
	 * Callers must dispose the returned handles when the call completes.
	 */
	private createCallbackHandles(
		data: WorkflowData,
	): Array<import('quickjs-emscripten').QuickJSHandle> {
		if (!this.vm) throw new Error('Context not initialized');

		const vm = this.vm;

		const getValueFn = vm.newFunction('__getValueAtPathImpl', (pathHandle) => {
			const pathArr = vm.dump(pathHandle) as string[];
			try {
				const result = getValueAtPath(data, pathArr);
				return this.hostValueToQuickJSHandle(result);
			} catch (err) {
				return this.hostValueToQuickJSHandle(serializeError(err));
			}
		});

		const getArrayFn = vm.newFunction('__getArrayElementImpl', (pathHandle, indexHandle) => {
			const pathArr = vm.dump(pathHandle) as string[];
			const index = vm.dump(indexHandle) as number;
			try {
				const result = getArrayElement(data, pathArr, index);
				return this.hostValueToQuickJSHandle(result);
			} catch (err) {
				return this.hostValueToQuickJSHandle(serializeError(err));
			}
		});

		const callHostFn = vm.newFunction('__callHostImpl', (msgHandle) => {
			const rawMsg = vm.dump(msgHandle);
			try {
				const result = dispatchHostCall(rawMsg, data);
				return this.hostValueToQuickJSHandle(result);
			} catch (err) {
				return this.hostValueToQuickJSHandle(serializeError(err));
			}
		});

		return [getValueFn, getArrayFn, callHostFn];
	}

	/**
	 * Convert a host JavaScript value to a QuickJS handle.
	 *
	 * For primitives, uses the dedicated vm.newXxx() methods.
	 * For complex objects (arrays, objects), uses JSON round-trip via evalCode.
	 */
	private hostValueToQuickJSHandle(value: unknown): import('quickjs-emscripten').QuickJSHandle {
		if (!this.vm) throw new Error('Context not initialized');

		if (value === undefined) return this.vm.undefined;
		if (value === null) return this.vm.null;

		if (typeof value === 'number') {
			return this.vm.newNumber(value);
		}
		if (typeof value === 'string') return this.vm.newString(value);
		if (typeof value === 'boolean') {
			return value ? this.vm.true : this.vm.false;
		}

		// Construct a real Date inside the context — JSON round-tripping would
		// collapse it to an ISO string (via Date.prototype.toJSON).
		if (value instanceof Date) {
			const dateResult = this.vm.evalCode(`(new Date(${value.getTime()}))`);
			if (dateResult.error) {
				dateResult.error.dispose();
				return this.vm.undefined;
			}
			return dateResult.value;
		}

		const json = hostValueToJson(value);
		if (json === 'undefined') return this.vm.undefined;

		const result = this.vm.evalCode(`__unwrapFromHost(${json})`);
		if (result.error) {
			result.error.dispose();
			return this.vm.undefined;
		}
		return result.value;
	}

	/**
	 * Execute JavaScript code in the QuickJS context.
	 *
	 * Mirrors IsolatedVmBridge.execute():
	 * 1. Create per-call host callbacks scoped to `data` (createCallbackHandles)
	 * 2. Build a fresh evaluation context via buildContext(callbacks, timezone)
	 * 3. Run wrapped code with `this` set to the context
	 * 4. Reconstruct error sentinels into real Errors
	 */
	execute(code: string, data: WorkflowData, options?: ExecuteOptions): unknown {
		if (!this.initialized || !this.vm || !this.runtime) {
			throw new Error('Bridge not initialized. Call initialize() first.');
		}

		// A nested call runs on what is left of the configured timeout, so the
		// chain shares one budget (mirrors IsolatedVmBridge). A configured
		// timeout of 0 means "no limit", so there is nothing to share.
		const elapsedMs = options?.elapsedMs ?? 0;
		const nested = elapsedMs > 0 && this.config.timeout > 0;
		let timeout = this.config.timeout;
		if (nested) {
			timeout = Math.trunc(this.config.timeout - elapsedMs);
			if (timeout <= 0) throw this.timeoutError(true);
		}

		const callbackHandles = this.createCallbackHandles(data);
		let wrapperFn: import('quickjs-emscripten').QuickJSHandle | undefined;
		// Push this call's deadline; the interrupt handler (set in initialize)
		// interrupts on the earliest in-flight deadline. Popped in finally so a
		// nested call can't leave the outer budget extended.
		this.deadlines.push(Date.now() + timeout);
		try {
			const timezone = options?.timezone ? JSON.stringify(options.timezone) : 'undefined';

			// The callback impls arrive as function arguments (scoped to this call),
			// never as globals — see createCallbackHandles(). The runtime calls them
			// as plain functions; the isolated-vm bridge wires ivm.Callback there,
			// while QuickJS host functions are already plain functions in the context.
			const wrappedCode = `
(function(__getValueAtPathImpl, __getArrayElementImpl, __callHostImpl) {
  var __ctx = buildContext({
    getValueAtPath: __getValueAtPathImpl,
    getArrayElement: __getArrayElementImpl,
    callHost: __callHostImpl,
  }, ${timezone});
  try {
    var __result = (function() {
      ${code}
    }).call(__ctx);
    return __prepareForTransfer(__result);
  } catch(e) {
    if (e && e.__isError) return e;
    if (e == null) return { __isError: true, name: "Error", message: String(e), stack: "", extra: {} };
    var extra = {};
    for (var k in e) {
      if (Object.prototype.hasOwnProperty.call(e, k) && k !== "name" && k !== "message" && k !== "stack") extra[k] = e[k];
    }
    return {
      __isError: true,
      name: e.name || "Error",
      message: e.message || "",
      stack: e.stack || "",
      extra: extra
    };
  }
})`;

			const wrapperResult = this.vm.evalCode(wrappedCode);
			if (wrapperResult.error) {
				const errDump = this.vm.dump(wrapperResult.error);
				wrapperResult.error.dispose();
				throw new Error(`Expression compilation failed: ${String(errDump)}`);
			}
			wrapperFn = wrapperResult.value;

			const execResult = this.vm.callFunction(wrapperFn, this.vm.undefined, ...callbackHandles);

			if (execResult.error) {
				const errDump = this.vm.dump(execResult.error);
				execResult.error.dispose();

				// buildContext throws on invalid timezone — propagate the original message
				const errStr = String(
					typeof errDump === 'object' && errDump !== null
						? ((errDump as Record<string, unknown>).message ?? errDump)
						: errDump,
				);
				if (errStr.includes('interrupted')) {
					throw this.timeoutError(nested);
				}
				if (
					typeof errDump === 'object' &&
					errDump !== null &&
					typeof (errDump as Record<string, unknown>).message === 'string'
				) {
					throw new Error((errDump as Record<string, unknown>).message as string);
				}
				throw new Error(`Expression evaluation failed: ${errStr}`);
			}

			const rawResult = this.vm.dump(execResult.value);
			execResult.value.dispose();
			const result = unwrapSentinels(rawResult);

			if (isErrorSentinel(result)) {
				throw this.reconstructError(result);
			}

			this.logger.debug('[QuickJsBridge] Expression executed successfully');

			return result;
		} catch (error) {
			if (
				error instanceof Error &&
				(error.name === 'ExpressionError' || error.name === 'ExpressionExtensionError')
			) {
				throw error;
			}
			if (error instanceof TimeoutError || error instanceof MemoryLimitError) {
				throw error;
			}
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (errorMessage.includes('interrupted')) {
				throw this.timeoutError(nested);
			}
			if (errorMessage.includes('out of memory') || errorMessage.includes('memory')) {
				throw new MemoryLimitError(
					`Expression exceeded memory limit of ${this.config.memoryLimit}MB`,
					{},
				);
			}
			throw new Error(`Expression evaluation failed: ${errorMessage}`);
		} finally {
			this.deadlines.pop();
			wrapperFn?.dispose();
			for (const handle of callbackHandles) {
				handle.dispose();
			}
		}
	}

	/**
	 * Always names the configured limit, never the reduced budget a nested call
	 * ran on — reporting "timed out after 137ms" would misstate the limit.
	 */
	private timeoutError(nested: boolean): TimeoutError {
		return new TimeoutError(
			nested
				? `Nested expressions timed out after sharing the ${this.config.timeout}ms limit`
				: `Expression timed out after ${this.config.timeout}ms`,
			{},
		);
	}

	private reconstructError(data: ErrorSentinel): Error {
		const error = new Error(data.message);
		error.name = data.name || 'Error';
		if (data.stack) {
			error.stack = data.stack;
		}
		if (data.extra) {
			Object.assign(error, data.extra);
		}
		return error;
	}

	private evalCodeOrThrow(code: string, label: string): unknown {
		if (!this.vm) throw new Error('Context not initialized');

		const result = this.vm.evalCode(code);
		if (result.error) {
			const errStr = this.vm.dump(result.error);
			result.error.dispose();
			throw new Error(`${label} failed: ${String(errStr)}`);
		}
		const value = this.vm.dump(result.value);
		result.value.dispose();
		return value;
	}

	async dispose(): Promise<void> {
		if (this.disposed) return;

		for (const handle of this.intlHandles) {
			handle.dispose();
		}
		this.intlHandles = [];

		if (this.vm) {
			this.vm.dispose();
			this.vm = undefined;
		}
		if (this.runtime) {
			this.runtime.dispose();
			this.runtime = undefined;
		}

		this.disposed = true;
		this.initialized = false;

		this.logger.info('[QuickJsBridge] Disposed');
	}

	isDisposed(): boolean {
		return this.disposed;
	}
}
