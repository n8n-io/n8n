import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
import {
	DATA_STORE_DETAILS,
	DATA_STORE_VIEW,
	PROJECT_DATA_STORES,
} from '@/features/dataStore/constants';
import { useSettingsStore } from '@/stores/settings.store';

const MainSidebar = async () => await import('@/components/MainSidebar.vue');
const DataStoreView = async () => await import('@/features/dataStore/DataStoreView.vue');

export const checkModuleAvailability = (to?: RouteLocationNormalized): boolean => {
	if (!to?.meta?.moduleName || typeof to.meta.moduleName !== 'string') {
		return true;
	}
	return useSettingsStore().isModuleActive(to.meta.moduleName);
};

export const dataStoreRoutes: RouteRecordRaw[] = [
	{
		name: DATA_STORE_VIEW,
		path: '/home/datastores',
		components: {
			default: DataStoreView,
			sidebar: MainSidebar,
		},
		meta: {
			moduleName: 'data-store',
			middleware: ['authenticated', 'custom'],
			middlewareOptions: {
				custom: (options) => checkModuleAvailability(options?.to),
			},
		},
	},
	{
		name: PROJECT_DATA_STORES,
		path: 'datastores',
		props: true,
		components: {
			default: DataStoreView,
			sidebar: MainSidebar,
		},
		meta: {
			moduleName: 'data-store',
			projectRoute: true,
			middleware: ['authenticated', 'custom'],
			middlewareOptions: {
				custom: (options) => checkModuleAvailability(options?.to),
			},
		},
	},
	{
		name: DATA_STORE_DETAILS,
		path: 'datastores/:id',
		props: true,
		components: {
			default: DataStoreView,
			sidebar: MainSidebar,
		},
		meta: {
			moduleName: 'data-store',
			projectRoute: true,
			middleware: ['authenticated', 'custom'],
			middlewareOptions: {
				custom: (options) => checkModuleAvailability(options?.to),
			},
		},
	},
];
