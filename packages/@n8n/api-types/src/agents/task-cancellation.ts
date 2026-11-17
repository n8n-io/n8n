export interface AgentPlanTaskRef {
	planId: string;
	planTaskId: string;
}

export interface AgentPlanItemDto {
	id: string;
	title: string;
	description?: string;
	resultSummary?: string;
	status: 'pending' | 'in_progress' | 'paused' | 'done' | 'failed' | 'cancelled';
	dependsOn: string[];
}

export interface AgentPlanSnapshotDto {
	readiness: { ready: string[]; blocked: Array<{ id: string; blockedBy: string[] }> };
	planId: string;
	revision: number;
	closed: boolean;
	startedAt: string | null;
	finishedAt?: string | null;
	lastActivityAt?: string | null;
	closedAt: string | null;
	document: {
		title: string;
		description?: string;
		presentation?: { label: string; detail?: string };
		items: Array<
			| (AgentPlanItemDto & { kind: 'task'; fallbackFor?: string; jobId?: string })
			| (AgentPlanItemDto & {
					kind: 'group';
					tasks: Array<AgentPlanItemDto & { kind: 'task'; fallbackFor?: string; jobId?: string }>;
			  })
		>;
	};
}

export interface AgentTaskStopFailure {
	jobId: string;
	title: string;
}

export interface AgentTaskCancellationState {
	planId: string | null;
	status: 'stopping' | 'failed' | 'stopped' | 'resumed';
	reportFailed?: boolean;
	report?: { status: 'queued' | 'running' | 'completed' | 'failed'; executionId?: string };
	requestedAt: string;
	failures: AgentTaskStopFailure[];
	plan: AgentPlanSnapshotDto | null;
}
