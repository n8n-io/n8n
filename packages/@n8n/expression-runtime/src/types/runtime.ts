// ============================================================================
// Phase 1.1: Runtime Interfaces (IMPLEMENT WITH BRIDGE)
//
// These interfaces define how the runtime (inside isolation) communicates
// with the host. Implement these when building the runtime code.
// ============================================================================

/**
 * Runtime interface exposed to isolated context.
 *
 * This interface defines what the runtime code (running inside the isolated context)
 * can call. The bridge implements these functions on the host side.
 */
export interface RuntimeHostInterface {
	/**
	 * Get data from host by path (synchronous).
	 * Used by lazy loading proxies to fetch data on-demand.
	 *
	 * IMPORTANT: This is SYNCHRONOUS because JavaScript Proxy traps cannot be async.
	 * - IsolatedVmBridge: Uses ivm.Reference for true sync callbacks
	 * - NodeVmBridge: Direct synchronous call
	 * - WebWorkerBridge: Not supported - must pre-fetch all data
	 *
	 * @param path - Property path to fetch (e.g., "user.email", "items[0].json")
	 * @returns Value at the path, or undefined if not found
	 */
	getDataSync(path: string): unknown;
}

/**
 * Lazy-loading proxy for workflow data.
 *
 * At runtime, these appear as plain objects but are actually Proxy objects
 * that fetch data on-demand from the host using getDataSync().
 */
type LazyDataProxy = Record<string, unknown>;

/**
 * Runtime globals available in isolated context.
 *
 * These are injected by the bridge when initializing the context.
 */
export interface RuntimeGlobals {
	/**
	 * Host interface for calling back to host process.
	 */
	__host: RuntimeHostInterface;

	/**
	 * Workflow data proxy ($json, $item, etc.).
	 * Set by bridge before each execute() call.
	 */

	/** Current item data (lazy-loaded proxy) */
	$json: LazyDataProxy;

	/** Alias for $json (lazy-loaded proxy) */
	$: LazyDataProxy;

	/** Get item by index (lazy-loaded) */
	$item: (index: number, runIndex?: number) => LazyDataProxy;

	/** Access to all items */
	$input: {
		all: () => Array<{ json: LazyDataProxy }>;
		first: () => { json: LazyDataProxy } | undefined;
		last: () => { json: LazyDataProxy } | undefined;
		item: { json: LazyDataProxy };
	};

	/**
	 * Standard libraries available in runtime.
	 */
	_: typeof import('lodash'); // lodash
	DateTime: typeof import('luxon').DateTime; // Luxon
}

/**
 * Configuration for runtime initialization.
 */
export interface RuntimeConfig {
	/**
	 * Enable debug logging in runtime.
	 * Default: false
	 */
	debug?: boolean;

	/**
	 * Custom timeout for data fetches.
	 * Default: 1000ms
	 */
	dataFetchTimeout?: number;
}

/**
 * Runtime error thrown inside isolated context.
 *
 * These errors are thrown by the runtime code when something goes wrong during
 * expression evaluation. The bridge must catch these and translate them to the
 * appropriate ExpressionError subclass (see evaluator.ts).
 *
 * Translation mapping:
 * - code: 'MEMORY_LIMIT' → MemoryLimitError
 * - code: 'TIMEOUT' → TimeoutError
 * - code: 'SECURITY_VIOLATION' → SecurityViolationError
 * - code: 'SYNTAX_ERROR' → SyntaxError
 * - other → ExpressionError
 */
export class RuntimeError extends Error {
	constructor(
		message: string,
		public code: string,
		public details?: Record<string, unknown>,
	) {
		super(message);
		this.name = 'RuntimeError';
	}
}

/**
 * Lazy proxy configuration.
 */
export interface LazyProxyConfig {
	/**
	 * Host interface for fetching data.
	 */
	host: RuntimeHostInterface;

	/**
	 * Property path prefix (for nested proxies).
	 * Example: If this proxy represents $json.user, pathPrefix would be "user"
	 */
	pathPrefix?: string;

	/**
	 * Cache for fetched values to avoid repeated host calls.
	 */
	cache?: Map<string, unknown>;
}
