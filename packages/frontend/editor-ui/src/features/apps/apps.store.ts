import type { DescribedBinding } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
	applyAppThemeApi,
	createAppApi,
	deleteAppApi,
	fetchAppsApi,
	fetchBindingsApi,
	fetchRoutesApi,
	getAppApi,
	updateAppApi,
} from '@/features/apps/apps.api';
import { APPS_STORE } from '@/features/apps/apps.constants';
import type { App, AppTheme, Page, UpdateAppInput } from '@/features/apps/apps.types';

export const useAppsStore = defineStore(APPS_STORE, () => {
	const rootStore = useRootStore();

	const apps = ref<App[]>([]);
	const pages = ref<Page[]>([]);
	const bindings = ref<DescribedBinding[]>([]);
	const bindingWarnings = ref<string[]>([]);

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

	const deleteApp = async (projectId: string, appId: string) => {
		await deleteAppApi(rootStore.restApiContext, projectId, appId);
		apps.value = apps.value.filter((app) => app.id !== appId);
	};

	const fetchPages = async (projectId: string, appId: string) => {
		pages.value = await fetchRoutesApi(rootStore.restApiContext, projectId, appId);
	};

	const fetchBindings = async (projectId: string, appId: string) => {
		const described = await fetchBindingsApi(rootStore.restApiContext, projectId, appId);
		bindings.value = described.bindings;
		bindingWarnings.value = described.warnings;
	};

	return {
		apps,
		pages,
		bindings,
		bindingWarnings,
		fetchApps,
		getApp,
		createApp,
		updateApp,
		applyAppTheme,
		deleteApp,
		fetchPages,
		fetchBindings,
	};
});
