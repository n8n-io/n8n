import { useI18n } from '@n8n/i18n';
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
	modals: DATA_TABLE_MODALS,
	adHocModalKeyPrefixes: DATA_TABLE_AD_HOC_MODAL_KEY_PREFIXES,
	routes: [
		{
			name: DATA_TABLE_VIEW,
			path: '/home/datatables',
			component: DataTableView,
			meta: {
				// The instance-wide aggregate list needs the global dataTable:list scope,
				// distinct from the project-scoped routes below.
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: { rbac: { scope: ['dataTable:list'] } },
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
				// No rbac middleware here: useRBACStore().scopesByProjectId is never
				// populated in production (only addGlobalScope/setGlobalScopes are wired
				// up at login — there's no equivalent call for project-level scopes), so
				// a project-scoped rbac check here would incorrectly block any project
				// member whose access comes from their project role rather than a global
				// scope. The project itself already gates membership; page-level create/
				// manage affordances are permission-gated in DataTableView.vue instead.
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
				// Same reasoning as PROJECT_DATA_TABLES above — no rbac middleware.
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
