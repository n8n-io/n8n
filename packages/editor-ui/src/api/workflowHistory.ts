import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import type { WorkflowHistory, WorkflowVersion } from '@/types/workflowHistory';
import type { HasAtLeastOneKey } from '@/utils/typeHelpers';
import { valuesToString } from '@/utils/objectUtils';

const workflowHistoryApiRoot = '/workflow-history';

export const getWorkflowHistory = async (
	context: IRestApiContext,
	workflowId: string,
	queryParams: HasAtLeastOneKey<{ take?: number; skip?: number }>,
): Promise<WorkflowHistory[]> =>
	makeRestApiRequest(
		context,
		'GET',
		`${workflowHistoryApiRoot}/workflow/${workflowId}?${new URLSearchParams(
			valuesToString(queryParams),
		).toString()}`,
	);

export const getWorkflowVersion = async (
	context: IRestApiContext,
	workflowId: string,
	versionId: string,
): Promise<WorkflowVersion> =>
	makeRestApiRequest(
		context,
		'GET',
		`${workflowHistoryApiRoot}/workflow/${workflowId}/version/${versionId}`,
	);
