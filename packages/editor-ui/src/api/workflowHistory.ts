import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import type { WorkflowHistory, WorkflowVersion } from '@/types/workflowHistory';

const workflowHistoryApiRoot = '/workflow-history';

export const getWorkflowHistory = async (
	context: IRestApiContext,
	workflowId: string,
): Promise<WorkflowHistory[]> =>
	makeRestApiRequest(context, 'POST', `${workflowHistoryApiRoot}/workflow/${workflowId}`);

export const getWorkflowVersion = async (
	context: IRestApiContext,
	workflowId: string,
	versionId: string,
): Promise<WorkflowVersion> =>
	makeRestApiRequest(
		context,
		'POST',
		`${workflowHistoryApiRoot}/workflow/${workflowId}/version/${versionId}`,
	);
