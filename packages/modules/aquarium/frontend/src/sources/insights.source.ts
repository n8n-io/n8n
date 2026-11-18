import type { InsightsByWorkflow } from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import type { EntityMetricsPatch, MetricsSource } from '../aquarium.types';
import { entityKey } from './source.utils';

/** The maximum page size of the endpoint. */
const PAGE_SIZE = 100;

export function toInsightsPatches(insights: InsightsByWorkflow): EntityMetricsPatch[] {
	return insights.data.flatMap((row) =>
		row.workflowId
			? [
					{
						key: entityKey('workflow', row.workflowId),
						metrics: {
							executionCount: row.total,
							// Insights record a run when it ends, so every run they count has finished.
							finishedCount: row.total,
							failedCount: row.failed,
							averageRunTimeMs: row.averageRunTime,
						},
					},
				]
			: [],
	);
}

/** Needs the insights dashboard license. Without it the request fails and the store skips it. */
export const insightsSource: MetricsSource = {
	id: 'insights',
	async load({ restApiContext }) {
		const insights = await makeRestApiRequest<InsightsByWorkflow>(
			restApiContext,
			'GET',
			'/insights/by-workflow',
			{ take: PAGE_SIZE, sortBy: 'total:desc' },
		);
		return toInsightsPatches(insights);
	},
};
