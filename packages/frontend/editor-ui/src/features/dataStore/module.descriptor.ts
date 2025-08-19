import { useI18n } from '@n8n/i18n';
import { type FrontendModuleDescription } from '@/moduleInitializer/module.types';
import {
	ADD_DATA_STORE_MODAL_KEY,
	DATA_STORE_DETAILS,
	DATA_STORE_VIEW,
	PROJECT_DATA_STORES,
} from '@/features/dataStore/constants';

const i18n = useI18n();

const MainSidebar = async () => await import('@/components/MainSidebar.vue');
const DataStoreView = async () => await import('@/features/dataStore/DataStoreView.vue');
const DataStoreDetailsView = async () =>
	await import('@/features/dataStore/DataStoreDetailsView.vue');

export const DataStoreModule: FrontendModuleDescription = {
	id: 'data-store',
	name: 'Data Store',
	description: 'Manage and store data efficiently with the Data Store module.',
	icon: 'database',
	modals: [
		{
			key: ADD_DATA_STORE_MODAL_KEY,
			component: async () => await import('./components/AddDataStoreModal.vue'),
			initialState: { open: false },
		},
	],
	routes: [
		{
			name: DATA_STORE_VIEW,
			path: '/home/datastores',
			components: {
				default: DataStoreView,
				sidebar: MainSidebar,
			},
			meta: {
				middleware: ['authenticated', 'custom'],
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
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: DATA_STORE_DETAILS,
			path: 'datastores/:id',
			props: true,
			components: {
				default: DataStoreDetailsView,
				sidebar: MainSidebar,
			},
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
	],
	projectTabs: {
		overview: [
			{
				label: i18n.baseText('dataStore.dataStores'),
				value: DATA_STORE_VIEW,
				to: {
					name: DATA_STORE_VIEW,
				},
			},
		],
		project: [
			{
				label: i18n.baseText('dataStore.dataStores'),
				value: PROJECT_DATA_STORES,
				dynamicRoute: {
					name: PROJECT_DATA_STORES,
					includeProjectId: true,
				},
			},
		],
	},
	resources: [
		{
			key: 'dataStore',
			displayName: 'Data Store',
		},
	],
};
