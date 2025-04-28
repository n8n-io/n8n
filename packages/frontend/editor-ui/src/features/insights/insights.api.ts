import { makeRestApiRequest } from '@/utils/apiUtils';
import type { IRestApiContext } from '@/Interface';
import type {
	InsightsSummary,
	InsightsByTime,
	InsightsByWorkflow,
	ListInsightsWorkflowQueryDto,
	InsightsDateRange,
} from '@n8n/api-types';

export const fetchInsightsSummary = async (
	context: IRestApiContext,
	filter?: { dateRange: InsightsDateRange['key'] },
): Promise<InsightsSummary> =>
	await makeRestApiRequest(context, 'GET', '/insights/summary', filter);

export const fetchInsightsByTime = async (
	context: IRestApiContext,
	filter?: { dateRange: InsightsDateRange['key'] },
): Promise<InsightsByTime[]> =>
	await makeRestApiRequest(context, 'GET', '/insights/by-time', filter);

export const fetchInsightsByWorkflow = async (
	context: IRestApiContext,
	filter?: ListInsightsWorkflowQueryDto,
): Promise<InsightsByWorkflow> =>
	await makeRestApiRequest(context, 'GET', '/insights/by-workflow', filter);
