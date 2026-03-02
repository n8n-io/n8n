import ivm from 'isolated-vm';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RuntimeBridge, BridgeConfig } from '../types';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

	constructor(config: BridgeConfig = {}) {
		this.config = {
			memoryLimit: config.memoryLimit ?? 128,
			timeout: config.timeout ?? 5000,
			debug: config.debug ?? false,
		};

		// Create isolate with memory limit
		// Note: memoryLimit is in MB
		this.isolate = new ivm.Isolate({ memoryLimit: this.config.memoryLimit });
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
			// Path: dist/bundle/runtime.iife.js
			const runtimeBundlePath = path.join(__dirname, '../../dist/bundle/runtime.iife.js');
			const runtimeBundle = await readFile(runtimeBundlePath, 'utf-8');

			// Evaluate bundle in isolate context
			// This makes all exported globals available (DateTime, extend, extendOptional, SafeObject, SafeError, createDeepLazyProxy, resetDataProxies, __data)
			await this.context.eval(runtimeBundle);

			if (this.config.debug) {
				console.log('[IsolatedVmBridge] Runtime bundle loaded from:', runtimeBundlePath);
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
	private resetDataProxies(): void {
		if (!this.context) {
			throw new Error('Context not initialized');
		}

		try {
			// Call the resetDataProxies function in the isolate
			// This function is loaded as part of the runtime bundle
			this.context.evalSync('resetDataProxies()');

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
		const getValueAtPath = new ivm.Reference((path: string[]) => {
			// Navigate to value
			let value: unknown = data;
			for (const key of path) {
				value = (value as Record<string, unknown>)?.[key];
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
		});

		// Callback 2: Get array element at index
		// Used by array proxy when accessing numeric indices
		const getArrayElement = new ivm.Reference((path: string[], index: number) => {
			// Navigate to array
			let arr: unknown = data;
			for (const key of path) {
				arr = (arr as Record<string, unknown>)?.[key];
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
		});

		// Callback 3: Call function at path with arguments
		// Used when expressions invoke functions from workflow data
		const callFunctionAtPath = new ivm.Reference((path: string[], ...args: unknown[]) => {
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
	execute(code: string, data: Record<string, unknown>): unknown {
		if (!this.initialized || !this.context) {
			throw new Error('Bridge not initialized. Call initialize() first.');
		}

		try {
			// Step 1: Register callbacks with current data context
			this.registerCallbacks(data);

			// Step 2: Reset proxies for this evaluation
			// This initializes $json, $binary, etc. as lazy proxies
			this.resetDataProxies();

			// Step 3: Wrap transformed code so 'this' === __data in the isolate.
			// Tournament generates: this.$json.email, this.$items(), etc.
			// __data has $json, $items, etc. as lazy proxies (set in resetDataProxies).
			const wrappedCode = `(function() {\n${code}\n}).call(__data)`;

			let script = this.scriptCache.get(code);
			if (!script) {
				script = this.isolate.compileScriptSync(wrappedCode);
				this.scriptCache.set(code, script);

				if (this.config.debug) {
					console.log('[IsolatedVmBridge] Script compiled and cached');
				}
			}

			// Step 4: Execute with timeout and copy result back
			const result = script.runSync(this.context, {
				timeout: this.config.timeout,
				copy: true,
			});

			if (this.config.debug) {
				console.log('[IsolatedVmBridge] Expression executed successfully');
			}

			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Expression evaluation failed: ${errorMessage}`);
		}
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
