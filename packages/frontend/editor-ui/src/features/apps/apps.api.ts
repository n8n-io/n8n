import type { DescribedBinding } from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import type { App, AppTheme, Page, UpdateAppInput } from '@/features/apps/apps.types';

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

/** The app's real pages, derived from its source — not the (unused) DB `Page` CRUD. */
export const fetchRoutesApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
) => {
	return await makeRestApiRequest<Page[]>(
		context,
		'GET',
		`/projects/${projectId}/apps/${appId}/routes`,
	);
};

type DescribedBindings = { bindings: DescribedBinding[]; warnings: string[] };

export const fetchBindingsApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
) => {
	return await makeRestApiRequest<DescribedBindings>(
		context,
		'GET',
		`/projects/${projectId}/apps/${appId}/bindings`,
	);
};

export const deleteBindingApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	key: string,
) => {
	return await makeRestApiRequest<DescribedBindings>(
		context,
		'DELETE',
		`/projects/${projectId}/apps/${appId}/bindings/${key}`,
	);
};
