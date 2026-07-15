import { get, makeRestApiRequest } from '@n8n/rest-api-client';
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

// Calls the public API (see packages/cli/src/public-api/v1/handlers/insights/insights.handler.ts)
// instead of the internal REST endpoint above. Authenticates via the browser's
// session cookie, so `rootUrl` must be the instance root (e.g. `useRootStore().baseUrl`),
// not the `/rest`-suffixed `IRestApiContext.baseUrl`.
export const fetchInsightsSummaryPublicApi = async (
	rootUrl: string,
	filter?: InsightsDateFilterDto,
): Promise<InsightsSummary> =>
	await get(`${rootUrl}api/v1`, '/insights/summary', serializeInsightsFilter(filter));

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
