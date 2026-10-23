export type AgentTurnStatus = 'completed' | 'suspended' | 'errored' | 'cancelled';

/** The outcome of a turn that the runtime is about to store. */
export interface AgentTurnFinalizeOutcome {
	executionId: string;
	status: AgentTurnStatus;
	error?: unknown;
}

/** The user-facing form of a turn error, given by a host formatter. */
export interface FormattedTurnError {
	message: string;
	/** A stable code for the client, such as `quota_exhausted`. */
	code?: string;
}
