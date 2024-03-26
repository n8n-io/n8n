import type { RouteRecordRaw } from 'vue-router';
import { VIEWS } from '@/constants';

const MainSidebar = async () => await import('@/components/MainSidebar.vue');
const WorkflowsView = async () => await import('@/views/WorkflowsView.vue');
const CredentialsView = async () => await import('@/views/CredentialsView.vue');
const ProjectSettings = async () =>
	await import('@/features/projects/components/ProjectSettings.vue');

const commonChildRoutes: RouteRecordRaw[] = [
	{
		path: 'workflows',
		components: {
			default: WorkflowsView,
			sidebar: MainSidebar,
		},
		meta: {
			middleware: ['authenticated'],
		},
	},
	{
		path: 'credentials',
		components: {
			default: CredentialsView,
			sidebar: MainSidebar,
		},
		meta: {
			middleware: ['authenticated'],
		},
	},
];

const commonChildRouteExtensions = {
	home: [
		{
			name: VIEWS.WORKFLOWS,
		},
		{
			name: VIEWS.CREDENTIALS,
		},
	],
	projects: [
		{
			name: VIEWS.PROJECTS_WORKFLOWS,
		},
		{
			name: VIEWS.PROJECTS_CREDENTIALS,
		},
	],
};

export const projectsRoutes: RouteRecordRaw[] = [
	{
		path: '/projects',
		name: VIEWS.PROJECTS,
		meta: {
			middleware: ['authenticated'],
		},
		redirect: '/home/workflows',
		children: [
			{
				path: ':projectId',
				meta: {
					middleware: ['authenticated'],
				},
				redirect: { name: VIEWS.PROJECTS_WORKFLOWS },
				children: commonChildRoutes
					.map((route, idx) => ({
						...route,
						name: commonChildRouteExtensions.projects[idx].name,
					}))
					.concat([
						{
							path: 'settings',
							name: VIEWS.PROJECT_SETTINGS,
							components: {
								default: ProjectSettings,
								sidebar: MainSidebar,
							},
							meta: {
								middleware: ['authenticated'],
							},
						},
					]),
			},
		],
	},
	{
		path: '/home',
		name: VIEWS.HOMEPAGE,
		meta: {
			middleware: ['authenticated'],
		},
		redirect: '/home/workflows',
		children: commonChildRoutes.map((route, idx) => ({
			...route,
			name: commonChildRouteExtensions.home[idx].name,
		})),
	},
	{
		path: '/workflows',
		redirect: '/home/workflows',
	},
	{
		path: '/credentials',
		redirect: '/home/credentials',
	},
];
