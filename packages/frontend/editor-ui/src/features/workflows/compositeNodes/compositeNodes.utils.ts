import type { INode, IRunData } from 'n8n-workflow';

import type { ExecutionPreviewNodeSchema } from '@/features/execution/executions/executions.types';

/**
 * The status of each inner node in an execution, so the inside view can mark
 * the steps that ran. Steps that did not run, such as attempts that were not
 * needed, have no entry.
 */
export function toInnerNodeStatuses(
	nodes: INode[],
	runData: IRunData | undefined,
): Record<string, ExecutionPreviewNodeSchema> {
	const statuses: Record<string, ExecutionPreviewNodeSchema> = {};
	for (const node of nodes) {
		const task = runData?.[node.name]?.at(-1);
		if (!task?.executionStatus) continue;
		statuses[node.name] = {
			executionStatus: task.executionStatus,
			executionTime: task.executionTime,
			...(task.error
				? {
						error: {
							message: task.error.message,
							description: task.error.description ?? undefined,
							name: task.error.name,
						},
					}
				: {}),
		};
	}
	return statuses;
}
