import type ivm from 'isolated-vm';
import type { RuntimeBridge, BridgeConfig, ExecuteOptions, WorkflowData } from '../types';
import { DEFAULT_BRIDGE_CONFIG, TimeoutError, MemoryLimitError } from '../types';
import {
	dispatchHostCall,
	getArrayElement,
	getValueAtPath,
	isErrorSentinel,
	readRuntimeBundle,
	reconstructError,
	serializeError,
} from './host-functions';

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

		this.logger.debug('[IsolatedVmBridge] Initialized successfully');
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

			this.logger.debug('[IsolatedVmBridge] Runtime bundle loaded');

			// Verify vendor libraries loaded correctly
			const hasDateTime = await this.context.eval('typeof DateTime !== "undefined"');
			const hasExtend = await this.context.eval('typeof extend !== "undefined"');

			if (!hasDateTime || !hasExtend) {
				throw new Error(
					`Library verification failed: DateTime=${hasDateTime}, extend=${hasExtend}`,
				);
			}

			this.logger.debug('[IsolatedVmBridge] Vendor libraries verified successfully');
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

			this.logger.debug('[IsolatedVmBridge] Proxy system verified successfully');
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

		this.logger.debug('[IsolatedVmBridge] Error handler injected successfully');
	}

	/**
	 * Create an ivm.Callback for getting value/metadata at a path.
	 *
	 * Thin wrapper around the shared getValueAtPath (see host-functions.ts
	 * for navigation and guard semantics); errors are caught and returned
	 * as sentinels instead of crossing the isolate boundary.
	 *
	 * @param data - Current workflow data to use for callback responses
	 * @private
	 */
	private createGetValueAtPathRef(data: WorkflowData): ivm.Callback {
		return new (getIvm().Callback)((pathArr: string[]) => {
			try {
				return getValueAtPath(data, pathArr);
			} catch (err) {
				return serializeError(err);
			}
		});
	}

	/**
	 * Create an ivm.Callback for getting array elements at an index.
	 *
	 * Thin wrapper around the shared getArrayElement (see host-functions.ts
	 * for navigation and guard semantics); errors are caught and returned
	 * as sentinels instead of crossing the isolate boundary.
	 *
	 * @param data - Current workflow data to use for callback responses
	 * @private
	 */
	private createGetArrayElementRef(data: WorkflowData): ivm.Callback {
		return new (getIvm().Callback)((pathArr: string[], index: number) => {
			try {
				return getArrayElement(data, pathArr, index);
			} catch (err) {
				return serializeError(err);
			}
		});
	}

	/**
	 * Create the ivm.Callback for the typed-RPC `callHost` channel.
	 *
	 * Thin wrapper around the shared dispatchHostCall (see host-functions.ts
	 * for envelope validation and per-message rationale); errors — including
	 * zod parse failures — are caught and returned as sentinels instead of
	 * crossing the isolate boundary.
	 *
	 * Return-value note: the dispatcher returns plain, structured-clone-able
	 * data. Results cross into the isolate through an ivm.Callback, which
	 * copies them via the structured-clone algorithm — JSON-shaped values,
	 * not isolated-vm objects (`Reference`/`ExternalCopy`) or other
	 * non-cloneable values.
	 *
	 * @param data - Current workflow data
	 * @private
	 */
	private createCallHostRef(data: WorkflowData): ivm.Callback {
		return new (getIvm().Callback)((rawMsg: unknown) => {
			try {
				return dispatchHostCall(rawMsg, data);
			} catch (err) {
				return serializeError(err);
			}
		});
	}

	/**
	 * Execute JavaScript code in the isolated context.
	 *
	 * Flow:
	 * 1. Create three ivm.Callback instances scoped to the current data:
	 *    `getValueAtPath`, `getArrayElement`, `callHost`.
	 * 2. Use evalClosureSync to run the code in a closure where `$0`/`$1`/`$2`
	 *    are the callback references — no global mutable state.
	 * 3. buildContext() inside the isolate creates a fresh evaluation context
	 *    from the closure-scoped references.
	 *
	 * Each call gets its own closure, so nested and concurrent evaluations
	 * cannot interfere with each other.
	 *
	 * @param code - JavaScript expression to evaluate
	 * @param data - Workflow data (e.g., { $json: {...}, $runIndex: 0 })
	 * @returns Result of the expression
	 * @throws {Error} If bridge not initialized or execution fails
	 */
	execute(code: string, data: WorkflowData, options?: ExecuteOptions): unknown {
		if (!this.initialized || !this.context) {
			throw new Error('Bridge not initialized. Call initialize() first.');
		}

		// Host callbacks are ivm.Callback instances: inside the isolate they
		// arrive as plain functions with structured-clone marshaling, so the
		// runtime invokes them directly. Callbacks are GC-managed; there is no
		// release() to call in `finally`.
		const getValueAtPath = this.createGetValueAtPathRef(data);
		const getArrayElement = this.createGetArrayElementRef(data);
		const callHost = this.createCallHostRef(data);

		try {
			const timezone = options?.timezone ? JSON.stringify(options.timezone) : 'undefined';

			// Wrap transformed code so 'this' === the closure-scoped context.
			// Tournament generates: this.$json.email, this.$items(), etc.
			// buildContext() creates a fresh context with lazy proxies from the
			// closure-scoped callback references — no globals touched. The bundle
			// is passed as a single object so adding typed RPCs doesn't churn the
			// evalClosureSync signature; new operations land as new schemas in
			// bridge-messages.ts and new cases in the callHost dispatcher.
			// The outer try-catch serializes errors into a sentinel object and returns
			// it as the result. Errors from host callbacks arrive as sentinels already
			// (via serializeError), so we pass them through. This avoids a round-trip
			// callback and keeps Error reconstruction on the host side only.
			const wrappedCode = `
var __ctx = buildContext({
  getValueAtPath: $0,
  getArrayElement: $1,
  callHost: $2,
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
}`;

			const result = this.context.evalClosureSync(
				wrappedCode,
				[getValueAtPath, getArrayElement, callHost],
				{ result: { copy: true }, timeout: this.config.timeout },
			);

			if (isErrorSentinel(result)) {
				throw reconstructError(result);
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

		this.disposed = true;
		this.initialized = false;

		this.logger.debug('[IsolatedVmBridge] Disposed');
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
