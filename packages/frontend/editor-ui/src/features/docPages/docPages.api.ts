import type {
	DocCheckResponse,
	DocOverviewProject,
	DocPage,
	DocPageResourceType,
	DocPageSummary,
} from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

const BASE = '/doc-pages';

export const getOverview = async (context: IRestApiContext) =>
	await makeRestApiRequest<DocOverviewProject[]>(context, 'GET', `${BASE}/overview`);

export const searchPages = async (context: IRestApiContext, q: string) =>
	await makeRestApiRequest<DocPageSummary[]>(context, 'GET', `${BASE}/search`, { q });

export const listProjectPages = async (context: IRestApiContext, projectId: string) =>
	await makeRestApiRequest<DocPageSummary[]>(context, 'GET', `${BASE}/projects/${projectId}`);

export const ensurePage = async (
	context: IRestApiContext,
	resourceType: DocPageResourceType,
	resourceId: string,
) =>
	await makeRestApiRequest<DocPage>(context, 'POST', `${BASE}/ensure`, {
		resourceType,
		resourceId,
	});

export const getPage = async (context: IRestApiContext, id: string) =>
	await makeRestApiRequest<DocPage>(context, 'GET', `${BASE}/${id}`);

export const updatePage = async (
	context: IRestApiContext,
	id: string,
	body: { title?: string; content?: Record<string, unknown> },
) => await makeRestApiRequest<DocPage>(context, 'PATCH', `${BASE}/${id}`, body);

export const createChildPage = async (context: IRestApiContext, id: string, title: string) =>
	await makeRestApiRequest<DocPage>(context, 'POST', `${BASE}/${id}/children`, { title });

export const deletePage = async (context: IRestApiContext, id: string) =>
	await makeRestApiRequest<{ success: true }>(context, 'DELETE', `${BASE}/${id}`);

export const generatePage = async (context: IRestApiContext, id: string) =>
	await makeRestApiRequest<DocPage>(context, 'POST', `${BASE}/${id}/generate`);

export const checkPage = async (context: IRestApiContext, id: string, markdown: string) =>
	await makeRestApiRequest<DocCheckResponse>(context, 'POST', `${BASE}/${id}/check`, {
		markdown,
	});

export const markPageCurrent = async (context: IRestApiContext, id: string) =>
	await makeRestApiRequest<DocPage>(context, 'POST', `${BASE}/${id}/mark-current`);
