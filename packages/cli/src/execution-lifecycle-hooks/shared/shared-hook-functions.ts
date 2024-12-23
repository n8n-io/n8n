import type { ExecutionStatus, IRun } from 'n8n-workflow';

export function determineFinalExecutionStatus(runData: IRun): ExecutionStatus {
	const workflowHasCrashed = runData.status === 'crashed';
	const workflowWasCanceled = runData.status === 'canceled';
	const workflowHasFailed = runData.status === 'error';
	const workflowDidSucceed =
		!runData.data.resultData?.error &&
		!workflowHasCrashed &&
		!workflowWasCanceled &&
		!workflowHasFailed;
	let workflowStatusFinal: ExecutionStatus = workflowDidSucceed ? 'success' : 'error';
	if (workflowHasCrashed) workflowStatusFinal = 'crashed';
	if (workflowWasCanceled) workflowStatusFinal = 'canceled';
	if (runData.waitTill) workflowStatusFinal = 'waiting';
	return workflowStatusFinal;
}
