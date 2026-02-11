// ============================================================================
// Phase 1.1: Bridge Interface (CORE - IMPLEMENT FIRST)
//
// This is the main interface all environments must implement.
// Start here for CLI/backend (IsolatedVmBridge) or frontend (WebWorkerBridge).
// ============================================================================

/**
 * Abstract interface for runtime bridges.
 *
 * A bridge manages communication between the host process and the isolated context.
 * Different bridge implementations support different isolation mechanisms:
 * - IsolatedVmBridge: Uses isolated-vm for Node.js backend (Phase 1.1)
 * - WebWorkerBridge: Uses Web Workers for browser frontend (Phase 2+)
 * - TaskRunnerBridge: Uses IPC for separate processes (Phase 2+)
 * - NodeVmBridge: Uses Node.js vm module for testing (Phase 1.1)
 */
export interface RuntimeBridge {
	/**
	 * Initialize the isolated context and load runtime code.
	 * Must be called before any execute() calls.
	 */
	initialize(): Promise<void>;

	/**
	 * Execute JavaScript code in the isolated context.
	 *
	 * @param code - Transformed JavaScript code to execute
	 * @param data - Workflow data for this evaluation
	 * @returns Result of the expression evaluation.
	 *          Must be JSON-serializable (no functions, symbols, etc.)
	 */
	execute(code: string, data: WorkflowDataProxy): Promise<unknown>;

	/**
	 * Handle synchronous data request from runtime (lazy loading).
	 *
	 * Called when runtime accesses a property it doesn't have locally.
	 * The bridge looks up the property in the current workflow data.
	 *
	 * IMPORTANT: This must be SYNCHRONOUS for lazy-loading proxies to work.
	 * - IsolatedVmBridge: Uses ivm.Reference for synchronous callbacks
	 * - WebWorkerBridge: Must pre-fetch data (no lazy loading in Phase 1)
	 * - NodeVmBridge: Direct synchronous call
	 *
	 * @param path - Property path (e.g., "user.email")
	 * @returns Value at the path, or undefined if not found.
	 *          Must be JSON-serializable.
	 */
	getDataSync(path: string): unknown;

	/**
	 * Dispose of the isolated context and free resources.
	 * After disposal, the bridge cannot be used again.
	 */
	dispose(): Promise<void>;

	/**
	 * Check if the bridge has been disposed.
	 * Disposed bridges cannot execute code.
	 */
	isDisposed(): boolean;
}

/**
 * Configuration for runtime bridges.
 */
export interface BridgeConfig {
	/**
	 * Memory limit in MB for isolated context.
	 * Default: 128MB
	 */
	memoryLimit?: number;

	/**
	 * Timeout in milliseconds for expression execution.
	 * Default: 5000ms
	 */
	timeout?: number;

	/**
	 * Enable debug mode (inspector protocol).
	 * Default: false
	 *
	 * Phase 2+: Chrome DevTools debugging support
	 */
	debug?: boolean;
}

/**
 * Internal proxy for lazy-loading workflow data.
 *
 * This is created by the evaluator from WorkflowData input (see evaluator.ts)
 * and passed to bridge.execute(). The bridge stores it temporarily and uses it
 * to respond to getDataSync() calls during evaluation.
 *
 * Implementation will provide efficient path-based lookup (e.g., lodash.get).
 */
export interface WorkflowDataProxy {
	/**
	 * Get value at a property path.
	 * Supports nested paths like "user.email".
	 */
	get(path: string): unknown;

	/**
	 * Check if a property path exists.
	 */
	has(path: string): boolean;
}
