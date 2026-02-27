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
 * - IsolatedVmBridge: Uses isolated-vm for Node.js backend (secure isolation with memory limits)
 * - WebWorkerBridge: Uses Web Workers for browser frontend (Phase 2+)
 * - Task Runner: TBD - May use IsolatedVmBridge locally or direct evaluation (Phase 2+)
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
	 * @param data - Workflow data proxy from WorkflowDataProxy.getDataProxy()
	 * @returns Result of the expression evaluation.
	 *          Must be JSON-serializable (no functions, symbols, etc.)
	 *
	 * Note: Synchronous for Node.js vm module (Slice 1).
	 *       Will be async for isolated-vm (Slice 2).
	 */
	execute(code: string, data: Record<string, unknown>): unknown;

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
