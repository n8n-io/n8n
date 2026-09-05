import type {
	ExecutionStatus,
	IRun,
	WorkflowExecuteMode,
	WorkflowExecutionSource,
} from 'n8n-workflow';

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

export function isBillableExecution(runData: IRun, source?: WorkflowExecutionSource): boolean {
	return (
		source !== 'instance_ai' &&
		isModeRootExecution[runData.mode] &&
		isStatusRootExecution[runData.status]
	);
}
