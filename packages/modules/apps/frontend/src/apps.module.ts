import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { AGENTS_LIST_VIEW, PROJECT_AGENTS } from '@n8n/frontend-constants/agents';
import { VIEWS } from '@n8n/frontend-constants/views';

import { canListApps } from './apps.access';
import { APPS_LIST_VIEW, PROJECT_APPS } from './apps.constants';

const AppsListView = async () => await import('./views/AppsListView.vue');

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
			beforeEnter: (to) =>
				(typeof to.params.projectId === 'string' && canListApps(to.params.projectId)) || {
					name: VIEWS.PROJECTS_WORKFLOWS,
					params: to.params,
				},
		},
	],
	projectTabs: {
		overview: [
			{
				label: 'Apps',
				value: APPS_LIST_VIEW,
				preview: true,
				insertAfter: AGENTS_LIST_VIEW,
				to: { name: APPS_LIST_VIEW },
			},
		],
		project: [
			{
				label: 'Apps',
				value: PROJECT_APPS,
				preview: true,
				insertAfter: PROJECT_AGENTS,
				dynamicRoute: { name: PROJECT_APPS, includeProjectId: true },
				available: (projectId) => projectId !== undefined && canListApps(projectId),
			},
		],
	},
	resources: [{ key: 'app', displayName: 'App' }],
});
