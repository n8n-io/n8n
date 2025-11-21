import type { WorkflowPublishHistory } from '@n8n/rest-api-client/api/workflowHistory';

export const getLastPublishedByUser = (workflowPublishHistory: WorkflowPublishHistory[]) => {
	return workflowPublishHistory.findLast(
		(history) => history.mode === 'activate' && history.userId !== null,
	);
};
