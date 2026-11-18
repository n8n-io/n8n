import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { DocPage, DocPageResourceType } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as api from './docPages.api';

export const useDocPagesStore = defineStore('docPages', () => {
	const rootStore = useRootStore();
	const ctx = () => rootStore.restApiContext;

	/** The page that `DocPageView` shows. */
	const currentPage = ref<DocPage | null>(null);

	const setIfCurrent = (page: DocPage) => {
		if (currentPage.value?.id === page.id) currentPage.value = page;
		return page;
	};

	const fetchOverview = async () => await api.getOverview(ctx());

	const search = async (q: string) => await api.searchPages(ctx(), q);

	const fetchProjectPages = async (projectId: string) =>
		await api.listProjectPages(ctx(), projectId);

	const ensurePage = async (resourceType: DocPageResourceType, resourceId: string) =>
		await api.ensurePage(ctx(), resourceType, resourceId);

	const loadPage = async (id: string) => {
		currentPage.value = await api.getPage(ctx(), id);
		return currentPage.value;
	};

	const updatePage = async (
		id: string,
		body: { title?: string; content?: Record<string, unknown> },
	) => setIfCurrent(await api.updatePage(ctx(), id, body));

	const createChildPage = async (parentId: string, title: string) => {
		const child = await api.createChildPage(ctx(), parentId, title);
		if (currentPage.value?.id === parentId) {
			currentPage.value.children = [
				...currentPage.value.children,
				{ id: child.id, title: child.title },
			];
		}
		return child;
	};

	const deletePage = async (id: string) => {
		await api.deletePage(ctx(), id);
		if (currentPage.value) {
			currentPage.value.children = currentPage.value.children.filter((c) => c.id !== id);
		}
	};

	const generatePage = async (id: string) => setIfCurrent(await api.generatePage(ctx(), id));

	const checkPage = async (id: string, markdown: string) =>
		(await api.checkPage(ctx(), id, markdown)).findings;

	const markPageCurrent = async (id: string) => setIfCurrent(await api.markPageCurrent(ctx(), id));

	return {
		currentPage,
		fetchOverview,
		search,
		fetchProjectPages,
		ensurePage,
		loadPage,
		updatePage,
		createChildPage,
		deletePage,
		generatePage,
		checkPage,
		markPageCurrent,
	};
});
