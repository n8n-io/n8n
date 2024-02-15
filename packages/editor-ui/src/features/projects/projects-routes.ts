import type { RouteRecordRaw } from 'vue-router';
import { EnterpriseEditionFeature, VIEWS } from '@/constants';
import {
	projectsBaseRoute,
	projectsRoute,
	oldRoutesToProjectMap,
} from '@/features/projects/projects-constants';

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
const Projects = async () => await import('@/features/projects/views/Projects.vue');

export const projectsRoutes: Readonly<RouteRecordRaw[]> = [
	{
		path: projectsRoute,
		name: VIEWS.PROJECTS,
		component: Projects,
		children: [
			{
				path: '/credentials',
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
				path: '/workflows',
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
				path: '/workflow/:name/debug/:executionId',
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
				path: '/workflow/:name/executions',
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
				path: '/workflow/:workflowId/history/:versionId?',
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
				path: '/workflow/new',
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
				path: '/workflow/:name',
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
				path: '/workflow',
				redirect: '/workflow/new',
			},
			{
				path: '/',
				redirect: '/workflows',
			},
		],
	},
	{
		path: projectsBaseRoute,
		component: Projects,
	},
	// Catch old /credentials and /workflow routes and redirect to /projects
	...Object.keys(oldRoutesToProjectMap).map((oldRoute) => ({
		path: oldRoute,
		redirect: projectsBaseRoute,
	})),
];
