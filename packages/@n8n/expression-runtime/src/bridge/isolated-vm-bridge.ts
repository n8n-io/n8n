import type ivm from 'isolated-vm';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { RuntimeBridge, BridgeConfig, ExecuteOptions } from '../types';
import { DEFAULT_BRIDGE_CONFIG, TimeoutError, MemoryLimitError } from '../types';
import type { ErrorSentinel } from '../runtime/lazy-proxy';

// Lazy-loaded isolated-vm — avoids loading the native binary when the barrel
// file is statically imported (e.g. for error classes). The native module is
// only loaded when IsolatedVmBridge is actually constructed.
type IsolatedVm = typeof import('isolated-vm');
let _ivm: IsolatedVm | null = null;

function getIvm(): IsolatedVm {
	if (!_ivm) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		_ivm = require('isolated-vm') as IsolatedVm;
	}
	return _ivm;
}

const BUNDLE_RELATIVE_PATH = path.join('dist', 'bundle', 'runtime.iife.js');

/** Check if a value is an error sentinel returned by serializeError. */
function isErrorSentinel(value: unknown): value is ErrorSentinel {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isError === true
	);
}

/**
 * Serialize an error into a transferable metadata object.
 *
 * Host-side callbacks (getValueAtPath, etc.) catch errors and return this
 * sentinel instead of letting the error cross the isolate boundary (which
 * strips custom class identity and properties). The isolate-side proxy
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
 *
 * This works regardless of where the compiled output lives:
 *   - `src/bridge/`               (vitest running against source)
 *   - `dist/cjs/bridge/`          (CJS build)
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
 * IsolatedVmBridge - Runtime bridge using isolated-vm for secure expression evaluation.
 *
 * This bridge creates a V8 isolate with:
 * - Hard memory limit (128MB default)
 * - No access to Node.js APIs
 * - Timeout enforcement
 * - Complete isolation from host process
 *
 * Context reuse pattern: Create isolate/context once, reset state between evaluations.
 */
export class IsolatedVmBridge implements RuntimeBridge {
	private isolate: ivm.Isolate;
	private context?: ivm.Context;
	private initialized = false;
	private disposed = false;
	private config: Required<BridgeConfig>;
	private logger: Required<BridgeConfig>['logger'];

	constructor(config: BridgeConfig = {}) {
		this.config = {
			...DEFAULT_BRIDGE_CONFIG,
			...config,
		};
		this.logger = this.config.logger;

		// Create isolate with memory limit
		// Note: memoryLimit is in MB
		this.isolate = new (getIvm().Isolate)({ memoryLimit: this.config.memoryLimit });
	}

