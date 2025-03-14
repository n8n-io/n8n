import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { InsightsSummary } from '@n8n/api-types';

export const fetchInsightsSummary = async (context: IRestApiContext): Promise<InsightsSummary> =>
	await makeRestApiRequest<InsightsSummary>(context, 'GET', '/insights/summary')
		// TODO: Remove this catch block once the API is implemented
		.catch(() => ({
			total: {
				value: 525,
				deviation: 85,
				unit: 'count',
			},
			failed: {
				value: 14,
				deviation: 3,
				unit: 'count',
			},
			failureRate: {
				value: 1.9,
				deviation: -5,
				unit: 'ratio',
			},
			timeSaved: {
				value: 54 * 60 * 60,
				deviation: -5,
				unit: 'time',
			},
			averageRunTime: {
				value: 2.5,
				deviation: -5,
				unit: 'time',
			},
		}));
