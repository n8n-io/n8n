import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import type {
	WorkflowHistory,
	WorkflowVersion,
	WorkflowHistoryRequestParams,
} from '@/types/workflowHistory';
import { valuesToString } from '@/utils/objectUtils';

export const getWorkflowHistory = async (
	context: IRestApiContext,
	workflowId: string,
	queryParams: WorkflowHistoryRequestParams,
): Promise<WorkflowHistory[]> =>
	makeRestApiRequest(
		context,
		'GET',
		`/workflow-history/workflow/${workflowId}?${new URLSearchParams(valuesToString(queryParams))}`,
	);

export const getWorkflowVersion = async (
	context: IRestApiContext,
	workflowId: string,
	versionId: string,
): Promise<WorkflowVersion> =>
	makeRestApiRequest(
		context,
		'GET',
		`/workflow-history/workflow/${workflowId}/version/${versionId}`,
	);
