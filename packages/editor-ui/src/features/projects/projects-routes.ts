import type { NavigationGuardNext, RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
import { EnterpriseEditionFeature, VIEWS } from '@/constants';
import {
	projectsBaseRoute,
	projectsRoute,
	oldRoutesAsRegExps,
} from '@/features/projects/projects-constants';
import { getTemplatesRedirect } from '@/utils/routeUtils';

const MainHeader = async () => await import('@/components/MainHeader/MainHeader.vue');
const MainSidebar = async () => await import('@/components/MainSidebar.vue');
const WorkflowsView = async () => await import('@/views/WorkflowsView.vue');
const CredentialsView = async () => await import('@/views/CredentialsView.vue');
const NodeView = async () => await import('@/views/NodeView.vue');
const WorkflowExecutionsList = async () =>
	await import('@/components/ExecutionsView/ExecutionsList.vue');
const ExecutionsLandingPage = async () =>
	await import('@/components/ExecutionsView/ExecutionsLandingPage.vue');
const ExecutionPreview = async () =>
	await import('@/components/ExecutionsView/ExecutionPreview.vue');
const WorkflowHistory = async () => await import('@/views/WorkflowHistory.vue');

export const projectsRoutes: Readonly<RouteRecordRaw[]> = [
	{
		path: projectsRoute,
		name: VIEWS.PROJECTS,
		meta: {
			middleware: ['authenticated'],
		},
		children: [
			{
				path: 'credentials',
				name: VIEWS.CREDENTIALS,
				components: {
					default: CredentialsView,
					sidebar: MainSidebar,
				},
				meta: {
					middleware: ['authenticated'],
				},
			},
			{
				path: 'workflows/templates/:id',
				name: VIEWS.TEMPLATE_IMPORT,
				components: {
					default: NodeView,
					header: MainHeader,
					sidebar: MainSidebar,
				},
				meta: {
					templatesEnabled: true,
					keepWorkflowAlive: true,
					getRedirect: getTemplatesRedirect,
					middleware: ['authenticated'],
				},
			},
			{
				path: 'workflows',
				name: VIEWS.WORKFLOWS,
				components: {
					default: WorkflowsView,
					sidebar: MainSidebar,
				},
				meta: {
					middleware: ['authenticated'],
				},
			},
			{
				path: 'workflow/:name/debug/:executionId',
				name: VIEWS.EXECUTION_DEBUG,
				components: {
					default: NodeView,
					header: MainHeader,
					sidebar: MainSidebar,
				},
				meta: {
					nodeView: true,
					keepWorkflowAlive: true,
					middleware: ['authenticated', 'enterprise'],
					middlewareOptions: {
						enterprise: {
							feature: [EnterpriseEditionFeature.DebugInEditor],
						},
					},
				},
			},
			{
				path: 'workflow/:name/executions',
				name: VIEWS.WORKFLOW_EXECUTIONS,
				components: {
					default: WorkflowExecutionsList,
					header: MainHeader,
					sidebar: MainSidebar,
				},
				meta: {
					keepWorkflowAlive: true,
					middleware: ['authenticated'],
				},
				children: [
					{
						path: '',
						name: VIEWS.EXECUTION_HOME,
						components: {
							executionPreview: ExecutionsLandingPage,
						},
						meta: {
							keepWorkflowAlive: true,
							middleware: ['authenticated'],
						},
					},
					{
						path: ':executionId',
						name: VIEWS.EXECUTION_PREVIEW,
						components: {
							executionPreview: ExecutionPreview,
						},
						meta: {
							keepWorkflowAlive: true,
							middleware: ['authenticated'],
						},
					},
				],
			},
			{
				path: 'workflow/:workflowId/history/:versionId?',
				name: VIEWS.WORKFLOW_HISTORY,
				components: {
					default: WorkflowHistory,
					sidebar: MainSidebar,
				},
				meta: {
					middleware: ['authenticated', 'enterprise'],
					middlewareOptions: {
						enterprise: {
							feature: [EnterpriseEditionFeature.WorkflowHistory],
						},
					},
				},
			},
			{
				path: 'workflow/new',
				name: VIEWS.NEW_WORKFLOW,
				components: {
					default: NodeView,
					header: MainHeader,
					sidebar: MainSidebar,
				},
				meta: {
					nodeView: true,
					keepWorkflowAlive: true,
					middleware: ['authenticated'],
				},
			},
			{
				path: 'workflow/:name',
				name: VIEWS.WORKFLOW,
				components: {
					default: NodeView,
					header: MainHeader,
					sidebar: MainSidebar,
				},
				meta: {
					nodeView: true,
					keepWorkflowAlive: true,
					middleware: ['authenticated'],
				},
			},
			{
				path: 'workflow',
				redirect: { name: VIEWS.NEW_WORKFLOW },
			},
			{
				path: '',
				redirect: { name: VIEWS.WORKFLOWS },
			},
		],
	},
];

export const projectsRouteBeforeMiddleware = async (
	to: RouteLocationNormalized,
	from: RouteLocationNormalized,
	next: NavigationGuardNext,
) => {
	const projectId = 'home';
	if (
		oldRoutesAsRegExps.some((pattern) => pattern.test(to.path)) &&
		!to.path.includes(projectsBaseRoute)
	) {
		return next({
			path: `${projectsBaseRoute}/${projectId}${to.path}`,
			query: to.query,
		});
	}
	if (to.path === '/' || to.path === projectsBaseRoute) {
		return next({ name: VIEWS.WORKFLOWS, params: { projectId } });
	}
};
