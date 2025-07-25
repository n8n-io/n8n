import { defineStore } from 'pinia';
import { useModulesStore } from '../modules.store';
import type { TabOptions } from '@n8n/design-system';
import type { DynamicTabOptions } from '@/components/Projects/ProjectTabs.vue';
import { DATA_STORE_VIEW, PROJECT_DATA_STORES } from './constants';
import { useI18n } from '@n8n/i18n';
import { dataStoreRoutes } from './dataStore.routes';
import router from '@/router';
import { VIEWS } from '@/constants';

export const useDataStoreStore = defineStore('dataStore', () => {
	const modulesStore = useModulesStore();

	const i18n = useI18n();

	const registerOverviewPageTabs = () => {
		const tabs: Array<TabOptions<string>> = [
			{
				label: i18n.baseText('dataStore.tab.label'),
				value: DATA_STORE_VIEW,
				to: {
					name: DATA_STORE_VIEW,
				},
			},
		];
		modulesStore.addOverviewPageTabs(tabs);
	};

	const registerProjectPageTabs = () => {
		const dataStoreTab: DynamicTabOptions = {
			label: i18n.baseText('dataStore.tab.label'),
			value: PROJECT_DATA_STORES,
			dynamicRoute: {
				name: PROJECT_DATA_STORES,
				includeProjectId: true,
			},
		};
		modulesStore.addProjectPageTabs([dataStoreTab as TabOptions<string>]);
	};
	const registerOverviewRoute = () => {
		router.addRoute(dataStoreRoutes[0]);
	};

	const registerProjectRoutes = () => {
		router.addRoute(VIEWS.PROJECT_DETAILS, dataStoreRoutes[1]);
		router.addRoute(VIEWS.PROJECT_DETAILS, dataStoreRoutes[2]);
	};

	const initialize = () => {
		registerOverviewRoute();
		registerProjectRoutes();
		registerOverviewPageTabs();
		registerProjectPageTabs();
	};

	return {
		initialize,
	};
});
