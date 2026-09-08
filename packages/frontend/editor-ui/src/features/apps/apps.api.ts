import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import type { App, DataWorkflowOption, Page, UpdatePageInput } from '@/features/apps/apps.types';

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
