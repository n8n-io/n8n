import type { AppBinding, DescribedBinding } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
	addBindingApi,
	applyAppThemeApi,
	createAppApi,
	deleteAppApi,
	deleteBindingApi,
	fetchAppThreadsApi,
	fetchAppVersionsApi,
	fetchAppsApi,
	fetchAppDraftFilesApi,
	fetchBindingsApi,
	fetchAppVersionFileContentApi,
	fetchRoutesApi,
	getAppApi,
	publishAppApi,
	setActiveAppVersionApi,
	restoreAppVersionApi,
	appVersionSourceUrl,
	saveAppDraftFileApi,
	updateAppApi,
	updateBindingApi,
} from '@/features/apps/apps.api';
import type { AppBindingPatch, ListAppsOptions } from '@/features/apps/apps.api';
import { APPS_STORE } from '@/features/apps/apps.constants';
import type {
	App,
	AppThemeSettings,
	AppVersion,
	Page,
	UpdateAppInput,
} from '@/features/apps/apps.types';

export const useAppsStore = defineStore(APPS_STORE, () => {
	const rootStore = useRootStore();

	const apps = ref<App[]>([]);
	const appsCount = ref(0);
	const pages = ref<Page[]>([]);
	const bindings = ref<DescribedBinding[]>([]);
	/** Owner of `bindings`; readers scoped to another app must ignore the list. */
	const bindingsAppId = ref<string | null>(null);
	const bindingWarnings = ref<string[]>([]);
	const versions = ref<AppVersion[]>([]);

	const fetchApps = async (projectId: string | undefined, options: ListAppsOptions) => {
		const { count, data } = await fetchAppsApi(rootStore.restApiContext, projectId, options);
		apps.value = data;
		appsCount.value = count;
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

	const applyAppTheme = async (projectId: string, appId: string, settings: AppThemeSettings) => {
		const updated = await applyAppThemeApi(rootStore.restApiContext, projectId, appId, settings);
		apps.value = apps.value.map((a) => (a.id === appId ? updated : a));
		return updated;
	};

	const publishApp = async (projectId: string, appId: string) => {
		return await publishAppApi(rootStore.restApiContext, projectId, appId);
	};

	const fetchThreads = async (projectId: string, appId: string) =>
		await fetchAppThreadsApi(rootStore.restApiContext, projectId, appId);

	const fetchVersions = async (projectId: string, appId: string) => {
		versions.value = await fetchAppVersionsApi(rootStore.restApiContext, projectId, appId);
	};

	const restoreVersion = async (projectId: string, appId: string, versionId: string) =>
		await restoreAppVersionApi(rootStore.restApiContext, projectId, appId, versionId);

	const versionSourceUrl = (projectId: string, appId: string, versionId: string) =>
		appVersionSourceUrl(rootStore.restApiContext, projectId, appId, versionId);

	const setActiveVersion = async (projectId: string, appId: string, versionId: string | null) => {
		const updated = await setActiveAppVersionApi(
			rootStore.restApiContext,
			projectId,
			appId,
			versionId,
		);
		apps.value = apps.value.map((a) => (a.id === appId ? updated : a));
		return updated;
	};

	const deleteApp = async (projectId: string, appId: string) => {
		await deleteAppApi(rootStore.restApiContext, projectId, appId);
		apps.value = apps.value.filter((app) => app.id !== appId);
		appsCount.value = Math.max(0, appsCount.value - 1);
	};

	const fetchPages = async (projectId: string, appId: string) => {
		pages.value = await fetchRoutesApi(rootStore.restApiContext, projectId, appId);
	};

	const setBindings = (
		appId: string,
		described: { bindings: DescribedBinding[]; warnings: string[] },
	) => {
		bindings.value = described.bindings;
		bindingsAppId.value = appId;
		bindingWarnings.value = described.warnings;
	};

	const fetchBindings = async (projectId: string, appId: string) => {
		setBindings(appId, await fetchBindingsApi(rootStore.restApiContext, projectId, appId));
	};

	const addBinding = async (projectId: string, appId: string, binding: AppBinding) => {
		setBindings(appId, await addBindingApi(rootStore.restApiContext, projectId, appId, binding));
	};

	const updateBinding = async (
		projectId: string,
		appId: string,
		key: string,
		patch: AppBindingPatch,
	) => {
		setBindings(
			appId,
			await updateBindingApi(rootStore.restApiContext, projectId, appId, key, patch),
		);
	};

	const deleteBinding = async (projectId: string, appId: string, key: string) => {
		setBindings(appId, await deleteBindingApi(rootStore.restApiContext, projectId, appId, key));
	};

	const fetchAppDraftFiles = async (projectId: string, appId: string) => {
		return await fetchAppDraftFilesApi(rootStore.restApiContext, projectId, appId);
	};

	const fetchAppVersionFileContent = async (
		projectId: string,
		appId: string,
		versionId: string,
		filePath: string,
	) => {
		return await fetchAppVersionFileContentApi(
			rootStore.restApiContext,
			projectId,
			appId,
			versionId,
			filePath,
		);
	};

	const saveAppDraftFile = async (
		projectId: string,
		appId: string,
		filePath: string,
		content: string,
	) => {
		const updated = await saveAppDraftFileApi(
			rootStore.restApiContext,
			projectId,
			appId,
			filePath,
			content,
		);
		apps.value = apps.value.map((a) => (a.id === appId ? updated : a));
		return updated;
	};

	return {
		apps,
		appsCount,
		pages,
		bindings,
		bindingsAppId,
		bindingWarnings,
		versions,
		fetchApps,
		getApp,
		createApp,
		updateApp,
		applyAppTheme,
		publishApp,
		fetchThreads,
		fetchVersions,
		restoreVersion,
		versionSourceUrl,
		setActiveVersion,
		deleteApp,
		fetchPages,
		fetchBindings,
		addBinding,
		updateBinding,
		deleteBinding,
		fetchAppDraftFiles,
		fetchAppVersionFileContent,
		saveAppDraftFile,
	};
});
