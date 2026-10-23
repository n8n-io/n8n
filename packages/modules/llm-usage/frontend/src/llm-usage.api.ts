import type {
	LlmUsageCallSortKey,
	LlmUsageCallsResponse,
	LlmUsageSummaryResponse,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export interface LlmUsageCallsQuery {
	days: number;
	skip: number;
	take: number;
	sortBy: LlmUsageCallSortKey;
	sortOrder: 'asc' | 'desc';
}

/** The page and sort of the calls list. The store adds the range. */
export type LlmUsageCallsPage = Omit<LlmUsageCallsQuery, 'days'>;

export async function fetchLlmUsageSummary(
	context: IRestApiContext,
	days: number,
): Promise<LlmUsageSummaryResponse> {
	return await makeRestApiRequest(context, 'GET', '/llm-usage/summary', { days });
}

export async function fetchLlmUsageCalls(
	context: IRestApiContext,
	query: LlmUsageCallsQuery,
): Promise<LlmUsageCallsResponse> {
	return await makeRestApiRequest(context, 'GET', '/llm-usage/calls', { ...query });
}
