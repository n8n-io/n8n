import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import type { WorkflowHistory, WorkflowVersion } from '@/types/workflowHistory';

export const getWorkflowHistory = async (
	context: IRestApiContext,
	workflowId: string,
): Promise<WorkflowHistory[]> =>
	makeRestApiRequest(context, 'POST', `/workflow/${workflowId}/history`);

export const getWorkflowVersion = async (
	context: IRestApiContext,
	workflowId: string,
	versionId: string,
): Promise<WorkflowVersion> =>
	makeRestApiRequest(context, 'POST', `/workflow/${workflowId}/history/${versionId}`);
