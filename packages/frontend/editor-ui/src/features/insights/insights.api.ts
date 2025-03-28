import { makeRestApiRequest } from '@/utils/apiUtils';
import type { IRestApiContext } from '@/Interface';
import type {
	InsightsSummary,
	InsightsByTime,
	InsightsByWorkflow,
	ListInsightsWorkflowQueryDto,
} from '@n8n/api-types';

export const fetchInsightsSummary = async (context: IRestApiContext): Promise<InsightsSummary> =>
	await makeRestApiRequest(context, 'GET', '/insights/summary');

export const fetchInsightsByTime = async (context: IRestApiContext): Promise<InsightsByTime[]> =>
	await makeRestApiRequest(context, 'GET', '/insights/by-time');

export const fetchInsightsByWorkflow = async (
	context: IRestApiContext,
	filter?: ListInsightsWorkflowQueryDto,
): Promise<InsightsByWorkflow> =>
	await makeRestApiRequest(context, 'GET', '/insights/by-workflow', filter);
