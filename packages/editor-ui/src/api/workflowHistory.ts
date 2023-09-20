import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';

export const getWorkflowHistory = async (
	context: IRestApiContext,
	workflowId: string,
): Promise<any> => makeRestApiRequest(context, 'POST', `/workflow/${workflowId}/history`);

export const getWorkflowVersion = async (
	context: IRestApiContext,
	workflowId: string,
	versionId: string,
): Promise<any> =>
	makeRestApiRequest(context, 'POST', `/workflow/${workflowId}/history/${versionId}`);
