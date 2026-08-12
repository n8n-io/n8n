import { useI18n } from '@n8n/i18n';
import { type FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { FILES_VIEW, PROJECT_FILES, PROJECT_FILES_PREVIEW } from '@/features/core/files/constants';

const i18n = useI18n();

const FilesView = async () => await import('@/features/core/files/FilesView.vue');

export const FilesModule: FrontendModuleDescription = {
	id: 'file-storage',
	name: 'Files',
	description: 'Store project-scoped files and use them from workflows.',
	icon: 'files',
	routes: [
		{
			name: FILES_VIEW,
			path: '/home/files',
			component: FilesView,
			meta: {
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: PROJECT_FILES,
			path: 'files/:new(new)?',
			props: true,
			component: FilesView,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			// Deep link that opens the list with the preview panel open —
			// a file has no details page, so this renders the same view.
			name: PROJECT_FILES_PREVIEW,
			path: 'files/:id',
			props: true,
			component: FilesView,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
	],
	projectTabs: {
		overview: [
			{
				label: i18n.baseText('files.tab.label'),
				value: FILES_VIEW,
				to: {
					name: FILES_VIEW,
				},
			},
		],
		project: [
			{
				label: i18n.baseText('files.tab.label'),
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
			key: 'file',
			displayName: 'File',
		},
	],
};
