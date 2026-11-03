import {
	SUPPORTED_WORKFLOW_TOOL_TRIGGERS,
	type AppBinding,
	type AppBindingKind,
	type AppBindingsResponse,
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

const BINDABLE_RESOURCE_LIMIT = 250;
const BINDABLE_WORKFLOW_LIMIT = 100;

async function listBindableWorkflows(context: IRestApiContext, projectId: string) {
	const { data } = await getFullApiResponse<BindableResource[]>(context, 'GET', '/workflows', {
		filter: { projectId, isArchived: false, triggerNodeTypes: SUPPORTED_WORKFLOW_TOOL_TRIGGERS },
		select: JSON.stringify(['id', 'name']),
		take: BINDABLE_WORKFLOW_LIMIT,
		sortBy: 'name:asc',
	});
	return data;
}

async function listBindableDataTables(context: IRestApiContext, projectId: string) {
	const { data } = await makeRestApiRequest<{ data: BindableResource[] }>(
		context,
		'GET',
		`/projects/${projectId}/data-tables`,
		{ take: BINDABLE_RESOURCE_LIMIT, sortBy: 'name:asc' },
	);
	return data;
}

async function listBindableAgents(context: IRestApiContext, projectId: string) {
	const { data } = await getFullApiResponse<BindableResource[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2`,
		{ take: BINDABLE_RESOURCE_LIMIT, sortBy: 'name:asc' },
	);
	return data;
}

const BINDABLE_RESOURCE_LISTS = {
	workflow: listBindableWorkflows,
	dataTable: listBindableDataTables,
	agent: listBindableAgents,
} satisfies Record<
	AppBindingKind,
	(context: IRestApiContext, projectId: string) => Promise<BindableResource[]>
>;

export async function listBindableResources(
	context: IRestApiContext,
	projectId: string,
	kind: AppBindingKind,
): Promise<BindableResource[]> {
	const resources = await BINDABLE_RESOURCE_LISTS[kind](context, projectId);
	return resources.map(({ id, name }) => ({ id, name }));
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
