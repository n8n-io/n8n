import { toResourcePath, type PageSummary } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';

import {
	searchCredentials,
	searchDataTables,
	searchWorkflows,
	type ResourceSearchResult,
} from './resource.api';

export type ResourceSearchSources = {
	getContext: () => IRestApiContext;
	/** The project whose pages and data tables the search covers. */
	getProjectId: () => string | undefined;
	/** The pages of a project, newest first. */
	listPages: (projectId: string) => Promise<PageSummary[]>;
	/** How many results each resource type gives. */
	limit: number;
};

function toPageResult({ id, title }: PageSummary): ResourceSearchResult {
	return {
		resourceType: 'page',
		id,
		name: title,
		path: toResourcePath({ resourceType: 'page', resourceId: id }),
	};
}

function hasInName(query: string) {
	const needle = query.trim().toLowerCase();
	return ({ title }: PageSummary) => title.toLowerCase().includes(needle);
}

function toFulfilledValues<T>(results: Array<PromiseSettledResult<T[]>>): T[] {
	return results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
}

/**
 * Builds the search of the resources that a page can link to.
 * The results are grouped by type: workflows, pages, credentials, data tables.
 * A resource type whose request fails gives no result and does not fail the search.
 */
export function createResourceSearch({
	getContext,
	getProjectId,
	listPages,
	limit,
}: ResourceSearchSources) {
	async function searchPages(projectId: string, query: string) {
		const pages = await listPages(projectId);
		return pages.filter(hasInName(query)).slice(0, limit).map(toPageResult);
	}

	function searchProject(projectId: string | undefined, query: string) {
		return projectId
			? {
					pages: searchPages(projectId, query),
					dataTables: searchDataTables(getContext(), projectId, query, limit),
				}
			: { pages: Promise.resolve([]), dataTables: Promise.resolve([]) };
	}

	return async function searchResources(query: string): Promise<ResourceSearchResult[]> {
		const { pages, dataTables } = searchProject(getProjectId(), query);
		return toFulfilledValues(
			await Promise.allSettled([
				searchWorkflows(getContext(), query, limit),
				pages,
				searchCredentials(getContext(), query, limit),
				dataTables,
			]),
		);
	};
}
