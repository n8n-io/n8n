/**
 * Runtime interface exposed to isolated context.
 *
 * This interface defines what the runtime code (running inside the isolated context)
 * can call. The bridge implements these functions on the host side.
 */
export interface RuntimeHostInterface {
	/**
	 * Get data from host by path.
	 * Used by lazy loading proxies to fetch data on-demand.
	 *
	 * @param dataId - Data identifier
	 * @param path - Property path to fetch
	 * @returns Promise resolving to the value
	 */
	getData(dataId: string, path: string): Promise<unknown>;
}

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
	 * Data ID for current evaluation.
	 * Set by bridge before each execute() call.
	 */
	__dataId: string;

	/**
	 * Workflow data proxy ($json, $item, etc.).
	 * Set by bridge before each execute() call.
	 */
	$: Record<string, unknown>;
	$json: Record<string, unknown>;
	$item: (index: number, runIndex?: number) => Record<string, unknown>;
	$input: {
		all: () => Array<{ json: Record<string, unknown> }>;
		first: () => { json: Record<string, unknown> } | undefined;
		last: () => { json: Record<string, unknown> } | undefined;
		item: { json: Record<string, unknown> };
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
 * Runtime error types.
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
	 * Data ID for lazy loading.
	 */
	dataId: string;

	/**
	 * Host interface for fetching data.
	 */
	host: RuntimeHostInterface;

	/**
	 * Property path prefix (for nested proxies).
	 */
	pathPrefix?: string;

	/**
	 * Cache for fetched values.
	 */
	cache?: Map<string, unknown>;
}
