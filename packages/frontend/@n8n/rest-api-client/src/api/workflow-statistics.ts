import type { Iso8601DateTimeString, WorkflowStatisticsData } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export const getWorkflowStatisticsTimes = async (
	context: IRestApiContext,
	workflowId: string,
): Promise<WorkflowStatisticsData<Iso8601DateTimeString | null>> => {
	return await makeRestApiRequest(
		context,
		'GET',
		`/workflow-stats/${encodeURIComponent(workflowId)}/times`,
	);
};
