import type { AppPreviewStatus, DescribedBinding, InstanceAiThreadInfo } from '@n8n/api-types';
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

/** Saves the theme into the app's draft; a running dev server shows it right away. Nothing is published. */
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

/** Starts (or keeps alive) the app's dev server in the app's sandbox. */
export const ensureAppPreviewApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
) => {
	return await makeRestApiRequest<AppPreviewStatus>(
		context,
		'POST',
		`/projects/${projectId}/apps/${appId}/preview`,
	);
};

/** Builds the newest source and makes it the served version; the app sandbox's draft is stored first. */
export const publishAppApi = async (context: IRestApiContext, projectId: string, appId: string) => {
	return await makeRestApiRequest<AppPublishResult>(
		context,
		'POST',
		`/projects/${projectId}/apps/${appId}/publish`,
	);
};

/** Newest first. */
/** The caller's assistant threads that build the app, newest activity first. */
export const fetchAppThreadsApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
) => {
	const { threads } = await makeRestApiRequest<{ threads: InstanceAiThreadInfo[] }>(
		context,
		'GET',
		`/projects/${projectId}/apps/${appId}/threads`,
	);
	return threads;
};

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

export const fetchAppVersionFilesApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	versionId: string,
) => {
	return await makeRestApiRequest<string[]>(
		context,
		'GET',
		`/projects/${projectId}/apps/${appId}/versions/${versionId}/files`,
	);
};

export const fetchAppVersionFileContentApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	versionId: string,
	filePath: string,
) => {
	// Each segment is encoded on its own so a `/` inside the path keeps routing
	// to the right file, not a `%2F` the server would reject.
	const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
	const { content } = await makeRestApiRequest<{ content: string }>(
		context,
		'GET',
		`/projects/${projectId}/apps/${appId}/versions/${versionId}/files/${encodedPath}`,
	);
	return content;
};

/** Overwrites one existing source file and rebuilds the app; returns the app with its new active version. */
export const saveAppVersionFileContentApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	versionId: string,
	filePath: string,
	content: string,
) => {
	const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
	return await makeRestApiRequest<App>(
		context,
		'PUT',
		`/projects/${projectId}/apps/${appId}/versions/${versionId}/files/${encodedPath}`,
		{ content },
	);
};
