/**
 * Low-cardinality metrics events of the Agents runtime, consumed by the
 * Prometheus agent collector. Payloads carry only metric labels and values.
 */

/** A top-level turn, or a run that another agent delegated. */
export type AgentMetricsExecutionKind = 'turn' | 'delegated';

/**
 * The final status of an execution that its process stored. `suspended` is a
 * turn that stopped to wait for the user. The turn that resumes it is a new
 * execution. The sweep reports `interrupted` executions with a separate event.
 */
export type AgentMetricsExecutionStatus =
	| 'success'
	| 'error'
	| 'cancelled'
	| 'suspended'
	| 'awaiting';

export interface AgentMetricsScope {
	/**
	 * The system agent that owns the execution, for example `assistant`, or
	 * `project` for every agent that a user built. Project agent ids are not
	 * used as labels, because their number has no bound.
	 */
	agent: string;
	kind: AgentMetricsExecutionKind;
}

export type AgentMetricsEventMap = {
	/** An execution stored its final record. */
	'agent-execution-finished': AgentMetricsScope & {
		status: AgentMetricsExecutionStatus;
		durationMs: number;
		toolCalls: { success: number; error: number; cancelled: number };
		/** Tokens of the run. Cache tokens are a part of the input tokens. */
		tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
		/** Estimated cost in USD, when the model has pricing. Side calls are not included. */
		costUsd?: number;
	};
	/** The sweep marked an execution as interrupted, because its process stopped. */
	'agent-execution-interrupted': AgentMetricsScope;
};
