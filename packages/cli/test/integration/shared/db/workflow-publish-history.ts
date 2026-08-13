import type { WorkflowHistory, WorkflowPublishHistory } from '@n8n/db';
import { WorkflowPublishHistoryRepository } from '@n8n/db';
import { Container } from '@n8n/di';

export async function createWorkflowPublishHistoryItem(
	workflowHistory: Pick<WorkflowHistory, 'workflowId' | 'versionId'>,
	data?: Partial<WorkflowPublishHistory>,
) {
	return await Container.get(WorkflowPublishHistoryRepository).save({
		workflowId: workflowHistory.workflowId,
		versionId: workflowHistory.versionId,
		event: 'activated',
		userId: null,
		...(data ?? {}),
	});
}

export async function createManyWorkflowPublishHistoryItems(
	workflowHistory: WorkflowHistory,
	count: number,
	time?: Date,
) {
	const baseTime = (time ?? new Date()).valueOf();
	return await Promise.all(
		[...Array(count)].map(
			async (_, i) =>
				await createWorkflowPublishHistoryItem(workflowHistory, {
					createdAt: new Date(baseTime + i),
				}),
		),
	);
}
