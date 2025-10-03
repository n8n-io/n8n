import { useI18n } from '@n8n/i18n';
import { type FrontendModuleDescription } from '@/moduleInitializer/module.types';
import {
	ADD_DATA_TABLE_MODAL_KEY,
	DATA_TABLE_DETAILS,
	DATA_TABLE_VIEW,
	PROJECT_DATA_TABLES,
} from '@/features/dataTable/constants';

const i18n = useI18n();

const MainSidebar = async () => await import('@/components/MainSidebar.vue');
const DataTableView = async () => await import('@/features/dataTable/DataTableView.vue');
const DataTableDetailsView = async () =>
	await import('@/features/dataTable/DataTableDetailsView.vue');

export const DataTableModule: FrontendModuleDescription = {
	id: 'data-table',
	name: 'Data Table',
	description: 'Manage and store data efficiently with the Data Table module.',
	icon: 'database',
	modals: [
		{
			key: ADD_DATA_TABLE_MODAL_KEY,
			component: async () => await import('./components/AddDataTableModal.vue'),
			initialState: { open: false },
		},
	],
	routes: [
		{
			name: DATA_TABLE_VIEW,
			path: '/home/datatables',
			components: {
				default: DataTableView,
				sidebar: MainSidebar,
			},
			meta: {
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: PROJECT_DATA_TABLES,
			path: 'datatables/:new(new)?',
			props: true,
			components: {
				default: DataTableView,
				sidebar: MainSidebar,
			},
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: DATA_TABLE_DETAILS,
			path: 'datatables/:id',
			props: true,
			components: {
				default: DataTableDetailsView,
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
				label: i18n.baseText('dataTable.dataTables'),
				value: DATA_TABLE_VIEW,
				tag: i18n.baseText('generic.betaProper'),
				to: {
					name: DATA_TABLE_VIEW,
				},
			},
		],
		project: [
			{
				label: i18n.baseText('dataTable.dataTables'),
				value: PROJECT_DATA_TABLES,
				tag: i18n.baseText('generic.betaProper'),
				dynamicRoute: {
					name: PROJECT_DATA_TABLES,
					includeProjectId: true,
				},
			},
		],
	},
	resources: [
		{
			key: 'dataTable',
			displayName: 'Data Table',
		},
	],
};
