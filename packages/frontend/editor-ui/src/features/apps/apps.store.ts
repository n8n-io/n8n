import type { AppLayoutPresetId } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
	activateVersionApi,
	createAppApi,
	createPageApi,
	deleteAppApi,
	deletePageApi,
	fetchAppsApi,
	fetchLayoutPreviewApi,
	fetchPagesApi,
	fetchPreviewApi,
	fetchServedCssApi,
	fetchVersionsApi,
	getAppApi,
	publishAppApi,
	updateAppApi,
	updatePageApi,
} from '@/features/apps/apps.api';
import { APPS_STORE } from '@/features/apps/apps.constants';
import type {
	App,
	Page,
	PreviewParams,
	UpdateAppInput,
	UpdatePageInput,
} from '@/features/apps/apps.types';

export const useAppsStore = defineStore(APPS_STORE, () => {
	const rootStore = useRootStore();

	const apps = ref<App[]>([]);
	/** The app open in the builder; block editors read its `components`. */
	const app = ref<App | null>(null);
	const pages = ref<Page[]>([]);
	const servedCss = ref<string | null>(null);

	const fetchApps = async (projectId: string) => {
		apps.value = await fetchAppsApi(rootStore.restApiContext, projectId);
	};

	const getApp = async (projectId: string, appId: string) => {
		app.value = await getAppApi(rootStore.restApiContext, projectId, appId);
		return app.value;
	};

	const createApp = async (
		projectId: string,
		name: string,
		namespace: string,
		layoutPreset: AppLayoutPresetId,
	) => {
		const app = await createAppApi(
			rootStore.restApiContext,
			projectId,
			name,
			namespace,
			layoutPreset,
		);
		apps.value = [...apps.value, app];
		return app;
	};

	/** Fetched once per session: the build artifact does not change while the editor runs. */
	const fetchServedCss = async () => {
		servedCss.value ??= await fetchServedCssApi(rootStore.baseUrl);
		return servedCss.value;
	};

	const updateApp = async (projectId: string, appId: string, updates: UpdateAppInput) => {
		const updated = await updateAppApi(rootStore.restApiContext, projectId, appId, updates);
		if (app.value?.id === appId) app.value = updated;
		return updated;
	};

	const deleteApp = async (projectId: string, appId: string) => {
		await deleteAppApi(rootStore.restApiContext, projectId, appId);
		apps.value = apps.value.filter((app) => app.id !== appId);
	};

	const fetchPages = async (projectId: string, appId: string) => {
		pages.value = await fetchPagesApi(rootStore.restApiContext, projectId, appId);
	};

	const createPage = async (
		projectId: string,
		appId: string,
		route: string,
		parentPageId?: string,
		title?: string,
	) => {
		const page = await createPageApi(
			rootStore.restApiContext,
			projectId,
			appId,
			route,
			parentPageId,
			title,
		);
		pages.value = [...pages.value, page];
		return page;
	};

	const updatePage = async (
		projectId: string,
		appId: string,
		pageId: string,
		updates: UpdatePageInput,
	) => {
		const page = await updatePageApi(rootStore.restApiContext, projectId, appId, pageId, updates);
		pages.value = pages.value.map((p) => (p.id === pageId ? page : p));
		return page;
	};

	const deletePage = async (projectId: string, appId: string, pageId: string) => {
		await deletePageApi(rootStore.restApiContext, projectId, appId, pageId);
		// Refetch rather than filter locally: deleting a page cascades to its
		// sub-pages on the backend, and a shallow filter would leave those
		// orphaned rows in the local list.
		await fetchPages(projectId, appId);
	};

	const publish = async (projectId: string, appId: string) => {
		return await publishAppApi(rootStore.restApiContext, projectId, appId);
	};

	const fetchVersions = async (projectId: string, appId: string) => {
		return await fetchVersionsApi(rootStore.restApiContext, projectId, appId);
	};

	const activateVersion = async (projectId: string, appId: string, versionId: string) => {
		return await activateVersionApi(rootStore.restApiContext, projectId, appId, versionId);
	};

	const fetchPreview = async (
		projectId: string,
		appId: string,
		pageId: string,
		options: PreviewParams,
	) => {
		return await fetchPreviewApi(rootStore.restApiContext, projectId, appId, pageId, options);
	};

	const fetchLayoutPreview = async (projectId: string, appId: string, pageId: string) => {
		return await fetchLayoutPreviewApi(rootStore.restApiContext, projectId, appId, pageId);
	};

	return {
		apps,
		app,
		pages,
		servedCss,
		fetchApps,
		getApp,
		createApp,
		fetchServedCss,
		updateApp,
		deleteApp,
		fetchPages,
		createPage,
		updatePage,
		deletePage,
		publish,
		fetchVersions,
		activateVersion,
		fetchPreview,
		fetchLayoutPreview,
	};
});
