import type { AgentTaskStopFailure } from '@n8n/api-types';

/** The latest Stop and its captured work. Late dispatch can escape this stop. */
export interface AgentTaskStop {
	planId: string | null;
	requestedAt: string;
	/** Work that was active when Stop was requested. */
	generation: { executionIds: string[]; jobIds: string[]; threadIds: string[] };
	/** Jobs that did not stop. */
	failures: AgentTaskStopFailure[];
	pause: {
		requestsCompleted?: boolean;
		/** Set as `pauseRequestId` on the jobs that this Stop targets. */
		id: string;
		/** Execution that delivers the stop report. */
		reportExecutionId?: string;
		reportedAt?: string;
		reportFailed?: boolean;
		/** First user turn after the report. Chat opens again, but stopped tasks stay stopped. */
		resumedAt?: string;
	};
}

/** Stop records written before pause coordination have no `pause`. */
export type StoredAgentTaskStop = Omit<AgentTaskStop, 'pause'> & {
	pause?: AgentTaskStop['pause'];
};
