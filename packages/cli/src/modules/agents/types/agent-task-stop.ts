import type { AgentTaskStopFailure } from '@n8n/api-types';

/** Keep the stop and its acknowledgement available between jobs and across restarts. */
export interface AgentTaskStop {
	planId: string | null;
	requestedAt: string;
	generation: { executionIds: string[]; jobIds: string[]; threadIds: string[] };
	failures: AgentTaskStopFailure[];
	/** Reuse background checkpoints and deliver one report for this stop. */
	pause: {
		id: string;
		reportExecutionId?: string;
		reportedAt?: string;
		reportFailed?: boolean;
		resumedAt?: string;
	};
}