	/**
	 * Initialize the isolate and create execution context.
	 *
	 * Steps:
	 * 1. Create context
	 * 2. Set up basic globals (global reference)
	 * 3. Load runtime bundle (DateTime, extend, proxy system)
	 * 4. Verify proxy system
	 *
	 * Must be called before execute().
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		// Create context in the isolate
		this.context = await this.isolate.createContext();

		// Set up basic globals
		// jail is a reference to the context's global object
		const jail = this.context.global;

		// Set 'global' to reference itself (pattern from POC)
		// This allows code in isolate to access 'global.something'
		await jail.set('global', jail.derefInto());

		// Load runtime bundle (DateTime, extend, SafeObject, proxy system)
		await this.loadVendorLibraries();

		// Verify proxy system loaded correctly
		await this.verifyProxySystem();

		// Inject E() error handler needed by tournament-generated try-catch code
		await this.injectErrorHandler();

		this.initialized = true;

		this.logger.info('[IsolatedVmBridge] Initialized successfully');
	}

	/**
	 * Load runtime bundle into the isolate.
	 *
	 * The runtime bundle includes:
	 * - DateTime, extend, extendOptional (expression engine globals)
	 * - SafeObject and SafeError wrappers
	 * - createDeepLazyProxy function
	 * - buildContext function
	 *
	 * @private
	 * @throws {Error} If context not initialized or bundle loading fails
	 */
	private async loadVendorLibraries(): Promise<void> {
		if (!this.context) {
			throw new Error('Context not initialized');
		}

		try {
			// Load runtime bundle (includes vendor libraries + proxy system)
			const runtimeBundle = await readRuntimeBundle();

			// Evaluate bundle in isolate context
			// This makes all exported globals available (DateTime, extend, extendOptional, SafeObject, SafeError, createDeepLazyProxy, buildContext)
			await this.context.eval(runtimeBundle);

			this.logger.info('[IsolatedVmBridge] Runtime bundle loaded');

			// Verify vendor libraries loaded correctly
			const hasDateTime = await this.context.eval('typeof DateTime !== "undefined"');
			const hasExtend = await this.context.eval('typeof extend !== "undefined"');

			if (!hasDateTime || !hasExtend) {
				throw new Error(
					`Library verification failed: DateTime=${hasDateTime}, extend=${hasExtend}`,
				);
			}

			this.logger.info('[IsolatedVmBridge] Vendor libraries verified successfully');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to load runtime bundle: ${errorMessage}`);
		}
	}

	/**
	 * Verify the proxy system loaded correctly.
	 *
	 * The proxy system is loaded as part of the runtime bundle in loadVendorLibraries().
	 * This method verifies all required components are available.
	 *
	 * @private
	 * @throws {Error} If context not initialized or proxy system verification fails
	 */
	private async verifyProxySystem(): Promise<void> {
		if (!this.context) {
			throw new Error('Context not initialized');
		}

		try {
			// Verify proxy system components loaded correctly
			const hasProxyCreator = await this.context.eval('typeof createDeepLazyProxy !== "undefined"');
			const hasSafeObject = await this.context.eval('typeof SafeObject !== "undefined"');
			const hasSafeError = await this.context.eval('typeof SafeError !== "undefined"');
			const hasBuildContext = await this.context.eval('typeof buildContext !== "undefined"');

			if (!hasProxyCreator || !hasSafeObject || !hasSafeError || !hasBuildContext) {
				throw new Error(
					`Proxy system verification failed: ` +
						`createDeepLazyProxy=${hasProxyCreator}, ` +
						`SafeObject=${hasSafeObject}, SafeError=${hasSafeError}, ` +
						`buildContext=${hasBuildContext}`,
				);
			}

			this.logger.info('[IsolatedVmBridge] Proxy system verified successfully');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to verify proxy system: ${errorMessage}`);
		}
	}

	/**
	 * Inject the E() error handler into the isolate context.
	 *
	 * There are two exception-handling layers inside the isolate:
	 *
	 * 1. **Inner layer (this handler, `E()`)** — Tournament wraps each
	 *    expression with try-catch that calls `E(error, this)`. This handler
	 *    must match the legacy engine's behavior (set in expression.ts via
	 *    setErrorHandler):
	 *    - Re-throw ExpressionError / ExpressionExtensionError
	 *    - Swallow everything else (TypeErrors, generic Errors, etc.)
	 *
	 * 2. **Outer layer (`wrappedCode` try-catch in `execute()`)** — Catches
	 *    anything that escaped `E()` (e.g. re-thrown ExpressionErrors) and
	 *    serializes it into a sentinel object so the host can reconstruct it.
	 *
	 * Inside the isolate, errors from host callbacks arrive as sentinel
	 * objects ({ __isError, name, message, ... }) rather than class instances,
	 * so we match by name instead of instanceof.
	 *
	 * @private
	 * @throws {Error} If context not initialized
	 */
	private async injectErrorHandler(): Promise<void> {
		if (!this.context) {
			throw new Error('Context not initialized');
		}

		await this.context.eval(`
			if (typeof E === 'undefined') {
				globalThis.E = function(error, _context) {
					// Re-throw ExpressionError / ExpressionExtensionError to match
					// the legacy handler in expression.ts. Errors from host callbacks
					// arrive as sentinels (not class instances), so check by name.
					const name = error?.name;
					if (name === 'ExpressionError' || name === 'ExpressionExtensionError') {
						throw error;
					}
					// Swallow everything else (TypeErrors, generic Errors, etc.)
					return undefined;
				};
			}
		`);

		this.logger.info('[IsolatedVmBridge] Error handler injected successfully');
	}

	/**
	 * Create an ivm.Reference callback for getting value/metadata at a path.
	 *
	 * Used by createDeepLazyProxy when accessing properties. Returns metadata
	 * markers for functions, arrays, and objects, or the primitive value directly.
	 *
	 * @param data - Current workflow data to use for callback responses
	 * @private
	 */
	private createGetValueAtPathRef(data: Record<string, unknown>): ivm.Reference {
		return new (getIvm().Reference)((path: string[]) => {
			try {
				// Navigate to value
				// Special-case: paths starting with ['$item', index] call data.$item(index)
				// to get the sub-proxy for that item, then continue navigating the rest.
				let value: unknown = data;
				let startIndex = 0;
				const itemFn = (data as Record<string, unknown>).$item;
				if (path.length >= 2 && path[0] === '$item' && typeof itemFn === 'function') {
					const itemIndex = parseInt(path[1], 10);
					if (!isNaN(itemIndex)) {
						value = (itemFn as (i: number) => unknown)(itemIndex);
						startIndex = 2;
					}
				} else {
					const dollarFn = (data as Record<string, unknown>).$;
					if (path.length >= 2 && path[0] === '$' && typeof dollarFn === 'function') {
						value = (dollarFn as (name: string) => unknown)(path[1]);
						startIndex = 2;
					}
				}
				for (let i = startIndex; i < path.length; i++) {
					value = (value as Record<string, unknown>)?.[path[i]];
					if (value === undefined || value === null) {
						return value;
					}
				}

				// Handle functions - return metadata marker
				if (typeof value === 'function') {
					const fnString = value.toString();
					// Block native functions for security
					if (fnString.includes('[native code]')) {
						return undefined;
					}
					return { __isFunction: true, __name: path[path.length - 1] };
				}

				// Handle arrays - always lazy, only transfer length
				if (Array.isArray(value)) {
					return {
						__isArray: true,
						__length: value.length,
						__data: null,
					};
				}

				// Handle objects - return metadata with keys
				if (value !== null && typeof value === 'object') {
					return {
						__isObject: true,
						__keys: Object.keys(value),
					};
				}

				// Primitive value
				return value;
			} catch (err) {
				return serializeError(err);
			}
		});
	}

	/**
	 * Create an ivm.Reference callback for getting array elements at an index.
	 *
	 * Used by array proxy when accessing numeric indices.
	 *
	 * @param data - Current workflow data to use for callback responses
	 * @private
	 */
	private createGetArrayElementRef(data: Record<string, unknown>): ivm.Reference {
		return new (getIvm().Reference)((path: string[], index: number) => {
			try {
				// Navigate to array
				// Special-case: paths starting with ['$item', index] call data.$item(index)
				let arr: unknown = data;
				let startIndex = 0;
				const itemFn = (data as Record<string, unknown>).$item;
				if (path.length >= 2 && path[0] === '$item' && typeof itemFn === 'function') {
					const itemIndex = parseInt(path[1], 10);
					if (!isNaN(itemIndex)) {
						arr = (itemFn as (i: number) => unknown)(itemIndex);
						startIndex = 2;
					}
				} else {
					const dollarFn = (data as Record<string, unknown>).$;
					if (path.length >= 2 && path[0] === '$' && typeof dollarFn === 'function') {
						arr = (dollarFn as (name: string) => unknown)(path[1]);
						startIndex = 2;
					}
				}
				for (let i = startIndex; i < path.length; i++) {
					arr = (arr as Record<string, unknown>)?.[path[i]];
					if (arr === undefined || arr === null) {
						return undefined;
					}
				}

				if (!Array.isArray(arr)) {
					return undefined;
				}

				const element = arr[index];

				// If element is object/array, return metadata
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

				// Primitive element
				return element;
			} catch (err) {
				return serializeError(err);
			}
		});
	}

	/**
	 * Create an ivm.Reference callback for calling functions at a path.
	 *
	 * Used when expressions invoke functions from workflow data.
	 *
	 * @param data - Current workflow data to use for callback responses
	 * @private
	 */
	private createCallFunctionAtPathRef(data: Record<string, unknown>): ivm.Reference {
		return new (getIvm().Reference)((path: string[], ...args: unknown[]) => {
			try {
				// Navigate to function, tracking parent to preserve `this` context
				let fn: unknown = data;
				let parent: unknown = undefined;
				let startIndex = 0;
				const dollarFn = (data as Record<string, unknown>).$;
				if (path.length >= 2 && path[0] === '$' && typeof dollarFn === 'function') {
					fn = (dollarFn as (name: string) => unknown)(path[1]);
					startIndex = 2;
				}
				for (let i = startIndex; i < path.length; i++) {
					parent = fn;
					fn = (fn as Record<string, unknown>)?.[path[i]];
				}

				if (typeof fn !== 'function') {
					throw new Error(`${path.join('.')} is not a function`);
				}

				// Block native functions for security (same check as getValueAtPath)
				if (fn.toString().includes('[native code]')) {
					throw new Error(`${path.join('.')} is a native function and cannot be called`);
				}

				// Execute function with parent as `this` to preserve method context
				return (fn as (...fnArgs: unknown[]) => unknown).call(parent, ...args);
			} catch (err) {
				return serializeError(err);
			}
		});
	}

	/**
	 * Execute JavaScript code in the isolated context.
	 *
	 * Flow:
	 * 1. Create three ivm.Reference callbacks scoped to the current data
	 * 2. Use evalClosureSync to run the code in a closure where $0/$1/$2
	 *    are the callback references — no global mutable state
	 * 3. buildContext() inside the isolate creates a fresh evaluation context
	 *    from the closure-scoped references
	 *
	 * Each call gets its own closure, so nested and concurrent evaluations
	 * cannot interfere with each other.
	 *
	 * @param code - JavaScript expression to evaluate
	 * @param data - Workflow data (e.g., { $json: {...}, $runIndex: 0 })
	 * @returns Result of the expression
	 * @throws {Error} If bridge not initialized or execution fails
	 */
	execute(code: string, data: Record<string, unknown>, options?: ExecuteOptions): unknown {
		if (!this.initialized || !this.context) {
			throw new Error('Bridge not initialized. Call initialize() first.');
		}

		const getValueAtPath = this.createGetValueAtPathRef(data);
		const getArrayElement = this.createGetArrayElementRef(data);
		const callFunctionAtPath = this.createCallFunctionAtPathRef(data);

		try {
			const timezone = options?.timezone ? JSON.stringify(options.timezone) : 'undefined';

			// Wrap transformed code so 'this' === the closure-scoped context.
			// Tournament generates: this.$json.email, this.$items(), etc.
			// buildContext() creates a fresh context with lazy proxies from the
			// closure-scoped callback references ($0, $1, $2) — no globals touched.
			// The outer try-catch serializes errors into a sentinel object and returns
			// it as the result. Errors from host callbacks arrive as sentinels already
			// (via serializeError), so we pass them through. This avoids a round-trip
			// callback and keeps Error reconstruction on the host side only.
			const wrappedCode = `
var __ctx = buildContext($0, $1, $2, ${timezone});
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
}`;

			const result = this.context.evalClosureSync(
				wrappedCode,
				[getValueAtPath, getArrayElement, callFunctionAtPath],
				{ result: { copy: true }, timeout: this.config.timeout },
			);

			if (isErrorSentinel(result)) {
				throw this.reconstructError(result);
			}

			this.logger.debug('[IsolatedVmBridge] Expression executed successfully');

			return result;
		} catch (error) {
			// Re-throw reconstructed errors as-is.
			// Note: TypeError is intentionally NOT included here — the isolate's
			// E() handler swallows TypeErrors (failed attack attempts return undefined),
			// so TypeErrors from host callbacks should also go through the generic
			// wrapping for consistent behavior.
			if (
				error instanceof Error &&
				(error.name === 'ExpressionError' || error.name === 'ExpressionExtensionError')
			) {
				throw error;
			}
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (errorMessage.includes('Script execution timed out')) {
				throw new TimeoutError(`Expression timed out after ${this.config.timeout}ms`, {});
			}
			if (errorMessage.includes('memory limit')) {
				throw new MemoryLimitError(
					`Expression exceeded memory limit of ${this.config.memoryLimit}MB`,
					{},
				);
			}
			throw new Error(`Expression evaluation failed: ${errorMessage}`);
		} finally {
			getValueAtPath.release();
			getArrayElement.release();
			callFunctionAtPath.release();
		}
	}

	/**
	 * Reconstruct an error from serialized isolate data.
	 *
	 * Maps error names back to their host-side classes and restores
	 * custom properties that would otherwise be lost crossing the boundary.
	 */
	private reconstructError(data: ErrorSentinel): Error {
		const error = new Error(data.message);
		error.name = data.name || 'Error';
		if (data.stack) {
			error.stack = data.stack;
		}

		// Restore custom properties transferred via copy: true
		if (data.extra) {
			Object.assign(error, data.extra);
		}

		return error;
	}

	/**
	 * Dispose of the isolate and free resources.
	 *
	 * After disposal, the bridge cannot be used again.
	 */
	async dispose(): Promise<void> {
		if (this.disposed) {
			return;
		}

		// Dispose isolate (this also disposes all contexts, references, etc.)
		if (!this.isolate.isDisposed) {
			this.isolate.dispose();
		}

		this.disposed = true;
		this.initialized = false;

		this.logger.info('[IsolatedVmBridge] Disposed');
	}

	/**
	 * Check if the bridge has been disposed.
	 *
	 * @returns true if disposed, false otherwise
	 */
	isDisposed(): boolean {
		return this.disposed || this.isolate.isDisposed;
	}
}
