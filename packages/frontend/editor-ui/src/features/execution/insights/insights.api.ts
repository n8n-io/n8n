import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InsightsSummary,
	InsightsByTime,
	InsightsByWorkflow,
	ListInsightsWorkflowQueryDto,
	InsightsDateFilterDto,
} from '@n8n/api-types';

export const fetchInsightsSummary = async (
	context: IRestApiContext,
	filter?: InsightsDateFilterDto,
): Promise<InsightsSummary> =>
	await makeRestApiRequest(context, 'GET', '/insights/summary', filter);

export const fetchInsightsByTime = async (
	context: IRestApiContext,
	filter?: InsightsDateFilterDto,
): Promise<InsightsByTime[]> =>
	await makeRestApiRequest(context, 'GET', '/insights/by-time', filter);

export const fetchInsightsTimeSaved = async (
	context: IRestApiContext,
	filter?: InsightsDateFilterDto,
): Promise<InsightsByTime[]> =>
	await makeRestApiRequest(context, 'GET', '/insights/by-time/time-saved', filter);

export const fetchInsightsByWorkflow = async (
	context: IRestApiContext,
	filter?: ListInsightsWorkflowQueryDto,
): Promise<InsightsByWorkflow> =>
	await makeRestApiRequest(context, 'GET', '/insights/by-workflow', filter);
