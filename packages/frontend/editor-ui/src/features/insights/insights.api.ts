import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { InsightsSummary } from '@n8n/api-types';

export const fetchInsightsSummary = async (context: IRestApiContext): Promise<InsightsSummary> =>
	await makeRestApiRequest<InsightsSummary>(context, 'GET', '/insights/summary');
