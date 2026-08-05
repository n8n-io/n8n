import type { InsightsDateFilterDto, InsightsSummary } from '@n8n/api-types';

import type { IPublicApiContext } from './types';
import { get } from './utils';

function serializeInsightsFilter(filter?: InsightsDateFilterDto) {
	if (!filter) return undefined;

	const { startDate, endDate, ...rest } = filter;

	return {
		...rest,
		...(startDate && { startDate: startDate.toISOString() }),
		...(endDate && { endDate: endDate.toISOString() }),
	};
}

// Calls the public API (see packages/cli/src/public-api/v1/handlers/insights/insights.handler.ts)
// instead of the internal REST endpoint, authenticating via the browser's session cookie.
export const fetchInsightsSummaryPublicApi = async (
	context: IPublicApiContext,
	filter?: InsightsDateFilterDto,
): Promise<InsightsSummary> =>
	await get<InsightsSummary>(context, '/insights/summary', serializeInsightsFilter(filter));
