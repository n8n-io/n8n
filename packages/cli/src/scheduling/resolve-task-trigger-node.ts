import type { ClaimedTask } from '@n8n/scheduler';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

export function resolveTaskTriggerNode(
	workflowData: IWorkflowBase,
	nodeId: string,
	task: ClaimedTask,
	message: string,
): INode {
	const node = workflowData.nodes.find((candidate) => candidate.id === nodeId);
	if (!node || node.disabled) {
		// The job outlived its trigger node: deactivation should have removed it.
		throw new UnexpectedError(message, {
			extra: { taskId: task.id, jobId: task.jobId, workflowId: workflowData.id, nodeId },
		});
	}
	return node;
}
