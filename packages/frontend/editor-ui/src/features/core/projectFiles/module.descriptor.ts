import { useI18n } from '@n8n/i18n';
import { type FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { PROJECT_FILES } from '@/features/core/projectFiles/constants';

const i18n = useI18n();

const ProjectFilesView = async () =>
	await import('@/features/core/projectFiles/ProjectFilesView.vue');

export const ProjectFilesModule: FrontendModuleDescription = {
	id: 'project-files',
	name: 'Project Files',
	description: 'Store and manage persistent files attached to a project.',
	icon: 'file-text',
	routes: [
		{
			name: PROJECT_FILES,
			path: 'files',
			props: true,
			component: ProjectFilesView,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
	],
	// Project tab only: a cross-project overview needs an aggregate endpoint that
	// does not exist yet, so there is no `overview` entry.
	projectTabs: {
		project: [
			{
				label: i18n.baseText('projectFiles.files'),
				value: PROJECT_FILES,
				dynamicRoute: {
					name: PROJECT_FILES,
					includeProjectId: true,
				},
			},
		],
	},
	resources: [
		{
			key: 'projectFile',
			displayName: 'File',
		},
	],
};
