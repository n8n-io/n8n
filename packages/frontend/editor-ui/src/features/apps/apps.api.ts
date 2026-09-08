import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import type {
	App,
	AppTheme,
	DataWorkflowOption,
	Page,
	UpdateAppInput,
	UpdatePageInput,
} from '@/features/apps/apps.types';

export const fetchAppsApi = async (context: IRestApiContext, projectId: string) => {
	return await makeRestApiRequest<App[]>(context, 'GET', `/projects/${projectId}/apps`);
};

export const getAppApi = async (context: IRestApiContext, projectId: string, appId: string) => {
	return await makeRestApiRequest<App>(context, 'GET', `/projects/${projectId}/apps/${appId}`);
};

export const createAppApi = async (
	context: IRestApiContext,
	projectId: string,
	name: string,
	namespace: string,
) => {
	return await makeRestApiRequest<App>(context, 'POST', `/projects/${projectId}/apps`, {
		name,
		namespace,
	});
};

export const updateAppApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	updates: UpdateAppInput,
) => {
	return await makeRestApiRequest<App>(context, 'PATCH', `/projects/${projectId}/apps/${appId}`, {
		...updates,
	});
};

/** Persists the theme and rebuilds the app so the served version carries it; can take a while on a cold sandbox. */
export const applyAppThemeApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	theme: AppTheme,
) => {
	return await makeRestApiRequest<App>(
		context,
		'POST',
		`/projects/${projectId}/apps/${appId}/theme`,
		{ theme },
	);
};

export const deleteAppApi = async (context: IRestApiContext, projectId: string, appId: string) => {
	await makeRestApiRequest(context, 'DELETE', `/projects/${projectId}/apps/${appId}`);
};

export const fetchPagesApi = async (context: IRestApiContext, projectId: string, appId: string) => {
	return await makeRestApiRequest<Page[]>(
		context,
		'GET',
		`/projects/${projectId}/apps/${appId}/pages`,
	);
};

export const createPageApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	route: string,
	parentPageId?: string,
) => {
	return await makeRestApiRequest<Page>(
		context,
		'POST',
		`/projects/${projectId}/apps/${appId}/pages`,
		{ route, ...(parentPageId ? { parentPageId } : {}) },
	);
};

export const updatePageApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	pageId: string,
	updates: UpdatePageInput,
) => {
	return await makeRestApiRequest<Page>(
		context,
		'PATCH',
		`/projects/${projectId}/apps/${appId}/pages/${pageId}`,
		{ ...updates },
	);
};

export const fetchDataWorkflowsApi = async (context: IRestApiContext, projectId: string) => {
	return await makeRestApiRequest<DataWorkflowOption[]>(
		context,
		'GET',
		`/projects/${projectId}/apps/data-workflows`,
	);
};

export const deletePageApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	pageId: string,
) => {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/projects/${projectId}/apps/${appId}/pages/${pageId}`,
	);
};
