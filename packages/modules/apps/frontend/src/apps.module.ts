import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { VIEWS } from '@n8n/frontend-constants/views';
import type { NavigationGuard } from 'vue-router';

import { getAppPermissions } from './apps.permissions';
import { APP_DETAIL_VIEW, APPS_LIST_VIEW, PROJECT_APPS } from './apps.constants';

const AppsListView = async () => await import('./views/AppsListView.vue');
const AppDetailView = async () => await import('./views/AppDetailView.vue');

function guardProjectRoute(permission: 'canList' | 'canRead'): NavigationGuard {
	return (to) =>
		(typeof to.params.projectId === 'string' &&
			getAppPermissions(to.params.projectId)[permission]) || {
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: to.params.projectId },
		};
}

export const AppsModule = defineFrontendModule({
	id: 'apps',
	name: 'Apps',
	description: 'Build and manage apps that use n8n as their backend',
	icon: 'layout-template',
	routes: [
		{
			name: APPS_LIST_VIEW,
			path: '/home/apps',
			component: AppsListView,
			meta: { middleware: ['authenticated', 'custom'] },
		},
		{
			name: PROJECT_APPS,
			path: 'apps',
			component: AppsListView,
			meta: { projectRoute: true, middleware: ['authenticated', 'custom'] },
			beforeEnter: guardProjectRoute('canList'),
		},
		{
			name: APP_DETAIL_VIEW,
			path: 'apps/:appId',
			component: AppDetailView,
			meta: { projectRoute: true, middleware: ['authenticated', 'custom'] },
			beforeEnter: guardProjectRoute('canRead'),
		},
	],
	projectTabs: {
		overview: [
			{
				label: 'Apps',
				value: APPS_LIST_VIEW,
				preview: true,
				insertAfter: VIEWS.WORKFLOWS,
				to: { name: APPS_LIST_VIEW },
			},
		],
		project: [
			{
				label: 'Apps',
				value: PROJECT_APPS,
				preview: true,
				insertAfter: VIEWS.PROJECTS_WORKFLOWS,
				dynamicRoute: { name: PROJECT_APPS, includeProjectId: true },
				available: (projectId) => projectId !== undefined && getAppPermissions(projectId).canList,
			},
		],
	},
	resources: [{ key: 'app', displayName: 'App' }],
});
