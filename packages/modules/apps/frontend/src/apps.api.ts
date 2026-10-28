import type { AppListResponse } from '@n8n/api-types';
import { getFullApiResponse, makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

import type { AppsSortBy } from './apps.constants';

export type ListAppsOptions = {
	skip: number;
	take: number;
	sortBy: AppsSortBy;
	name?: string;
};

export async function listApps(
	context: IRestApiContext,
	projectId: string | undefined,
	options: ListAppsOptions,
): Promise<AppListResponse> {
	const endpoint = projectId ? `/projects/${projectId}/apps` : '/apps';
	return await getFullApiResponse<AppListResponse['data']>(context, 'GET', endpoint, options);
}

export async function deleteApp(
	context: IRestApiContext,
	projectId: string,
	appId: string,
): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `/projects/${projectId}/apps/${appId}`);
}
