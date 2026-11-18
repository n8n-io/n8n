import { VIEWS } from '@/app/constants';
import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { i18n } from '@n8n/i18n';
import { DOC_PAGES_MODULE_NAME, DOC_PAGE_VIEW, PROJECT_DOCS_VIEW } from './constants';

const ProjectDocsView = async (): Promise<unknown> => await import('./views/ProjectDocsView.vue');
const DocPageView = async (): Promise<unknown> => await import('./views/DocPageView.vue');

// The `/home` overview route lives in `projects.routes.ts`, because it is a child of `/home`.
export const DocPagesModule = defineFrontendModule({
	id: DOC_PAGES_MODULE_NAME,
	name: 'Docs',
	description: 'Documentation pages for workflows and Agents',
	icon: 'book-open',
	routes: [
		{
			name: PROJECT_DOCS_VIEW,
			path: 'docs',
			component: ProjectDocsView,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: DOC_PAGE_VIEW,
			path: 'docs/:pageId',
			component: DocPageView,
			props: true,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
	],
	projectTabs: {
		project: [
			{
				label: i18n.baseText('docPages.tab'),
				value: PROJECT_DOCS_VIEW,
				insertBefore: VIEWS.PROJECTS_WORKFLOWS,
				dynamicRoute: {
					name: PROJECT_DOCS_VIEW,
					includeProjectId: true,
				},
			},
		],
	},
});
