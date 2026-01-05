import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { useProjectsStore } from './projects.store';
import { getResourcePermissions } from '@n8n/permissions';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import { hasRole } from '@/app/utils/rbac/checks';
import { useSettingsStore } from '@/app/stores/settings.store';

const MainSidebar = async () => await import('@/app/components/MainSidebar.vue');
const WorkflowsView = async () => await import('@/app/views/WorkflowsView.vue');
const CredentialsView = async () =>
	await import('@/features/credentials/views/CredentialsView.vue');
const ProjectSettings = async () => await import('./views/ProjectSettings.vue');
const ExecutionsView = async () =>
	await import('@/features/execution/executions/views/ExecutionsView.vue');
const ProjectVariables = async () => await import('./views/ProjectVariables.vue');

const checkProjectAvailability = (to?: RouteLocationNormalized): boolean => {
	if (!to?.params.projectId) {
		return true;
	}
	const project = useProjectsStore().myProjects.find((p) => to?.params.projectId === p.id);
	return !!project;
};

const commonChildRoutes: RouteRecordRaw[] = [
	{
		path: 'workflows',
		components: {
			default: WorkflowsView,
			sidebar: MainSidebar,
		},
		meta: {
			middleware: ['authenticated', 'custom'],
			middlewareOptions: {
				custom: (options) => checkProjectAvailability(options?.to),
			},
		},
	},
	{
		path: 'credentials/:credentialId?',
		props: true,
		components: {
			default: CredentialsView,
			sidebar: MainSidebar,
		},
		meta: {
			middleware: ['authenticated', 'custom'],
			middlewareOptions: {
				custom: (options) => checkProjectAvailability(options?.to),
			},
		},
	},
	{
		path: 'executions',
		components: {
			default: ExecutionsView,
			sidebar: MainSidebar,
		},
		meta: {
			middleware: ['authenticated', 'custom'],
			middlewareOptions: {
				custom: (options) => checkProjectAvailability(options?.to),
			},
		},
	},
	{
		path: 'folders/:folderId?/workflows',
		components: {
			default: WorkflowsView,
			sidebar: MainSidebar,
		},
		meta: {
			middleware: ['authenticated', 'custom'],
			middlewareOptions: {
				custom: (options) => checkProjectAvailability(options?.to),
			},
		},
	},
	{
		path: 'variables',
		components: {
			default: ProjectVariables,
			sidebar: MainSidebar,
		},
		meta: {
			middleware: ['authenticated', 'custom'],
			middlewareOptions: {
				custom: (options) => checkProjectAvailability(options?.to),
			},
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
		{
			name: VIEWS.EXECUTIONS,
		},
		{
			name: VIEWS.FOLDERS,
		},
		{
			name: VIEWS.HOME_VARIABLES,
		},
	],
	projects: [
		{
			name: VIEWS.PROJECTS_WORKFLOWS,
		},
		{
			name: VIEWS.PROJECTS_CREDENTIALS,
		},
		{
			name: VIEWS.PROJECTS_EXECUTIONS,
		},
		{
			name: VIEWS.PROJECTS_FOLDERS,
		},
		{
			name: VIEWS.PROJECTS_VARIABLES,
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
				name: VIEWS.PROJECT_DETAILS,
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
								middleware: ['authenticated', 'custom'],
								middlewareOptions: {
									custom: (options) => {
										const project = useProjectsStore().myProjects.find(
											(p) => p.id === options?.to.params.projectId,
										);
										return !!getResourcePermissions(project?.scopes).project.update;
									},
								},
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
		beforeEnter: (_to, _from, next) => {
			const settingsStore = useSettingsStore();
			if (settingsStore.isChatFeatureEnabled && hasRole(['global:chatUser'])) {
				// Prevent Chat users from accessing the home view
				return next({ name: CHAT_VIEW });
			}

			const insightsStore = useInsightsStore();
			if (insightsStore.isSummaryEnabled) {
				// refresh the weekly summary when entering the home route
				void insightsStore.weeklySummary.execute();
			}

			next();
		},
		children: commonChildRoutes.map((route, idx) => ({
			...route,
			name: commonChildRouteExtensions.home[idx].name,
			middleware: ['authenticated'],
		})),
	},
	{
		path: '/shared',
		name: VIEWS.SHARED_WITH_ME,
		meta: {
			middleware: ['authenticated'],
		},
		redirect: '/shared/workflows',
		children: [
			{
				path: 'workflows',
				name: VIEWS.SHARED_WORKFLOWS,
				components: {
					default: WorkflowsView,
					sidebar: MainSidebar,
				},
				meta: {
					middleware: ['authenticated', 'custom'],
					middlewareOptions: {
						custom: (options) => checkProjectAvailability(options?.to),
					},
				},
			},
			{
				path: 'credentials/:credentialId?',
				props: true,
				name: VIEWS.SHARED_CREDENTIALS,
				components: {
					default: CredentialsView,
					sidebar: MainSidebar,
				},
				meta: {
					middleware: ['authenticated', 'custom'],
					middlewareOptions: {
						custom: (options) => checkProjectAvailability(options?.to),
					},
				},
			},
		],
	},
	{
		path: '/workflows',
		redirect: '/home/workflows',
	},
	{
		path: '/credentials',
		redirect: '/home/credentials',
	},
	{
		path: '/executions',
		redirect: '/home/executions',
	},
	{
		path: '/variables',
		redirect: '/home/variables',
	},
];
