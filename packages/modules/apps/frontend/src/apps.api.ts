import type {
	AppBuildResponse,
	AppListResponse,
	AppPreviewResponse,
	AppResponse,
	AppVersionResponse,
} from '@n8n/api-types';
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

export async function getApp(
	context: IRestApiContext,
	projectId: string,
	appId: string,
): Promise<AppResponse> {
	return await makeRestApiRequest(context, 'GET', `/projects/${projectId}/apps/${appId}`);
}

export async function deleteApp(
	context: IRestApiContext,
	projectId: string,
	appId: string,
): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `/projects/${projectId}/apps/${appId}`);
}

export async function listAppVersions(
	context: IRestApiContext,
	projectId: string,
	appId: string,
): Promise<AppVersionResponse[]> {
	return await makeRestApiRequest(context, 'GET', `/projects/${projectId}/apps/${appId}/versions`);
}

export async function getAppBuild(
	context: IRestApiContext,
	projectId: string,
	appId: string,
	versionId: string,
): Promise<AppBuildResponse> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/projects/${projectId}/apps/${appId}/versions/${versionId}/build`,
	);
}

export async function createAppPreview(
	context: IRestApiContext,
	projectId: string,
	appId: string,
	versionId: string,
): Promise<AppPreviewResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/projects/${projectId}/apps/${appId}/versions/${versionId}/preview`,
	);
}
