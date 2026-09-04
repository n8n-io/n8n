import type { ClaimedTask } from '@n8n/scheduler';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

/**
 * Finds the enabled trigger node that a due scheduler task points to.
 *
 * A missing or disabled node breaks an invariant: the job outlived its trigger
 * node, and deactivation should have removed it. The helper therefore throws
 * instead of returning `null`. The task then retries up to the maximum attempt
 * count and dead-letters.
 *
 * @param workflowData Published workflow version that the task runs against.
 * @param nodeId Id of the trigger node, from the task payload.
 * @param task Claimed task. Only its identifiers go into the error extras.
 * @param message Text of the thrown error. Each caller passes its own text, so
 * that the error names the trigger type (schedule or poll) that failed.
 * @returns The enabled node with this id.
 * @throws {UnexpectedError} If the node is missing or disabled. The error
 * carries `message` and the extras `taskId`, `jobId`, `workflowId` and
 * `nodeId`.
 */
export function resolveTaskTriggerNode(
	workflowData: IWorkflowBase,
	nodeId: string,
	task: ClaimedTask,
	message: string,
): INode {
	const node = workflowData.nodes.find((candidate) => candidate.id === nodeId);
	if (!node || node.disabled) {
		throw new UnexpectedError(message, {
			extra: { taskId: task.id, jobId: task.jobId, workflowId: workflowData.id, nodeId },
		});
	}
	return node;
}
