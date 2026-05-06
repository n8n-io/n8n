import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

import type { RuntimeBridge, BridgeConfig, ExecuteOptions } from '../types';
import { DEFAULT_BRIDGE_CONFIG, TimeoutError, MemoryLimitError } from '../types';
import type { ErrorSentinel } from '../runtime/lazy-proxy';

// Lazy-loaded quickjs-emscripten — avoids loading WASM when the barrel
// file is statically imported (e.g. for error classes). The module is
// only loaded when QuickJsBridge.initialize() is actually called.
type QuickJSModule = typeof import('quickjs-emscripten');
let _quickjs: QuickJSModule | null = null;

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
// (Date → ISO string, NaN → null, Map/Set → plain object, Error → plain
// object without prototype). Inside the QuickJS context we wrap those
// values as sentinel objects ({ __isDate: true, __isoString: ... } etc.)
// before they cross the boundary, then unwrap them on the host side.
// The isolated-vm bridge does NOT need this — structured clone preserves
// type identity natively.
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

/**
 * Recursively reconstruct Date objects, NaN values, Map, and Set from
 * sentinels produced by the QuickJS-side __prepareForTransfer wrapper.
 */
function unwrapSentinels(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value !== 'object') return value;
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
	// Don't recurse into error sentinels
	if (isErrorSentinel(value)) return value;
	const result: Record<string, unknown> = {};
	for (const key of Object.keys(value as Record<string, unknown>)) {
		result[key] = unwrapSentinels((value as Record<string, unknown>)[key]);
	}
	return result;
}

/**
 * Serialize an error into a transferable metadata object.
 *
 * Host-side callbacks (getValueAtPath, etc.) catch errors and return this
 * sentinel instead of letting the error cross the sandbox boundary (which
 * strips custom class identity and properties). The sandbox-side proxy
 * detects __isError and reconstructs a proper Error to throw.
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
 * `dist/bundle/runtime.iife.js` is found.
 */
