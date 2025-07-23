import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { DataStore, DataStoreColumn } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

export const createDataStoreTable = async (
	context: IRestApiContext,
	data: Pick<DataStore, 'name' | 'columns'>,
): Promise<DataStore> => await makeRestApiRequest(context, 'POST', '/data-store/create', data);

// dev util to run code
export const playground = async () => {
	await createDataStoreTable(useRootStore().restApiContext, { name: 'myFirstTable', columns: [] });
};

// export const fetchInsightsSummary = async (
// 	context: IRestApiContext,
// 	filter?: { dateRange: InsightsDateRange['key'] },
// ): Promise<InsightsSummary> =>
// 	await makeRestApiRequest(context, 'GET', '/insights/summary', filter);

// export const fetchInsightsByTime = async (
// 	context: IRestApiContext,
// 	filter?: { dateRange: InsightsDateRange['key'] },
// ): Promise<InsightsByTime[]> =>
// 	await makeRestApiRequest(context, 'GET', '/insights/by-time', filter);

// export const fetchInsightsTimeSaved = async (
// 	context: IRestApiContext,
// 	filter?: { dateRange: InsightsDateRange['key'] },
// ): Promise<InsightsByTime[]> =>
// 	await makeRestApiRequest(context, 'GET', '/insights/by-time/time-saved', filter);

// export const fetchInsightsByWorkflow = async (
// 	context: IRestApiContext,
// 	filter?: ListInsightsWorkflowQueryDto,
// ): Promise<InsightsByWorkflow> =>
// 	await makeRestApiRequest(context, 'GET', '/insights/by-workflow', filter);
