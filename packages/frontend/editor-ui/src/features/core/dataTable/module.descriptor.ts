import { type FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import {
	DATA_TABLE_DETAILS,
	DATA_TABLE_VIEW,
	PROJECT_DATA_TABLES,
} from '@/features/core/dataTable/constants';
import {
	DATA_TABLE_AD_HOC_MODAL_KEY_PREFIXES,
	DATA_TABLE_MODALS,
} from '@/features/core/dataTable/modals';

const DataTableView = async () => await import('@/features/core/dataTable/DataTableView.vue');
const DataTableDetailsView = async () =>
	await import('@/features/core/dataTable/DataTableDetailsView.vue');

export const DataTableModule: FrontendModuleDescription = {
	id: 'data-table',
	name: 'Data Table',
	description: 'Manage and store data efficiently with the Data Table module.',
	icon: 'database',
	modals: DATA_TABLE_MODALS,
	adHocModalKeyPrefixes: DATA_TABLE_AD_HOC_MODAL_KEY_PREFIXES,
	routes: [
		{
			name: DATA_TABLE_VIEW,
			path: '/home/datatables',
			component: DataTableView,
			meta: {
				middleware: ['authenticated', 'custom'],
			},
			beforeEnter: (_to, _from, next) => {
				// Refresh the weekly summary when entering the datatables route. The import is
				// lazy and unawaited: this descriptor is in the boot graph through the shell
				// manifest, and a chunk that fails to load must not hold up navigation.
				void import('@/features/execution/insights')
					.then(({ useInsightsStore }) => {
						const insightsStore = useInsightsStore();
						if (insightsStore.isSummaryEnabled) {
							void insightsStore.weeklySummary.execute();
						}
					})
					.catch(() => {});

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
				labelKey: 'dataTable.dataTables',
				value: DATA_TABLE_VIEW,
				to: {
					name: DATA_TABLE_VIEW,
				},
			},
		],
		project: [
			{
				labelKey: 'dataTable.dataTables',
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