async function readRuntimeBundle(): Promise<string> {
	let dir = __dirname;
	while (dir !== path.dirname(dir)) {
		try {
			return await readFile(path.join(dir, BUNDLE_RELATIVE_PATH), 'utf-8');
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
 * the string "undefined", and NaN by returning "NaN" (JSON.stringify turns NaN
 * into "null" which is incorrect).
 */
function hostValueToJson(value: unknown): string {
	if (value === undefined) return 'undefined';
	if (value === null) return 'null';
	if (typeof value === 'number' && isNaN(value)) return 'NaN';
	try {
		return JSON.stringify(value, (_key, v) => {
			if (typeof v === 'number' && isNaN(v)) return '__NaN__';
			return v;
		}).replace(/"__NaN__"/g, 'NaN');
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

	if (typeof value === 'function') {
		const fnString = value.toString();
		if (fnString.includes('[native code]')) {
			return undefined;
		}
		return { __isFunction: true, __name: pathArr[pathArr.length - 1] };
	}

	if (Array.isArray(value)) {
		return {
			__isArray: true,
			__length: value.length,
			__data: null,
		};
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

	const element = arr[index];

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

function callFunctionAtPath(
	data: Record<string, unknown>,
	pathArr: string[],
	args: unknown[],
): unknown {
	let fn: unknown = data;
	let parent: unknown = undefined;
	let startIndex = 0;
	const dollarFn = (data as Record<string, unknown>).$;
	if (pathArr.length >= 2 && pathArr[0] === '$' && typeof dollarFn === 'function') {
		fn = (dollarFn as (name: string) => unknown)(pathArr[1]);
		startIndex = 2;
	}
	for (let i = startIndex; i < pathArr.length; i++) {
		parent = fn;
		fn = (fn as Record<string, unknown>)?.[pathArr[i]];
	}

	if (typeof fn !== 'function') {
		throw new Error(`${pathArr.join('.')} is not a function`);
	}

	if (fn.toString().includes('[native code]')) {
		throw new Error(`${pathArr.join('.')} is a native function and cannot be called`);
	}

	return (fn as (...fnArgs: unknown[]) => unknown).call(parent, ...args);
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
 * Like IsolatedVmBridge, callbacks are scoped per-execute() call: the host
 * functions are re-registered each call, so concurrent / nested evaluations
 * see fresh data. The runtime bundle's `buildContext($0, $1, $2, timezone)`
 * is invoked with adapter-shim references that look like ivm.Reference
 * objects (they expose `.applySync()`).
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

	// Per-execute callback handles — disposed on the next execute() and on dispose()
	private callbackHandles: Array<import('quickjs-emscripten').QuickJSHandle> = [];

	constructor(config: BridgeConfig = {}) {
		this.config = {
			...DEFAULT_BRIDGE_CONFIG,
			...config,
		};
		this.logger = this.config.logger;
	}

	async initialize(): Promise<void> {
		if (this.initialized) return;

		const { getQuickJS } = await getQuickJSModule();
		const QuickJS = await getQuickJS();

		// Create runtime with memory limit (MB → bytes)
		this.runtime = QuickJS.newRuntime();
		this.runtime.setMemoryLimit(this.config.memoryLimit * 1024 * 1024);

		// Create context
		this.vm = this.runtime.newContext();

		// Set up 'global' / 'globalThis' self-reference
		const globalHandle = this.vm.global;
		this.vm.setProp(globalHandle, 'global', globalHandle);
		this.vm.setProp(globalHandle, 'globalThis', globalHandle);

		// Inject Intl polyfill — QuickJS doesn't include Intl, but Luxon needs it
		this.injectIntlPolyfill();

		// Load runtime bundle (DateTime, extend, SafeObject, proxy system, buildContext)
		await this.loadRuntimeBundle();

		// Wrap __prepareForTransfer to mark Date/NaN/Map/Set/Error so they survive vm.dump()
		this.injectTransferWrapper();

		// Inject E() error handler matching the new IsolatedVmBridge semantics
		this.injectErrorHandler();

		// Verify proxy system loaded correctly
		this.verifyProxySystem();

		this.initialized = true;

		this.logger.info('[QuickJsBridge] Initialized successfully');
	}

	/**
	 * Load the runtime IIFE bundle and verify required globals are present.
	 */
	private async loadRuntimeBundle(): Promise<void> {
		if (!this.vm) throw new Error('Context not initialized');

		const runtimeBundle = await readRuntimeBundle();

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
	 * via unwrapSentinels().
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
		if (v instanceof Date) {
			return { __isDate: true, __isoString: v.toISOString() };
		}
		if (typeof v === 'number' && isNaN(v)) {
			return { __isNaN: true };
		}
		if (typeof v !== 'object') return v;
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
		// Don't recurse into error sentinels
		if (v.__isError) return v;
		var result = {};
		var keys = Object.keys(v);
		for (var i = 0; i < keys.length; i++) {
			result[keys[i]] = wrapSpecialValues(v[keys[i]]);
		}
		return result;
	}
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
	 * Register per-execute callback handles and create adapter shims that
	 * make them look like ivm.Reference objects (with `.applySync`).
	 *
	 * `buildContext` (from the runtime bundle) accepts these references
	 * and uses `.applySync(thisArg, [args], opts)` to invoke them. Since
	 * QuickJS host functions are just plain functions, we wrap each in
	 * a JS object with a `.applySync` method that delegates to the
	 * underlying impl.
	 *
	 * Callbacks are scoped to a single execute() call: existing callback
	 * handles are disposed before new ones are registered, so concurrent
	 * evaluations get fresh closures.
	 */
	private registerCallbacks(data: Record<string, unknown>): void {
		if (!this.vm) throw new Error('Context not initialized');

		// Dispose previous callback handles
		for (const handle of this.callbackHandles) {
			handle.dispose();
		}
		this.callbackHandles = [];

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
		vm.setProp(vm.global, '__getValueAtPathImpl', getValueFn);
		this.callbackHandles.push(getValueFn);

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
		vm.setProp(vm.global, '__getArrayElementImpl', getArrayFn);
		this.callbackHandles.push(getArrayFn);

		const callFunctionFn = vm.newFunction('__callFunctionAtPathImpl', (...handles) => {
			const args = handles.map((h) => vm.dump(h));
			const pathArr = args[0] as string[];
			const fnArgs = args.slice(1);
			try {
				const result = callFunctionAtPath(data, pathArr, fnArgs);
				return this.hostValueToQuickJSHandle(result);
			} catch (err) {
				return this.hostValueToQuickJSHandle(serializeError(err));
			}
		});
		vm.setProp(vm.global, '__callFunctionAtPathImpl', callFunctionFn);
		this.callbackHandles.push(callFunctionFn);

		// Create adapter shims that wrap the host fns to look like ivm.Reference.
		// buildContext receives these and calls .applySync(thisArg, [args], opts).
		const shimCode = `
			globalThis.__getValueAtPathRef = {
				applySync: function(thisArg, args, opts) {
					return __getValueAtPathImpl(args[0]);
				}
			};
			globalThis.__getArrayElementRef = {
				applySync: function(thisArg, args, opts) {
					return __getArrayElementImpl(args[0], args[1]);
				}
			};
			globalThis.__callFunctionAtPathRef = {
				applySync: function(thisArg, args, opts) {
					return __callFunctionAtPathImpl.apply(null, args);
				}
			};
		`;
		const result = this.vm.evalCode(shimCode);
		if (result.error) {
			const errorStr = this.vm.dump(result.error);
			result.error.dispose();
			throw new Error(`Failed to register callbacks: ${String(errorStr)}`);
		}
		result.value.dispose();
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

		const json = hostValueToJson(value);
		if (json === 'undefined') return this.vm.undefined;

		const result = this.vm.evalCode(`(${json})`);
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
	 * 1. Register per-call host callbacks (closure-scoped to `data`)
	 * 2. Build a fresh evaluation context via buildContext($0, $1, $2, timezone)
	 * 3. Run wrapped code with `this` set to the context
	 * 4. Reconstruct error sentinels into real Errors
	 */
	execute(code: string, data: Record<string, unknown>, options?: ExecuteOptions): unknown {
		if (!this.initialized || !this.vm || !this.runtime) {
			throw new Error('Bridge not initialized. Call initialize() first.');
		}

		try {
			this.registerCallbacks(data);

			const timezone = options?.timezone ? JSON.stringify(options.timezone) : 'undefined';

			// Set up timeout via interrupt handler
			const deadline = Date.now() + this.config.timeout;
			this.runtime.setInterruptHandler(() => Date.now() > deadline);

			const wrappedCode = `
(function() {
  var __ctx;
  try {
    __ctx = buildContext(__getValueAtPathRef, __getArrayElementRef, __callFunctionAtPathRef, ${timezone});
  } catch (e) {
    if (e && e.message) throw e;
    throw e;
  }
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
})()`;

			const execResult = this.vm.evalCode(wrappedCode);

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
					throw new TimeoutError(`Expression timed out after ${this.config.timeout}ms`, {});
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
				throw new TimeoutError(`Expression timed out after ${this.config.timeout}ms`, {});
			}
			if (errorMessage.includes('out of memory') || errorMessage.includes('memory')) {
				throw new MemoryLimitError(
					`Expression exceeded memory limit of ${this.config.memoryLimit}MB`,
					{},
				);
			}
			throw new Error(`Expression evaluation failed: ${errorMessage}`);
		}
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

		for (const handle of this.callbackHandles) {
			handle.dispose();
		}
		this.callbackHandles = [];

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
