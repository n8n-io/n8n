import type {
	CreatePageDto,
	Page,
	PageBacklinks,
	PageListItem,
	PageNodeReferences,
	PageOverview,
	PageResourceReference,
	PageSummary,
	UpdatePageDto,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export async function listPages(
	context: IRestApiContext,
	projectId: string,
): Promise<PageSummary[]> {
	return await makeRestApiRequest(context, 'GET', `/projects/${projectId}/pages`);
}

export async function getPage(
	context: IRestApiContext,
	projectId: string,
	pageId: string,
): Promise<Page> {
	return await makeRestApiRequest(context, 'GET', `/projects/${projectId}/pages/${pageId}`);
}

/** Reads a page without its project id. The server answers 404 when the user cannot read it. */
export async function getPageById(context: IRestApiContext, pageId: string): Promise<Page> {
	return await makeRestApiRequest(context, 'GET', `/pages/${pageId}`);
}

export async function createPage(
	context: IRestApiContext,
	projectId: string,
	page: CreatePageDto,
): Promise<Page> {
	return await makeRestApiRequest(context, 'POST', `/projects/${projectId}/pages`, page);
}

/** The server answers 409 when `changes.baseVersion` is not the latest version of the page. */
export async function updatePage(
	context: IRestApiContext,
	projectId: string,
	pageId: string,
	changes: UpdatePageDto,
): Promise<Page> {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`/projects/${projectId}/pages/${pageId}`,
		changes,
	);
}

export async function deletePage(
	context: IRestApiContext,
	projectId: string,
	pageId: string,
): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `/projects/${projectId}/pages/${pageId}`);
}

/** Lists the pages that link to a resource, in every project that the user can read. */
export async function listReferencingPages(
	context: IRestApiContext,
	reference: Pick<PageResourceReference, 'resourceType' | 'resourceId'>,
): Promise<PageSummary[]> {
	return await makeRestApiRequest(context, 'GET', '/pages/referencing', {
		resourceType: reference.resourceType,
		resourceId: reference.resourceId,
	});
}

/**
 * Lists the pages of every project that the user can read, the most recently updated first.
 * The server returns at most 200 pages. `query` keeps the titles that contain it.
 */
export async function listAllPages(
	context: IRestApiContext,
	query?: string,
): Promise<PageListItem[]> {
	return await makeRestApiRequest(context, 'GET', '/pages', query ? { query } : undefined);
}

/** Lists the nodes of a workflow that a readable page links to, each with its pages. */
export async function listNodeReferences(
	context: IRestApiContext,
	workflowId: string,
): Promise<PageNodeReferences[]> {
	return await makeRestApiRequest(context, 'GET', '/pages/node-references', { workflowId });
}

/**
 * Lists the pages that link to a page, and the sticky notes that show it.
 * The server answers 404 when the user cannot read the page.
 */
export async function getPageBacklinks(
	context: IRestApiContext,
	pageId: string,
): Promise<PageBacklinks> {
	return await makeRestApiRequest(context, 'GET', `/pages/${pageId}/backlinks`);
}

/**
 * Reads the documentation overview: each workflow with the page that documents it.
 * Without `projectId` the overview spans every project where the user can list pages.
 */
export async function getPageOverview(
	context: IRestApiContext,
	projectId?: string,
): Promise<PageOverview> {
	return await makeRestApiRequest(
		context,
		'GET',
		projectId === undefined ? '/pages/overview' : `/projects/${projectId}/pages/overview`,
	);
}
