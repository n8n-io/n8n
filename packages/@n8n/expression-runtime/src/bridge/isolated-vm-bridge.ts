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

	// Script compilation cache for performance
	// Maps expression code -> compiled ivm.Script
	private scriptCache = new Map<string, ivm.Script>();

	// Active ivm.Reference callbacks — released before each re-registration
	// to prevent reference accumulation across execute() calls
	private valueAtPathRef?: ivm.Reference;
	private arrayElementRef?: ivm.Reference;
	private callFunctionRef?: ivm.Reference;

	// Pre-resolved reference to resetDataProxies() inside the isolate.
	// Using applySync on a stored reference avoids the per-call
	// ScriptCompiler::Compile() cost that evalSync incurs.
	private resetDataProxiesRef?: ivm.Reference;

	constructor(config: BridgeConfig = {}) {
		this.config = {
			...DEFAULT_BRIDGE_CONFIG,
			...config,
		};

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

		// Store a reference to resetDataProxies for efficient per-call invocation
		this.resetDataProxiesRef = await this.context.global.get('resetDataProxies', {
			reference: true,
		});

		this.initialized = true;

		if (this.config.debug) {
			console.log('[IsolatedVmBridge] Initialized successfully');
		}
	}

	/**
	 * Load runtime bundle into the isolate.
	 *
	 * The runtime bundle includes:
	 * - DateTime, extend, extendOptional (expression engine globals)
	 * - SafeObject and SafeError wrappers
	 * - createDeepLazyProxy function
	 * - __data object initialization
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
			// This makes all exported globals available (DateTime, extend, extendOptional, SafeObject, SafeError, createDeepLazyProxy, resetDataProxies, __data)
			await this.context.eval(runtimeBundle);

			if (this.config.debug) {
				console.log('[IsolatedVmBridge] Runtime bundle loaded');
			}

			// Verify vendor libraries loaded correctly
			const hasDateTime = await this.context.eval('typeof DateTime !== "undefined"');
			const hasExtend = await this.context.eval('typeof extend !== "undefined"');

			if (!hasDateTime || !hasExtend) {
				throw new Error(
					`Library verification failed: DateTime=${hasDateTime}, extend=${hasExtend}`,
				);
			}

			if (this.config.debug) {
				console.log('[IsolatedVmBridge] Vendor libraries verified successfully');
			}
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
			const hasData = await this.context.eval('typeof __data !== "undefined"');
			const hasSafeObject = await this.context.eval('typeof SafeObject !== "undefined"');
			const hasSafeError = await this.context.eval('typeof SafeError !== "undefined"');
			const hasResetFunction = await this.context.eval('typeof resetDataProxies !== "undefined"');

			if (!hasProxyCreator || !hasData || !hasSafeObject || !hasSafeError || !hasResetFunction) {
				throw new Error(
					`Proxy system verification failed: ` +
						`createDeepLazyProxy=${hasProxyCreator}, __data=${hasData}, ` +
						`SafeObject=${hasSafeObject}, SafeError=${hasSafeError}, ` +
						`resetDataProxies=${hasResetFunction}`,
				);
			}

			if (this.config.debug) {
				console.log('[IsolatedVmBridge] Proxy system verified successfully');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to verify proxy system: ${errorMessage}`);
		}
	}

	/**
	 * Inject the E() error handler into the isolate context.
	 *
	 * Tournament wraps expressions with try-catch that calls E(error, this).
	 * This handler:
	 * - Re-throws security violations from __sanitize
	 * - Swallows TypeErrors (failed attack attempts return undefined)
	 * - Re-throws all other errors
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
					// Re-throw security violations from __sanitize
					if (error && error.message && error.message.includes('due to security concerns')) {
						throw error;
					}
					// Swallow TypeErrors (failed attack attempts return undefined)
					if (error instanceof TypeError) {
						return undefined;
					}
					throw error;
				};
			}
		`);

		if (this.config.debug) {
			console.log('[IsolatedVmBridge] Error handler injected successfully');
		}
	}

	/**
	 * Reset data proxies in the isolate context.
	 *
	 * This method should be called before each execute() to:
	 * 1. Clear proxy caches from previous evaluations
	 * 2. Initialize fresh workflow data references
	 * 3. Expose workflow properties to globalThis
	 *
	 * The reset function runs in the isolate and calls back to the host
	 * via ivm.Reference callbacks to fetch workflow data.
	 *
	 * @private
	 * @throws {Error} If context not initialized or reset fails
	 */
	private resetDataProxies(timezone?: string): void {
		if (!this.resetDataProxiesRef) {
			throw new Error('Context not initialized');
		}

		try {
			this.resetDataProxiesRef.applySync(null, [timezone ?? null], {
				arguments: { copy: true },
			});

			if (this.config.debug) {
				console.log('[IsolatedVmBridge] Data proxies reset successfully');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to reset data proxies: ${errorMessage}`);
		}
	}

	/**
	 * Register callback functions for cross-isolate communication.
	 *
	 * Creates three ivm.Reference callbacks that the runtime bundle uses
	 * to fetch data from the host process:
	 *
	 * - __getValueAtPath: Returns metadata or primitive for a property path
	 * - __getArrayElement: Returns individual array elements
	 * - __callFunctionAtPath: Executes functions in host context
	 *
	 * These callbacks are called synchronously from isolate proxy traps.
	 *
	 * @param data - Current workflow data to use for callback responses
	 * @private
	 */
	private registerCallbacks(data: Record<string, unknown>): void {
		if (!this.context) {
			throw new Error('Context not initialized');
		}

		// Callback 1: Get value/metadata at path
		// Used by createDeepLazyProxy when accessing properties
		const getValueAtPath = new (getIvm().Reference)((path: string[]) => {
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

		// Callback 2: Get array element at index
		// Used by array proxy when accessing numeric indices
		const getArrayElement = new (getIvm().Reference)((path: string[], index: number) => {
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

		// Callback 3: Call function at path with arguments
		// Used when expressions invoke functions from workflow data
		const callFunctionAtPath = new (getIvm().Reference)((path: string[], ...args: unknown[]) => {
			try {
				// Navigate to function, tracking parent to preserve `this` context
				let fn: unknown = data;
				let parent: unknown = undefined;
				for (const key of path) {
					parent = fn;
					fn = (fn as Record<string, unknown>)?.[key];
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

		// Release previous references before replacing to avoid accumulation
		this.valueAtPathRef?.release();
		this.arrayElementRef?.release();
		this.callFunctionRef?.release();

		// Store references so they can be released on the next call or on dispose()
		this.valueAtPathRef = getValueAtPath;
		this.arrayElementRef = getArrayElement;
		this.callFunctionRef = callFunctionAtPath;

		// Register all callbacks in isolate global context
		this.context.global.setSync('__getValueAtPath', getValueAtPath);
		this.context.global.setSync('__getArrayElement', getArrayElement);
		this.context.global.setSync('__callFunctionAtPath', callFunctionAtPath);

		if (this.config.debug) {
			console.log('[IsolatedVmBridge] Callbacks registered successfully');
		}
	}

	/**
	 * Execute JavaScript code in the isolated context.
	 *
	 * Flow:
	 * 1. Register callbacks as ivm.Reference for cross-isolate communication
	 * 2. Call resetDataProxies() to initialize workflow data proxies
	 * 3. Compile script (with caching for performance)
	 * 4. Execute with timeout enforcement
	 * 5. Return result (copied from isolate)
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

		try {
			// Step 1: Register callbacks with current data context
			this.registerCallbacks(data);

			// Step 2: Reset proxies for this evaluation
			// This initializes $json, $binary, etc. as lazy proxies
			this.resetDataProxies(options?.timezone);

			// Step 3: Wrap transformed code so 'this' === __data in the isolate.
			// Tournament generates: this.$json.email, this.$items(), etc.
			// __data has $json, $items, etc. as lazy proxies (set in resetDataProxies).
			// The outer try-catch serializes errors into a sentinel object and returns
			// it as the result. Errors from host callbacks arrive as sentinels already
			// (via serializeError), so we pass them through. This avoids a round-trip
			// callback and keeps Error reconstruction on the host side only.
			const wrappedCode = `
(function() {
  try {
    var __result = (function() {
      ${code}
    }).call(__data);
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

			// Cache key is `code` (tournament output), but the compiled script uses
			// `wrappedCode` which adds the try-catch/reportError wrapper. This works
			// because wrappedCode is a deterministic transform of code. If the wrapper
			// ever becomes parameterized (e.g., different wrapping based on options),
			// the cache key must include those parameters to avoid serving stale scripts.
			let script = this.scriptCache.get(code);
			if (!script) {
				script = this.isolate.compileScriptSync(wrappedCode);
				this.scriptCache.set(code, script);

				if (this.config.debug) {
					console.log('[IsolatedVmBridge] Script compiled and cached');
				}
			}

			// Step 5: Execute with timeout and copy result back
			const result = script.runSync(this.context, {
				timeout: this.config.timeout,
				copy: true,
			});

			// Step 6: If the result is an error sentinel, reconstruct and throw
			if (isErrorSentinel(result)) {
				throw this.reconstructError(result);
			}

			if (this.config.debug) {
				console.log('[IsolatedVmBridge] Expression executed successfully');
			}

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

		// Release callback references
		this.valueAtPathRef?.release();
		this.arrayElementRef?.release();
		this.callFunctionRef?.release();

		this.disposed = true;
		this.initialized = false;
		this.scriptCache.clear();

		if (this.config.debug) {
			console.log('[IsolatedVmBridge] Disposed');
		}
	}

	/**
	 * Check if the bridge has been disposed.
	 *
	 * @returns true if disposed, false otherwise
	 */
	isDisposed(): boolean {
		return this.disposed;
	}
}
