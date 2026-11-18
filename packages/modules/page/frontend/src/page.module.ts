import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { i18n } from '@n8n/i18n';
import type { NavigationGuard } from 'vue-router';

import { PAGE_SHORT_LINK_VIEW, PROJECT_PAGES_VIEW } from './page.constants';
import { getPagePermissions } from './page.permissions';

const PagesView = async () => await import('./views/PagesView.vue');
const PageNotFoundView = async () => await import('./views/PageNotFoundView.vue');

/**
 * Sends the short address of a page to the page inside its project.
 * A page that the user cannot read stays on the route, which shows a not-found message.
 */
const redirectToProjectPage: NavigationGuard = async (to) => {
	const { usePageStore } = await import('./page.store');
	try {
		const page = await usePageStore().fetchPageById(String(to.params.pageId));
		return { name: PROJECT_PAGES_VIEW, params: { projectId: page.projectId, pageId: page.id } };
	} catch {
		return true;
	}
};

export const PageModule = defineFrontendModule({
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'page',
	name: 'Pages',
	description:
		'Write pages inside a project. A page links to workflows, nodes, credentials, data tables and other pages.',
	icon: 'file-text',
	routes: [
		{
			// One route for the list and for a selected page, so the editor view stays mounted.
			name: PROJECT_PAGES_VIEW,
			path: 'pages/:pageId?',
			component: PagesView,
			meta: { projectRoute: true, middleware: ['authenticated', 'custom'] },
		},
		{
			name: PAGE_SHORT_LINK_VIEW,
			path: '/page/:pageId',
			component: PageNotFoundView,
			meta: { middleware: ['authenticated', 'custom'] },
			beforeEnter: redirectToProjectPage,
		},
	],
	projectTabs: {
		project: [
			{
				label: i18n.baseText('page.pages'),
				value: PROJECT_PAGES_VIEW,
				dynamicRoute: { name: PROJECT_PAGES_VIEW, includeProjectId: true },
				available: (projectId) => projectId !== undefined && getPagePermissions(projectId).canList,
			},
		],
	},
});
