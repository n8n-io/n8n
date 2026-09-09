import { type FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';

import {
	APP_DETAILS,
	APP_PAGE_DETAILS,
	APPS_VIEW,
	PROJECT_APPS,
} from '@/features/apps/apps.constants';
import { APPS_MODALS } from '@/features/apps/modals';

const i18n = useI18n();

const AppsView = async () => await import('@/features/apps/AppsView.vue');
const AppDetailsView = async () => await import('@/features/apps/AppDetailsView.vue');

export const AppsModule: FrontendModuleDescription = {
	id: 'apps',
	name: 'Apps',
	description: 'Build pages backed by your workflows.',
	icon: 'grid-2x2',
	modals: APPS_MODALS,
	routes: [
		{
			name: APPS_VIEW,
			path: '/home/apps',
			component: AppsView,
			meta: {
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: PROJECT_APPS,
			path: 'apps',
			component: AppsView,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: APP_DETAILS,
			path: 'apps/:appId',
			props: true,
			component: AppDetailsView,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: APP_PAGE_DETAILS,
			path: 'apps/:appId/pages/:pageId',
			props: true,
			component: AppDetailsView,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
	],
	projectTabs: {
		overview: [
			{
				label: i18n.baseText('apps.apps'),
				value: APPS_VIEW,
				to: {
					name: APPS_VIEW,
				},
			},
		],
		project: [
			{
				label: i18n.baseText('apps.apps'),
				value: PROJECT_APPS,
				dynamicRoute: {
					name: PROJECT_APPS,
					includeProjectId: true,
				},
			},
		],
	},
	resources: [
		{
			key: 'app',
			displayName: 'App',
		},
	],
};
