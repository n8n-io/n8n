/**
 * Host integration seam — see design doc §3.5.
 *
 * The engine runs in two modes:
 * - Standalone: engine owns its data and uses default no-op behaviour for
 *   each hook below.
 * - Integrated: the host (n8n main) supplies these hooks at engine
 *   construction time.
 *
 * Concrete shapes for `PreFetchRequest`, `PreFetchResult`, `StatusUpdate`,
 * and `StepExecutionRequest`/`StepExecutionResult` are deferred to later
 * tickets (see design doc §3.4, §3.7). They're typed as `unknown` here so
 * downstream code is forced to narrow at the boundary, but no shape is
 * locked in prematurely.
 */

/**
 * Step-execution seam — see §3.4. The engine has no knowledge of v1 nodes;
 * `v1-node` steps are handled by an `IStepExecutor` implementation supplied
 * by the shim package in integrated mode.
 */
export interface IStepExecutor {
	execute(step: unknown): Promise<unknown>;
}

export interface ExternalDependencies {
	/** How the engine obtains workflow definitions and credentials. */
	preFetch?: (request: unknown) => Promise<unknown>;

	/** Where the engine publishes lifecycle events for realtime UI. */
	statusCallback?: (updates: unknown[]) => Promise<void>;

	/** Who executes `v1-node` steps — provided by the shim in integrated mode. */
	v1StepExecutor?: IStepExecutor;
}
