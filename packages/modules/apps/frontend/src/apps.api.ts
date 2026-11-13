import {
	SUPPORTED_WORKFLOW_TOOL_TRIGGERS,
	type AppBinding,
	type AppBindingKind,
	type AppBindingsResponse,
	type AppPublishPreviewResponse,
	type AppBuildResponse,
	type AppListResponse,
	type AppPreviewResponse,
	type AppResponse,
	type AppVersionResponse,
	type PublishAppDto,
	type RestoreAppVersionDto,
	type UpdateAppDto,
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

export async function updateApp(
	context: IRestApiContext,
	projectId: string,
	appId: string,
	changes: UpdateAppDto,
): Promise<AppResponse> {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`/projects/${projectId}/apps/${appId}`,
		changes,
	);
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

export async function publishApp(
	context: IRestApiContext,
	projectId: string,
	appId: string,
	publication: PublishAppDto,
): Promise<AppResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/projects/${projectId}/apps/${appId}/publish`,
		publication,
	);
}

export async function getAppPublishPreview(
	context: IRestApiContext,
	projectId: string,
	appId: string,
	versionId: string,
): Promise<AppPublishPreviewResponse> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/projects/${projectId}/apps/${appId}/versions/${versionId}/publish-preview`,
	);
}

export async function restoreAppVersion(
	context: IRestApiContext,
	projectId: string,
	appId: string,
	versionId: string,
	restoration: RestoreAppVersionDto,
): Promise<AppVersionResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/projects/${projectId}/apps/${appId}/versions/${versionId}/restore`,
		restoration,
	);
}

export async function getAppBindings(
	context: IRestApiContext,
	projectId: string,
	appId: string,
): Promise<AppBindingsResponse> {
	return await makeRestApiRequest(context, 'GET', `/projects/${projectId}/apps/${appId}/bindings`);
}

export async function setAppBindings(
	context: IRestApiContext,
	projectId: string,
	appId: string,
	baseVersionId: string | null,
	bindings: AppBinding[],
): Promise<AppBindingsResponse> {
	return await makeRestApiRequest(context, 'PUT', `/projects/${projectId}/apps/${appId}/bindings`, {
		baseVersionId,
		bindings,
	});
}

export type BindableResource = { id: string; name: string };
export type BindableResourceList = { data: BindableResource[]; count: number };

const BINDABLE_RESOURCE_LIMIT = 100;

function sanitizeLikeQuery(query?: string) {
	return query?.replace(/[\\%_]/g, '');
}

async function listBindableWorkflows(context: IRestApiContext, projectId: string, query?: string) {
	return await getFullApiResponse<BindableResource[]>(context, 'GET', '/workflows', {
		filter: {
			projectId,
			isArchived: false,
			triggerNodeTypes: SUPPORTED_WORKFLOW_TOOL_TRIGGERS,
			...(query ? { query } : {}),
		},
		select: JSON.stringify(['id', 'name']),
		take: BINDABLE_RESOURCE_LIMIT,
		sortBy: 'name:asc',
	});
}

async function listBindableDataTables(context: IRestApiContext, projectId: string, query?: string) {
	return await makeRestApiRequest<BindableResourceList>(
		context,
		'GET',
		`/projects/${projectId}/data-tables`,
		{
			take: BINDABLE_RESOURCE_LIMIT,
			sortBy: 'name:asc',
			...(query ? { filter: { name: query } } : {}),
		},
	);
}

async function listBindableAgents(context: IRestApiContext, projectId: string, query?: string) {
	return await getFullApiResponse<BindableResource[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2`,
		{
			take: BINDABLE_RESOURCE_LIMIT,
			sortBy: 'name:asc',
			...(query ? { filter: { query } } : {}),
		},
	);
}

const BINDABLE_RESOURCE_LISTS = {
	workflow: listBindableWorkflows,
	dataTable: listBindableDataTables,
	agent: listBindableAgents,
} satisfies Record<
	AppBindingKind,
	(context: IRestApiContext, projectId: string, query?: string) => Promise<BindableResourceList>
>;

export async function listBindableResources(
	context: IRestApiContext,
	projectId: string,
	kind: AppBindingKind,
	query?: string,
): Promise<BindableResourceList> {
	const { data, count } = await BINDABLE_RESOURCE_LISTS[kind](
		context,
		projectId,
		sanitizeLikeQuery(query),
	);
	return { data: data.map(({ id, name }) => ({ id, name })), count };
}

export async function unpublishApp(
	context: IRestApiContext,
	projectId: string,
	appId: string,
): Promise<AppResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/projects/${projectId}/apps/${appId}/unpublish`,
	);
}
