import { useI18n } from '@n8n/i18n';
import { type FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import {
	ADD_DATA_TABLE_MODAL_KEY,
	DATA_TABLE_DETAILS,
	DATA_TABLE_VIEW,
	PROJECT_DATA_TABLES,
} from '@/features/core/dataTable/constants';
import { useInsightsStore } from '@/features/execution/insights/insights.store';

const i18n = useI18n();

const DataTableView = async () => await import('@/features/core/dataTable/DataTableView.vue');
const DataTableDetailsView = async () =>
	await import('@/features/core/dataTable/DataTableDetailsView.vue');

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
			component: DataTableView,
			meta: {
				middleware: ['authenticated', 'custom'],
			},
			beforeEnter: (_to, _from, next) => {
				const insightsStore = useInsightsStore();
				if (insightsStore.isSummaryEnabled) {
					// refresh the weekly summary when entering the datatables route
					void insightsStore.weeklySummary.execute();
				}
				next();
			},
		},
		{
			name: PROJECT_DATA_TABLES,
			path: 'datatables/:new(new)?',
			props: true,
			component: DataTableView,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: DATA_TABLE_DETAILS,
			path: 'datatables/:id',
			props: true,
			component: DataTableDetailsView,
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
				to: {
					name: DATA_TABLE_VIEW,
				},
			},
		],
		project: [
			{
				label: i18n.baseText('dataTable.dataTables'),
				value: PROJECT_DATA_TABLES,
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
