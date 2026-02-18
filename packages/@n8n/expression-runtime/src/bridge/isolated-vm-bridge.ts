import ivm from 'isolated-vm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import type { RuntimeBridge, BridgeConfig } from '../types';

// Create require function for resolving module paths (works in both CJS and ESM)
const require = createRequire(import.meta.url);

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
	 * 3. Load vendor libraries (Lodash, Luxon)
	 * 4. Define proxy system (stub for Step 2)
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

		// Load vendor libraries (Lodash, Luxon)
		await this.loadVendorLibraries();

		// Define proxy system in isolate (Step 2 - stub for now)
		await this.defineProxySystem();

		this.initialized = true;

		if (this.config.debug) {
			console.log('[IsolatedVmBridge] Initialized successfully');
		}
	}

	/**
	 * Load runtime bundle into the isolate.
	 *
	 * The runtime bundle includes:
	 * - Vendor libraries (Lodash, Luxon)
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
			const runtimeBundle = fs.readFileSync(runtimeBundlePath, 'utf-8');

			// Evaluate bundle in isolate context
			// This makes all exported globals available (_, luxon, SafeObject, createDeepLazyProxy, __data)
			await this.context.eval(runtimeBundle);

			if (this.config.debug) {
				console.log('[IsolatedVmBridge] Runtime bundle loaded from:', runtimeBundlePath);
			}

			// Verify vendor libraries loaded correctly
			const hasLodash = await this.context.eval('typeof _ !== "undefined"');
			const hasLuxon = await this.context.eval('typeof luxon !== "undefined"');

			if (!hasLodash || !hasLuxon) {
				throw new Error(`Library verification failed: lodash=${hasLodash}, luxon=${hasLuxon}`);
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
	private async defineProxySystem(): Promise<void> {
		if (!this.context) {
			throw new Error('Context not initialized');
		}

		try {
			// Verify proxy system components loaded correctly
			const hasProxyCreator = await this.context.eval('typeof createDeepLazyProxy !== "undefined"');
			const hasData = await this.context.eval('typeof __data !== "undefined"');
			const hasSafeObject = await this.context.eval('typeof SafeObject !== "undefined"');
			const hasSafeError = await this.context.eval('typeof SafeError !== "undefined"');

			if (!hasProxyCreator || !hasData || !hasSafeObject || !hasSafeError) {
				throw new Error(
					`Proxy system verification failed: ` +
						`createDeepLazyProxy=${hasProxyCreator}, __data=${hasData}, ` +
						`SafeObject=${hasSafeObject}, SafeError=${hasSafeError}`,
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
	 * Execute JavaScript code in the isolated context.
	 *
	 * This will be implemented in Step 4.
	 * Will handle:
	 * - Script compilation and caching
	 * - Callback registration (ivm.Reference)
	 * - Proxy initialization with workflow data
	 * - Timeout enforcement
	 * - Error translation
	 *
	 * @param code - JavaScript expression to evaluate
	 * @param data - Workflow data (e.g., { $json: {...} })
	 * @returns Result of the expression
	 */
	execute(code: string, data: Record<string, unknown>): unknown {
		if (!this.initialized || !this.context) {
			throw new Error('Bridge not initialized. Call initialize() first.');
		}

		// TODO: Step 4 - Implement execution
		// 1. Register callbacks as ivm.Reference
		// 2. Reset proxies with new data
		// 3. Compile/cache script
		// 4. Execute with timeout
		// 5. Return result

		throw new Error('execute() not implemented yet (Step 4)');
	}

	/**
	 * Get data synchronously from host (used by lazy proxies).
	 *
	 * This is not directly called from host code - it's invoked via ivm.Reference
	 * from within the isolate when proxies need to fetch data.
	 *
	 * Will be implemented alongside execute() in Step 4-5.
	 *
	 * @param path - Property path (e.g., "user.email")
	 * @returns Value at path or undefined
	 */
	getDataSync(_path: string): unknown {
		// TODO: Step 5 - Implement data fetching callback
		// This will be called from isolate via ivm.Reference
		return undefined;
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
