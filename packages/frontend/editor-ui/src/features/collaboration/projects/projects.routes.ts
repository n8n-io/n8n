import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { SELF_HEALING_CONFIG_VIEW } from '@/features/self-healing/selfHealing.constants';
import { useProjectsStore } from './projects.store';
import { getResourcePermissions } from '@n8n/permissions';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import { hasRole } from '@/app/utils/rbac/checks';
import { useSettingsStore } from '@n8n/stores/settings.store';

const WorkflowsView = async () => await import('@/app/views/WorkflowsView.vue');
const CredentialsView = async () =>
	await import('@/features/credentials/views/CredentialsView.vue');
const ProjectSettings = async () => await import('./views/ProjectSettings.vue');
const ExecutionsView = async () =>
	await import('@/features/execution/executions/views/ExecutionsView.vue');
const ProjectVariables = async () => await import('./views/ProjectVariables.vue');
const SelfHealingConfigView = async () =>
	await import('@/features/self-healing/views/SelfHealingConfigView.vue');

function refreshInsightsSummary() {
	void import('@n8n/frontend-module-insights')
		.then(({ useInsightsStore }) => {
			const insightsStore = useInsightsStore();
			if (insightsStore.isSummaryEnabled) {
				void insightsStore.weeklySummary.execute();
			}
		})
		.catch(() => {});
}

const checkProjectAvailability = (to?: RouteLocationNormalized): boolean => {
	if (!to?.params.projectId) {
		return true;
	}
	const project = useProjectsStore().myProjects.find((p) => to?.params.projectId === p.id);
	return !!project;
};

// Mirrors ProjectHeader's showSettings: any one section's scope is enough to
// enter the settings page.
const canEnterProjectSettings = (to?: RouteLocationNormalized): boolean => {
	const project = useProjectsStore().myProjects.find((p) => p.id === to?.params.projectId);
	const permissions = getResourcePermissions(project?.scopes);
	return (
		!!permissions.project.update ||
		!!permissions.project.manageMembers ||
		!!permissions.externalSecretsProvider.read
	);
};

const commonChildRoutes: RouteRecordRaw[] = [
	{
		path: 'workflows',
		component: WorkflowsView,
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
		component: CredentialsView,
		meta: {
			middleware: ['authenticated', 'custom'],
			middlewareOptions: {
				custom: (options) => checkProjectAvailability(options?.to),
			},
		},
	},
	{
		path: 'executions',
		component: ExecutionsView,
		meta: {
			middleware: ['authenticated', 'custom'],
			middlewareOptions: {
				custom: (options) => checkProjectAvailability(options?.to),
			},
		},
	},
	{
		path: 'folders/:folderId?/workflows',
		component: WorkflowsView,
		meta: {
			middleware: ['authenticated', 'custom'],
			middlewareOptions: {
				custom: (options) => checkProjectAvailability(options?.to),
			},
		},
	},
	{
		path: 'variables',
		component: ProjectVariables,
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
					.map(
						(route, idx): RouteRecordRaw => ({
							...route,
							name: commonChildRouteExtensions.projects[idx].name,
						}),
					)
					.concat([
						{
							path: 'settings',
							name: VIEWS.PROJECT_SETTINGS,
							component: ProjectSettings,
							meta: {
								middleware: ['authenticated', 'custom'],
								middlewareOptions: {
									custom: (options) => canEnterProjectSettings(options?.to),
								},
							},
						},
						{
							path: 'settings/self-healing/:configId',
							name: SELF_HEALING_CONFIG_VIEW,
							component: SelfHealingConfigView,
							// The store is imported lazily: it carries the prototype's demo data.
							beforeEnter: async (to) => {
								const { useSelfHealingStore } = await import(
									'@/features/self-healing/selfHealing.store'
								);
								return (
									useSelfHealingStore().isEnabled || {
										name: VIEWS.PROJECT_SETTINGS,
										params: { projectId: to.params.projectId },
									}
								);
							},
							meta: {
								middleware: ['authenticated', 'custom'],
								middlewareOptions: {
									custom: (options) => canEnterProjectSettings(options?.to),
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

			// Refresh the weekly summary when entering the home route. The import is lazy and
			// unawaited: this module is in the boot graph through the router, and a chunk that
			// fails to load must not hold up navigation — the summary only stays stale.
			refreshInsightsSummary();

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
				component: WorkflowsView,
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
				component: CredentialsView,
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
