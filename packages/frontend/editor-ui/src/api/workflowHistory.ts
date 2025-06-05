import type { IRestApiContext } from '@n8n/rest-api-client';
import { get } from '@n8n/rest-api-client';
import type {
	WorkflowHistory,
	WorkflowVersion,
	WorkflowHistoryRequestParams,
} from '@/types/workflowHistory';

export const getWorkflowHistory = async (
	context: IRestApiContext,
	workflowId: string,
	queryParams: WorkflowHistoryRequestParams,
): Promise<WorkflowHistory[]> => {
	const { data } = await get(
		context.baseUrl,
		`/workflow-history/workflow/${workflowId}`,
		queryParams,
	);
	return data;
};

export const getWorkflowVersion = async (
	context: IRestApiContext,
	workflowId: string,
	versionId: string,
): Promise<WorkflowVersion> => {
	const { data } = await get(
		context.baseUrl,
		`/workflow-history/workflow/${workflowId}/version/${versionId}`,
	);
	return data;
};
