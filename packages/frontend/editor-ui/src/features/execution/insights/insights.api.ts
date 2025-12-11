import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InsightsSummary,
	InsightsByTime,
	InsightsByWorkflow,
	ListInsightsWorkflowQueryDto,
	InsightsDateFilterDto,
} from '@n8n/api-types';

type SerializedDateFilter<T> = Omit<T, 'startDate' | 'endDate'> & {
	startDate?: string;
	endDate?: string;
};

export function serializeInsightsFilter<
	T extends InsightsDateFilterDto | ListInsightsWorkflowQueryDto,
>(filter?: T): SerializedDateFilter<T> | undefined {
	if (!filter) return undefined;

	const { startDate, endDate, ...rest } = filter;
	const serialized: SerializedDateFilter<T> = { ...rest };

	if (startDate) {
		serialized.startDate = startDate.toISOString();
	}
	if (endDate) {
		serialized.endDate = endDate.toISOString();
	}

	return serialized;
}

export const fetchInsightsSummary = async (
	context: IRestApiContext,
	filter?: InsightsDateFilterDto,
): Promise<InsightsSummary> =>
	await makeRestApiRequest(context, 'GET', '/insights/summary', serializeInsightsFilter(filter));

export const fetchInsightsByTime = async (
	context: IRestApiContext,
	filter?: InsightsDateFilterDto,
): Promise<InsightsByTime[]> =>
	await makeRestApiRequest(context, 'GET', '/insights/by-time', serializeInsightsFilter(filter));

export const fetchInsightsTimeSaved = async (
	context: IRestApiContext,
	filter?: InsightsDateFilterDto,
): Promise<InsightsByTime[]> =>
	await makeRestApiRequest(
		context,
		'GET',
		'/insights/by-time/time-saved',
		serializeInsightsFilter(filter),
	);

export const fetchInsightsByWorkflow = async (
	context: IRestApiContext,
	filter?: ListInsightsWorkflowQueryDto,
): Promise<InsightsByWorkflow> =>
	await makeRestApiRequest(
		context,
		'GET',
		'/insights/by-workflow',
		serializeInsightsFilter(filter),
	);
