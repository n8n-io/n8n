/**
 * Abstract interface for runtime bridges.
 *
 * A bridge manages communication between the host process and the isolated context.
 * Different bridge implementations support different isolation mechanisms:
 * - IsolatedVmBridge: Uses isolated-vm for Node.js backend
 * - WebWorkerBridge: Uses Web Workers for browser frontend
 * - TaskRunnerBridge: Uses IPC for separate processes
 * - NodeVmBridge: Uses Node.js vm module for testing
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
	 * @param dataId - Unique identifier for workflow data (for lazy loading)
	 * @returns Result of the expression evaluation
	 */
	execute(code: string, dataId: string): Promise<unknown>;

	/**
	 * Handle data request from runtime (lazy loading).
	 *
	 * Called when runtime accesses a property it doesn't have locally.
	 * The bridge looks up the property in host data and returns it.
	 *
	 * @param dataId - Data identifier from execute()
	 * @param path - Property path (e.g., "user.email")
	 * @returns Value at the path, or undefined if not found
	 */
	getData(dataId: string, path: string): Promise<unknown>;

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
	 */
	debug?: boolean;
}

/**
 * Data store for workflow data.
 * Maps data IDs to workflow data objects.
 */
export interface DataStore {
	set(id: string, data: WorkflowDataProxy): void;
	get(id: string): WorkflowDataProxy | undefined;
	delete(id: string): void;
}

/**
 * Workflow data proxy for lazy loading.
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
