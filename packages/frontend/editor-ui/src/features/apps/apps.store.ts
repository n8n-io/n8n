import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
	applyAppThemeApi,
	createAppApi,
	deleteAppApi,
	fetchAppsApi,
	fetchRoutesApi,
	getAppApi,
	publishAppApi,
	updateAppApi,
} from '@/features/apps/apps.api';
import { APPS_STORE } from '@/features/apps/apps.constants';
import type { App, AppTheme, Page, UpdateAppInput } from '@/features/apps/apps.types';

export const useAppsStore = defineStore(APPS_STORE, () => {
	const rootStore = useRootStore();

	const apps = ref<App[]>([]);
	const pages = ref<Page[]>([]);

	const fetchApps = async (projectId: string) => {
		apps.value = await fetchAppsApi(rootStore.restApiContext, projectId);
	};

	const getApp = async (projectId: string, appId: string) => {
		return await getAppApi(rootStore.restApiContext, projectId, appId);
	};

	const createApp = async (projectId: string, name: string, namespace: string) => {
		const app = await createAppApi(rootStore.restApiContext, projectId, name, namespace);
		apps.value = [...apps.value, app];
		return app;
	};

	const updateApp = async (projectId: string, appId: string, updates: UpdateAppInput) => {
		const updated = await updateAppApi(rootStore.restApiContext, projectId, appId, updates);
		apps.value = apps.value.map((a) => (a.id === appId ? updated : a));
		return updated;
	};

	const applyAppTheme = async (projectId: string, appId: string, theme: AppTheme) => {
		const updated = await applyAppThemeApi(rootStore.restApiContext, projectId, appId, theme);
		apps.value = apps.value.map((a) => (a.id === appId ? updated : a));
		return updated;
	};

	const publishApp = async (projectId: string, appId: string, threadId?: string) => {
		return await publishAppApi(rootStore.restApiContext, projectId, appId, threadId);
	};

	const deleteApp = async (projectId: string, appId: string) => {
		await deleteAppApi(rootStore.restApiContext, projectId, appId);
		apps.value = apps.value.filter((app) => app.id !== appId);
	};

	const fetchPages = async (projectId: string, appId: string) => {
		pages.value = await fetchRoutesApi(rootStore.restApiContext, projectId, appId);
	};

	return {
		apps,
		pages,
		fetchApps,
		getApp,
		createApp,
		updateApp,
		applyAppTheme,
		publishApp,
		deleteApp,
		fetchPages,
	};
});
