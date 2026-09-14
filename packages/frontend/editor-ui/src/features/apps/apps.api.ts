import type { AppLayoutPresetId } from '@n8n/api-types';
import { makeRestApiRequest, rawRequest } from '@n8n/rest-api-client';
import { jsonParse } from 'n8n-workflow';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	App,
	AppVersionSummary,
	LayoutPreview,
	Page,
	PagePreview,
	PreviewParams,
	RenderErrors,
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
	layoutPreset: AppLayoutPresetId,
) => {
	return await makeRestApiRequest<App>(context, 'POST', `/projects/${projectId}/apps`, {
		name,
		namespace,
		layoutPreset,
	});
};

/** The stylesheet every served page loads, from its public route; the editor canvas applies it scoped. */
export const fetchServedCssApi = async (baseUrl: string): Promise<string> => {
	const response = await rawRequest({
		method: 'GET',
		baseURL: baseUrl,
		endpoint: '/apps/_static/app.css',
	});
	return String(response.data);
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
	title?: string,
) => {
	return await makeRestApiRequest<Page>(
		context,
		'POST',
		`/projects/${projectId}/apps/${appId}/pages`,
		{ route, ...(parentPageId ? { parentPageId } : {}), ...(title ? { title } : {}) },
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

export const fetchLayoutPreviewApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	pageId: string,
) => {
	return await makeRestApiRequest<LayoutPreview>(
		context,
		'GET',
		`/projects/${projectId}/apps/${appId}/pages/${pageId}/layout-preview`,
	);
};

const RENDER_ERRORS_HEADER = 'x-n8n-app-render-errors';
const CODE_HEADER = 'x-n8n-app-code';

/**
 * Draft preview HTML for a page (`text/html`), fetched through the session so
 * `srcdoc` never has to navigate the iframe to a REST URL. `makeRestApiRequest`
 * assumes every response body is JSON wrapped in a `data` key, which an HTML
 * response isn't, so this calls the lower-level `rawRequest` directly; the
 * render errors and the one-time code travel in headers next to the body, so
 * neither ever lands in the HTML.
 */
export const fetchPreviewApi = async (
	context: IRestApiContext,
	projectId: string,
	appId: string,
	pageId: string,
	{ path, params }: PreviewParams,
): Promise<PagePreview> => {
	const query = new URLSearchParams({ path });
	if (params && Object.keys(params).length > 0) {
		query.set('params', JSON.stringify(params));
	}
	const response = await rawRequest({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: `/projects/${projectId}/apps/${appId}/pages/${pageId}/preview?${query.toString()}`,
		headers: { 'push-ref': context.pushRef },
	});
	const errorsHeader: unknown = response.headers[RENDER_ERRORS_HEADER];
	const codeHeader: unknown = response.headers[CODE_HEADER];
	return {
		html: String(response.data),
		errors: typeof errorsHeader === 'string' ? jsonParse<RenderErrors>(errorsHeader) : {},
		code: typeof codeHeader === 'string' ? codeHeader : null,
	};
};
