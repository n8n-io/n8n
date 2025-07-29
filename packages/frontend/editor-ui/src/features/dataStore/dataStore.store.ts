import { defineStore } from 'pinia';
import { DATA_STORE_VIEW, PROJECT_DATA_STORES } from './constants';
import { registerResource } from '@/features/resourceRegistry';
import { createModuleTabs } from '@/utils/module/tabHelper';
import type { ModuleInitializer } from '@/utils/module/registry';

export const useDataStoreStore = defineStore('dataStore', () => {
	const initialize = () => {
		// Register the resource type
		registerResource({
			key: 'dataStore',
			displayName: 'Data Store',
		});

		// Register tabs using the helper
		createModuleTabs('data-store', {
			overview: {
				labelKey: 'dataStore.tab.label',
				routeName: DATA_STORE_VIEW,
			},
			project: {
				labelKey: 'dataStore.tab.label',
				routeName: PROJECT_DATA_STORES,
				includeProjectId: true,
			},
		});
	};

	return {
		initialize,
	};
});

// Module definition for future registry use
export const dataStoreModule: ModuleInitializer = {
	moduleName: 'data-store',
	initialize: () => useDataStoreStore().initialize(),
	resources: [
		{
			key: 'dataStore',
			displayName: 'Data Store',
		},
	],
	tabs: {
		overview: {
			labelKey: 'dataStore.tab.label',
			routeName: DATA_STORE_VIEW,
		},
		project: {
			labelKey: 'dataStore.tab.label',
			routeName: PROJECT_DATA_STORES,
			includeProjectId: true,
		},
	},
};
