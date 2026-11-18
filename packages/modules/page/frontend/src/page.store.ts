import type {
	Page,
	PageBacklinks,
	PageListItem,
	PageNodeReferences,
	PageOverview,
	PageResourceReference,
	PageSummary,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import * as pageApi from './page.api';

type PageChanges = { title?: string; content?: string; baseVersion: number };

function toSummary({ content: _content, ...summary }: Page): PageSummary {
	return summary;
}

/** Replaces the summary with the same id and keeps its position. A new summary goes first. */
function upsertSummary(summaries: PageSummary[], summary: PageSummary): PageSummary[] {
	const isKnown = summaries.some(({ id }) => id === summary.id);
	return isKnown
		? summaries.map((existing) => (existing.id === summary.id ? summary : existing))
		: [summary, ...summaries];
}

/** The key of the overview that spans every readable project. A project id is never empty. */
const ALL_PROJECTS_OVERVIEW_KEY = '';

/** Gives the key that holds the overview of a project. No project means every readable project. */
function toOverviewKey(projectId: string | undefined): string {
	return projectId ?? ALL_PROJECTS_OVERVIEW_KEY;
}

export const usePageStore = defineStore('page', () => {
	const rootStore = useRootStore();

	/** The page list of each project that was loaded, newest first. */
	const summariesByProjectId = ref<Record<string, PageSummary[]>>({});

	/** The latest version of each page that this client read or wrote. */
	const pagesById = ref<Record<string, Page>>({});

	/** The latest documentation overview that was loaded, by overview key. */
	const overviewsByKey = ref<Record<string, PageOverview>>({});

	/** `undefined` means that the overview was not loaded. No project means every readable project. */
	function overviewOf(projectId?: string): PageOverview | undefined {
		return overviewsByKey.value[toOverviewKey(projectId)];
	}

	async function fetchOverview(projectId?: string): Promise<PageOverview> {
		const overview = await pageApi.getPageOverview(rootStore.restApiContext, projectId);
		overviewsByKey.value = { ...overviewsByKey.value, [toOverviewKey(projectId)]: overview };
		return overview;
	}

	function pagesOf(projectId: string): PageSummary[] {
		return summariesByProjectId.value[projectId] ?? [];
	}

	function isListLoaded(projectId: string): boolean {
		return summariesByProjectId.value[projectId] !== undefined;
	}

	/** Keeps a page that the server returned. A loaded project list gets the new summary. */
	function rememberPage(page: Page): Page {
		pagesById.value = { ...pagesById.value, [page.id]: page };
		if (isListLoaded(page.projectId)) {
			summariesByProjectId.value = {
				...summariesByProjectId.value,
				[page.projectId]: upsertSummary(pagesOf(page.projectId), toSummary(page)),
			};
		}
		return page;
	}

	function forgetPage(projectId: string, pageId: string): void {
		const { [pageId]: _removed, ...remainingPages } = pagesById.value;
		pagesById.value = remainingPages;
		if (isListLoaded(projectId)) {
			summariesByProjectId.value = {
				...summariesByProjectId.value,
				[projectId]: pagesOf(projectId).filter(({ id }) => id !== pageId),
			};
		}
	}

	async function fetchPages(projectId: string): Promise<PageSummary[]> {
		const summaries = await pageApi.listPages(rootStore.restApiContext, projectId);
		summariesByProjectId.value = { ...summariesByProjectId.value, [projectId]: summaries };
		return summaries;
	}

	async function fetchPage(projectId: string, pageId: string): Promise<Page> {
		return rememberPage(await pageApi.getPage(rootStore.restApiContext, projectId, pageId));
	}

	/** Reads a page when its project is not known. */
	async function fetchPageById(pageId: string): Promise<Page> {
		return rememberPage(await pageApi.getPageById(rootStore.restApiContext, pageId));
	}

	async function createPage(
		projectId: string,
		page: { title: string; content?: string },
	): Promise<Page> {
		return rememberPage(await pageApi.createPage(rootStore.restApiContext, projectId, page));
	}

	/**
	 * Saves changes that the user made on version `changes.baseVersion` of the page.
	 * Rejects with HTTP status 409 when the server holds a newer version.
	 */
	async function updatePage(
		projectId: string,
		pageId: string,
		changes: PageChanges,
	): Promise<Page> {
		return rememberPage(
			await pageApi.updatePage(rootStore.restApiContext, projectId, pageId, changes),
		);
	}

	async function deletePage(projectId: string, pageId: string): Promise<void> {
		await pageApi.deletePage(rootStore.restApiContext, projectId, pageId);
		forgetPage(projectId, pageId);
	}

	async function listReferencing(
		reference: Pick<PageResourceReference, 'resourceType' | 'resourceId'>,
	): Promise<PageSummary[]> {
		return await pageApi.listReferencingPages(rootStore.restApiContext, reference);
	}

	/** Lists the pages of every readable project. `query` keeps the titles that contain it. */
	async function listAll(query?: string): Promise<PageListItem[]> {
		return await pageApi.listAllPages(rootStore.restApiContext, query);
	}

	async function listNodeReferences(workflowId: string): Promise<PageNodeReferences[]> {
		return await pageApi.listNodeReferences(rootStore.restApiContext, workflowId);
	}

	async function backlinksOf(pageId: string): Promise<PageBacklinks> {
		return await pageApi.getPageBacklinks(rootStore.restApiContext, pageId);
	}

	return {
		summariesByProjectId,
		pagesById,
		pagesOf,
		isListLoaded,
		fetchPages,
		fetchPage,
		fetchPageById,
		createPage,
		updatePage,
		deletePage,
		listReferencing,
		listAll,
		listNodeReferences,
		backlinksOf,
		overviewOf,
		fetchOverview,
	};
});
