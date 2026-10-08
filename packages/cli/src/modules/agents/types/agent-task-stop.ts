import type { AgentTaskStopFailure } from '@n8n/api-types';

/** The latest stop boundary blocks old work without storing a retry operation. */
export interface AgentTaskStop {
	planId: string | null;
	requestedAt: string;
	generation: { executionIds: string[]; jobIds: string[]; threadIds: string[] };
	failures: AgentTaskStopFailure[];
}
