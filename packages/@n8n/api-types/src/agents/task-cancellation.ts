export interface AgentPlanTaskRef {
	planId: string;
	planTaskId: string;
}

/** Runtime state does not change the saved task statuses. */
export interface AgentPlanWorkState {
	stoppedTaskIds: string[];
	stoppingTaskIds: string[];
	fullyStopped: boolean;
	stoppedAt: string | null;
	taskStateAvailable: boolean;
}

export interface AgentPlanItemDto {
	id: string;
	title: string;
	description?: string;
	resultSummary?: string;
	status: 'pending' | 'in_progress' | 'done' | 'failed' | 'cancelled';
	dependsOn: string[];
}

export interface AgentPlanSnapshotDto {
	workState?: AgentPlanWorkState;
	readiness: { ready: string[]; blocked: Array<{ id: string; blockedBy: string[] }> };
	planId: string;
	revision: number;
	closed: boolean;
	startedAt: string | null;
	finishedAt?: string | null;
	closedAt: string | null;
	document: {
		title: string;
		description?: string;
		presentation?: { label: string; detail?: string };
		items: Array<
			| (AgentPlanItemDto & { kind: 'task'; fallbackFor?: string })
			| (AgentPlanItemDto & {
					kind: 'group';
					tasks: Array<AgentPlanItemDto & { kind: 'task'; fallbackFor?: string }>;
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
	requestedAt: string;
	failures: AgentTaskStopFailure[];
	plan: AgentPlanSnapshotDto | null;
}
