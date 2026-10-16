import type { AgentTaskStopFailure } from '@n8n/api-types';

/** Keep the stop and its acknowledgement available between jobs and across restarts. */
export interface AgentTaskStop {
	planId: string | null;
	requestedAt: string;
	/** Unfinished leaf tasks and empty groups captured when Stop was requested. */
	stoppedTaskIds?: string[];
	/** Explicitly selected workflow tasks that still need a replacement job. */
	restartTaskIds?: string[];
	planRevision?: number;
	generation: { executionIds: string[]; jobIds: string[]; threadIds: string[] };
	failures: AgentTaskStopFailure[];
	/** Reuse background checkpoints and deliver one report for this stop. */
	pause: {
		id: string;
		reportExecutionId?: string;
		reportedAt?: string;
		reportFailed?: boolean;
		/** Chat admission only. This does not resume stopped tasks. */
		resumedAt?: string;
	};
}

/** Earlier stop records have no pause coordination. */
export type StoredAgentTaskStop = Omit<AgentTaskStop, 'pause'> & {
	pause?: AgentTaskStop['pause'];
};
