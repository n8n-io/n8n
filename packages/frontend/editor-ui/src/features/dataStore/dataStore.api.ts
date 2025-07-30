import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { CreateDataStoreDto, DataStore, ListDataStoreQueryDto } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getPersonalProject } from '@/api/projects.api';

export const createDataStoreTable = async (
	context: IRestApiContext,
	projectId: string,
	data: CreateDataStoreDto,
): Promise<DataStore | string> =>
	await makeRestApiRequest(context, 'POST', `/projects/${projectId}/data-store`, data);

export const listDataStoreTable = async (
	context: IRestApiContext,
	projectId: string,
	data: Partial<ListDataStoreQueryDto> = {},
): Promise<DataStore | string> =>
	await makeRestApiRequest(context, 'GET', `/projects/${projectId}/data-store`, data);

// dev util to run code
export const playground = async () => {
	const context = useRootStore().restApiContext;
	const project = await getPersonalProject(context);
	{
		const result = await listDataStoreTable(context, project.id);
		console.log(result);
	}
	{
		const result = await createDataStoreTable(context, project.id, {
			name: 'myFirstTable' + Math.random(),
			columns: [],
		});
		console.log(result);
	}
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
