import type { AppPreviewStatus } from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import type {
	App,
	AppPublishResult,
	AppTheme,
	AppVersion,
	Page,
	UpdateAppInput,
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

/** Starts (or keeps alive) the app's dev server in the thread's sandbox. */
export const ensureAppPreviewApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	threadId: string,
) => {
	return await makeRestApiRequest<AppPreviewStatus>(
		context,
		'POST',
		`/projects/${projectId}/apps/${appId}/preview`,
		{ threadId },
	);
};

/** Builds the newest source and makes it the served version; with `threadId` the thread's draft is stored first. */
export const publishAppApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	threadId?: string,
) => {
	return await makeRestApiRequest<AppPublishResult>(
		context,
		'POST',
		`/projects/${projectId}/apps/${appId}/publish`,
		threadId ? { threadId } : {},
	);
};

/** Newest first. */
export const fetchAppVersionsApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
) => {
	return await makeRestApiRequest<AppVersion[]>(
		context,
		'GET',
		`/projects/${projectId}/apps/${appId}/versions`,
	);
};

/** Serves a stored built version again; `null` unpublishes the app. */
export const setActiveAppVersionApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	versionId: string | null,
) => {
	return await makeRestApiRequest<App>(
		context,
		'PATCH',
		`/projects/${projectId}/apps/${appId}/active-version`,
		{ versionId },
	);
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
