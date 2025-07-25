import { defineStore } from 'pinia';
import { useModulesStore } from '../modules.store';
import type { TabOptions } from '@n8n/design-system';
import { DATA_STORE_VIEW, PROJECT_DATA_STORES } from './constants';
import { useI18n } from '@n8n/i18n';
import { useProjectsStore } from '@/stores/projects.store';

export const useDataStoreStore = defineStore('dataStore', () => {
	const modulesStore = useModulesStore();
	const projectsStore = useProjectsStore();

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
		const homeProject = projectsStore.currentProject ?? projectsStore.personalProject;
		modulesStore.addProjectPageTabs([
			{
				label: i18n.baseText('dataStore.tab.label'),
				value: PROJECT_DATA_STORES,
				to: {
					name: PROJECT_DATA_STORES,
					params: {
						projectId: homeProject?.id,
					},
				},
			},
		]);
	};

	const initialize = () => {
		registerOverviewPageTabs();
		registerProjectPageTabs();
	};

	return {
		initialize,
	};
});
