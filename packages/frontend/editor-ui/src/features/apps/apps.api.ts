import { makeRestApiRequest, request } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	App,
	AppVersionSummary,
	Page,
	PreviewParams,
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

export const deleteAppApi = async (context: IRestApiContext, projectId: string, appId: string) => {
	return await makeRestApiRequest<void>(context, 'DELETE', `/projects/${projectId}/apps/${appId}`);
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

export const deletePageApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	pageId: string,
) => {
	return await makeRestApiRequest<void>(
		context,
		'DELETE',
		`/projects/${projectId}/apps/${appId}/pages/${pageId}`,
	);
};

export const publishAppApi = async (context: IRestApiContext, projectId: string, appId: string) => {
	return await makeRestApiRequest<{ versionId: string; url: string }>(
		context,
		'POST',
		`/projects/${projectId}/apps/${appId}/publish`,
	);
};

export const fetchVersionsApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
) => {
	return await makeRestApiRequest<AppVersionSummary[]>(
		context,
		'GET',
		`/projects/${projectId}/apps/${appId}/versions`,
	);
};

export const activateVersionApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	versionId: string,
) => {
	return await makeRestApiRequest<App>(
		context,
		'POST',
		`/projects/${projectId}/apps/${appId}/versions/${versionId}/activate`,
	);
};

/**
 * Draft preview HTML for a page (`text/html`), fetched through the session so
 * `srcdoc` never has to navigate the iframe to a REST URL. `makeRestApiRequest`
 * assumes every response body is JSON wrapped in a `data` key, which an HTML
 * response isn't, so this calls the lower-level `request` directly.
 */
export const fetchPreviewApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	pageId: string,
	{ path, params }: PreviewParams,
): Promise<string> => {
	const query = new URLSearchParams({ path });
	if (params && Object.keys(params).length > 0) {
		query.set('params', JSON.stringify(params));
	}
	return await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: `/projects/${projectId}/apps/${appId}/pages/${pageId}/preview?${query.toString()}`,
		headers: { 'push-ref': context.pushRef },
	});
};
