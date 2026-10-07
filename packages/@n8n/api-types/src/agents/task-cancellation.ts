export interface AgentPlanItemDto {
	id: string;
	title: string;
	description?: string;
	resultSummary?: string;
	status: 'pending' | 'in_progress' | 'done' | 'failed' | 'cancelled';
	dependsOn: string[];
}

export interface AgentPlanSnapshotDto {
	planId: string;
	revision: number;
	closed: boolean;
	startedAt: string | null;
	closedAt: string | null;
	document: {
		title: string;
		description?: string;
		presentation?: { label: string; detail?: string };
		items: Array<
			| (AgentPlanItemDto & { kind: 'task' })
			| (AgentPlanItemDto & { kind: 'group'; tasks: Array<AgentPlanItemDto & { kind: 'task' }> })
		>;
	};
}

export interface AgentTaskStopFailure {
	jobId: string;
	title: string;
}

export interface AgentTaskCancellationState {
	id: string;
	planId: string | null;
	status: 'stopping' | 'failed' | 'stopped';
	requestedAt: string;
	settledAt: string | null;
	failures: AgentTaskStopFailure[];
	reportStatus: 'pending' | 'claimed' | 'reported' | 'failed';
	/** Saved facts remain available if the acknowledgement cannot be generated. */
	report: string;
	plan: AgentPlanSnapshotDto | null;
	heldQueueIds: string[];
}
