import { type FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import {
	ADD_DASHBOARD_MODAL_KEY,
	DASHBOARD_DETAILS,
	PROJECT_DASHBOARDS,
} from '@/features/core/dashboards/constants';

const DashboardsListView = async () =>
	await import('@/features/core/dashboards/views/DashboardsListView.vue');
const DashboardView = async () =>
	await import('@/features/core/dashboards/views/DashboardView.vue');

export const DashboardsModule: FrontendModuleDescription = {
	id: 'dashboard',
	name: 'Dashboards',
	description: 'Build dashboards backed by n8n Data Tables, with workflow-bound actions.',
	icon: 'chart-bar',
	modals: [
		{
			key: ADD_DASHBOARD_MODAL_KEY,
			component: async () => await import('./components/AddDashboardModal.vue'),
			initialState: { open: false },
		},
	],
	routes: [
		{
			name: PROJECT_DASHBOARDS,
			path: 'dashboards',
			component: DashboardsListView,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: DASHBOARD_DETAILS,
			path: 'dashboards/:id',
			props: true,
			component: DashboardView,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
	],
	projectTabs: {
		project: [
			{
				label: 'Dashboards',
				value: PROJECT_DASHBOARDS,
				dynamicRoute: {
					name: PROJECT_DASHBOARDS,
					includeProjectId: true,
				},
			},
		],
	},
	resources: [
		{
			key: 'dashboard',
			displayName: 'Dashboard',
		},
	],
};
