export type AgentTurnStatus = 'completed' | 'suspended' | 'errored' | 'cancelled';

/** The outcome of a turn that the runtime is about to store. */
export interface AgentTurnFinalizeOutcome {
	executionId: string;
	status: AgentTurnStatus;
	error?: unknown;
}
