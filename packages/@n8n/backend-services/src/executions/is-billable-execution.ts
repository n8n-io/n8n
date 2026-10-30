import type { ExecutionStatus, WorkflowExecuteMode, WorkflowExecutionSource } from 'n8n-workflow';

const isStatusRootExecution = {
	success: true,
	crashed: true,
	error: true,

	canceled: false,
	new: false,
	running: false,
	unknown: false,
	waiting: false,
} satisfies Record<ExecutionStatus, boolean>;

const isModeRootExecution = {
	cli: true,
	retry: true,
	trigger: true,
	webhook: true,
	evaluation: true,

	integrated: false,
	error: false,
	internal: false,
	manual: false,
	chat: false,
	agent: false,
} satisfies Record<WorkflowExecuteMode, boolean>;

type BillableRunData = {
	mode: WorkflowExecuteMode;
	status: ExecutionStatus;
	/** Null while no runner has taken the execution. */
	startedAt: Date | null;
	data?: { resultData?: { failedBeforeStart?: true } };
};

export function isBillableExecution(
	runData: BillableRunData,
	source?: WorkflowExecutionSource,
): boolean {
	return (
		source !== 'instance_ai' &&
		// A run that no runner took, or that failed before its first node, did no work.
		runData.startedAt !== null &&
		runData.data?.resultData?.failedBeforeStart !== true &&
		isModeRootExecution[runData.mode] &&
		isStatusRootExecution[runData.status]
	);
}
