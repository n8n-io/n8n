export enum ExecutionStatus {
	Running = 'running',
	Completed = 'completed',
	Failed = 'failed',
	Cancelled = 'cancelled',
	Waiting = 'waiting',
	Paused = 'paused',
}

export enum StepStatus {
	Pending = 'pending',
	Queued = 'queued',
	Running = 'running',
	RetryPending = 'retry_pending',
	WaitingApproval = 'waiting_approval',
	Waiting = 'waiting',
	Suspended = 'suspended',
	Completed = 'completed',
	Failed = 'failed',
	Cancelled = 'cancelled',
	Skipped = 'skipped',
	Cached = 'cached',
}

export enum StepType {
	Trigger = 'trigger',
	Step = 'step',
	Batch = 'batch',
	Approval = 'approval',
	Condition = 'condition',
	Sleep = 'sleep',
	TriggerWorkflow = 'trigger_workflow',
	Agent = 'agent',
}

export const TERMINAL_STATUSES: StepStatus[] = [
	StepStatus.Completed,
	StepStatus.Failed,
	StepStatus.Cancelled,
	StepStatus.Skipped,
	StepStatus.Cached,
];

export const NON_TERMINAL_STATUSES: StepStatus[] = [
	StepStatus.Pending,
	StepStatus.Queued,
	StepStatus.Running,
	StepStatus.RetryPending,
	StepStatus.WaitingApproval,
	StepStatus.Waiting,
	StepStatus.Suspended,
];
