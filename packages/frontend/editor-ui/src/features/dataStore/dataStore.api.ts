import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { CreateDataStoreDto, DataStore } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { inferProjectIdFromRoute } from '@/utils/rbacUtils';
import { getPersonalProject } from '@/api/projects.api';

export const createDataStoreTable = async (
	context: IRestApiContext,
	data: CreateDataStoreDto,
): Promise<DataStore | string> =>
	await makeRestApiRequest(context, 'POST', '/data-store/create', data);

// dev util to run code
export const playground = async () => {
	const context = useRootStore().restApiContext;
	const project = await getPersonalProject(context);
	const result = await createDataStoreTable(context, {
		name: 'myFirstTable',
		columns: [],
		projectId: project.id,
	});
	console.log(result);
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
