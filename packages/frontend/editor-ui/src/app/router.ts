import type {
	NavigationGuardNext,
	RouteLocation,
	RouteRecordRaw,
	RouteLocationRaw,
	RouteLocationNormalized,
} from 'vue-router';
import { createRouter, createWebHistory, isNavigationFailure, RouterView } from 'vue-router';
import { nanoid } from 'nanoid';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';
import { EnterpriseEditionFeature, VIEWS, EDITABLE_CANVAS_VIEWS } from '@/app/constants';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { middleware } from '@/app/utils/rbac/middleware';
import type { RouterMiddleware } from '@/app/types/router';
import { initializeAuthenticatedFeatures, initializeCore } from '@/app/init';
import { tryToParseNumber } from '@/app/utils/typesUtils';
import { projectsRoutes } from '@/features/collaboration/projects/projects.routes';
import { MfaRequiredError } from '@n8n/rest-api-client';
import { useRecentResources } from '@/features/shared/commandBar/composables/useRecentResources';
import { usePostHog } from '@/app/stores/posthog.store';
import { TEMPLATE_SETUP_EXPERIENCE } from '@/app/constants/experiments';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

const ChangePasswordView = async () =>
	await import('@/features/core/auth/views/ChangePasswordView.vue');
const ErrorView = async () => await import('@/app/views/ErrorView.vue');
const EntityNotFound = async () => await import('@/app/views/EntityNotFound.vue');
const EntityUnAuthorised = async () => await import('@/app/views/EntityUnAuthorised.vue');
const OAuthConsentView = async () => await import('@/app/views/OAuthConsentView.vue');
const ForgotMyPasswordView = async () =>
	await import('@/features/core/auth/views/ForgotMyPasswordView.vue');

const NodeView = async () => await import('@/app/views/NodeView.vue');
const WorkflowExecutionsView = async () =>
	await import('@/features/execution/executions/views/WorkflowExecutionsView.vue');
const WorkflowExecutionsLandingPage = async () =>
	await import(
		'@/features/execution/executions/components/workflow/WorkflowExecutionsLandingPage.vue'
	);
const WorkflowExecutionsPreview = async () =>
	await import('@/features/execution/executions/components/workflow/WorkflowExecutionsPreview.vue');
const SettingsLdapView = async () =>
	await import('@/features/settings/sso/views/SettingsLdapView.vue');
const SettingsPersonalView = async () =>
	await import('@/features/core/auth/views/SettingsPersonalView.vue');
const SettingsUsersView = async () =>
	await import('@/features/settings/users/views/SettingsUsersView.vue');
const SettingsResolversView = async () => await import('@/features/resolvers/ResolversView.vue');
const SettingsCommunityNodesView = async () =>
	await import('@/features/settings/communityNodes/views/SettingsCommunityNodesView.vue');
const SettingsApiView = async () =>
	await import('@/features/settings/apiKeys/views/SettingsApiView.vue');
const SettingsLogStreamingView = async () =>
	await import('@/features/integrations/logStreaming.ee/views/SettingsLogStreamingView.vue');
const SetupView = async () => await import('@/features/core/auth/views/SetupView.vue');
const SigninView = async () => await import('@/features/core/auth/views/SigninView.vue');
const SignupView = async () => await import('@/features/core/auth/views/SignupView.vue');
const TemplatesCollectionView = async () =>
	await import('@/features/workflows/templates/views/TemplatesCollectionView.vue');
const TemplatesWorkflowView = async () =>
	await import('@/features/workflows/templates/views/TemplatesWorkflowView.vue');
const SetupWorkflowFromTemplateView = async () =>
	await import('@/features/workflows/templates/views/SetupWorkflowFromTemplateView.vue');
const TemplatesSearchView = async () =>
	await import('@/features/workflows/templates/views/TemplatesSearchView.vue');
const SettingsUsageAndPlan = async () =>
	await import('@/features/settings/usage/views/SettingsUsageAndPlan.vue');
const SettingsSso = async () => await import('@/features/settings/sso/views/SettingsSso.vue');
const SignoutView = async () => await import('@/features/core/auth/views/SignoutView.vue');
const SamlOnboarding = async () => await import('@/features/settings/sso/views/SamlOnboarding.vue');
const SettingsSourceControl = async () =>
	await import('@/features/integrations/sourceControl.ee/views/SettingsSourceControl.vue');
const SettingsExternalSecrets = async () =>
	await import('@/features/integrations/externalSecrets.ee/views/SettingsExternalSecrets.vue');
const WorkerView = async () =>
	await import('@/features/settings/orchestration.ee/views/WorkerView.vue');
const WorkflowHistory = async () =>
	await import('@/features/workflows/workflowHistory/views/WorkflowHistory.vue');
const WorkflowOnboardingView = async () => await import('@/app/views/WorkflowOnboardingView.vue');
const EvaluationsView = async () =>
	await import('@/features/ai/evaluation.ee/views/EvaluationsView.vue');
const TestRunDetailView = async () =>
	await import('@/features/ai/evaluation.ee/views/TestRunDetailView.vue');
const EvaluationRootView = async () =>
	await import('@/features/ai/evaluation.ee/views/EvaluationsRootView.vue');
const ResourceCenterView = async () =>
	await import('@/experiments/resourceCenter/views/ResourceCenterView.vue');
const ResourceCenterSectionView = async () =>
	await import('@/experiments/resourceCenter/views/ResourceCenterSectionView.vue');

const MigrationReportView = async () =>
	await import('@/features/settings/migrationReport/MigrationRules.vue');

const MigrationRuleReportView = async () =>
	await import('@/features/settings/migrationReport/MigrationRuleDetail.vue');

function getTemplatesRedirect(defaultRedirect: VIEWS[keyof VIEWS]): { name: string } | false {
	const settingsStore = useSettingsStore();
	const isTemplatesEnabled: boolean = settingsStore.isTemplatesEnabled;
	if (!isTemplatesEnabled) {
		return { name: `${defaultRedirect}` || VIEWS.NOT_FOUND };
	}

	return false;
}

export const routes: RouteRecordRaw[] = [
	{
		path: '/',
		redirect: '/home/workflows',
		meta: {
			middleware: ['authenticated'],
		},
	},
	{
		path: '/collections/:id',
		name: VIEWS.COLLECTION,
		component: TemplatesCollectionView,
		meta: {
			templatesEnabled: true,
			telemetry: {
				getProperties(route: RouteLocation) {
					const templatesStore = useTemplatesStore();
					return {
						collection_id: route.params.id,
						wf_template_repo_session_id: templatesStore.currentSessionId,
					};
				},
			},
			getRedirect: getTemplatesRedirect,
			middleware: ['authenticated'],
		},
	},
	// Following two routes are kept in-app:
	// Single workflow view, used when a custom template host is set
	// Also, reachable directly from this URL
	{
		path: '/templates/:id',
		name: VIEWS.TEMPLATE,
		component: TemplatesWorkflowView,
		meta: {
			templatesEnabled: true,
			getRedirect: getTemplatesRedirect,
			telemetry: {
				getProperties(route: RouteLocation) {
					const templatesStore = useTemplatesStore();
					return {
						template_id: tryToParseNumber(
							Array.isArray(route.params.id) ? route.params.id[0] : route.params.id,
						),
						wf_template_repo_session_id: templatesStore.currentSessionId,
					};
				},
			},
			middleware: ['authenticated'],
		},
	},
	// Template setup view, this is the landing view for website users
	{
		path: '/templates/:id/setup',
		name: VIEWS.TEMPLATE_SETUP,
		component: SetupWorkflowFromTemplateView,
		meta: {
			templatesEnabled: true,
			getRedirect: getTemplatesRedirect,
			telemetry: {
				getProperties(route: RouteLocation) {
					const templatesStore = useTemplatesStore();
					return {
						template_id: tryToParseNumber(
							Array.isArray(route.params.id) ? route.params.id[0] : route.params.id,
						),
						wf_template_repo_session_id: templatesStore.currentSessionId,
					};
				},
			},
			middleware: ['authenticated'],
		},
		beforeEnter: (to, _from, next) => {
			const posthogStore = usePostHog();
			if (
				posthogStore.getVariant(TEMPLATE_SETUP_EXPERIENCE.name) ===
				TEMPLATE_SETUP_EXPERIENCE.variant
			) {
				next({ name: VIEWS.TEMPLATE_IMPORT, params: { id: to.params.id } });
			} else {
				next();
			}
		},
	},
	{
		path: '/templates/',
		name: VIEWS.TEMPLATES,
		component: TemplatesSearchView,
		meta: {
			templatesEnabled: true,
			getRedirect: getTemplatesRedirect,
			// Templates view remembers it's scroll position on back
			scrollOffset: 0,
			telemetry: {
				getProperties() {
					const templatesStore = useTemplatesStore();
					return {
						wf_template_repo_session_id: templatesStore.currentSessionId,
					};
				},
			},
			setScrollPosition(pos: number) {
				this.scrollOffset = pos;
			},
			middleware: ['authenticated'],
		},
		beforeEnter: (_to, _from, next) => {
			const templatesStore = useTemplatesStore();
			if (!templatesStore.hasCustomTemplatesHost) {
				window.location.href = templatesStore.websiteTemplateRepositoryURL;
			} else {
				next();
			}
		},
	},
	{
		path: '/resource-center',
		name: VIEWS.RESOURCE_CENTER,
		component: ResourceCenterView,
		meta: {
			middleware: ['authenticated'],
		},
	},
	{
		path: '/resource-center/section/:sectionId',
		name: VIEWS.RESOURCE_CENTER_SECTION,
		component: ResourceCenterSectionView,
		meta: {
			middleware: ['authenticated'],
		},
	},
	{
		path: '/workflow/:name/debug/:executionId',
		name: VIEWS.EXECUTION_DEBUG,
		component: NodeView,
		meta: {
			layout: 'workflow',
			layoutProps: { logs: true },
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
		component: WorkflowExecutionsView,
		meta: {
			layout: 'workflow',
			keepWorkflowAlive: true,
			middleware: ['authenticated'],
		},
		children: [
			{
				path: '',
				name: VIEWS.EXECUTION_HOME,
				components: {
					executionPreview: WorkflowExecutionsLandingPage,
				},
				meta: {
					keepWorkflowAlive: true,
					middleware: ['authenticated'],
				},
			},
			{
				path: ':executionId/:nodeId?',
				name: VIEWS.EXECUTION_PREVIEW,
				components: {
					executionPreview: WorkflowExecutionsPreview,
				},
				meta: {
					keepWorkflowAlive: true,
					middleware: ['authenticated'],
				},
			},
		],
	},
	{
		path: '/workflow/:name/evaluation',
		name: VIEWS.EVALUATION,
		component: EvaluationRootView,
		props: true,
		meta: {
			layout: 'workflow',
			keepWorkflowAlive: true,
			middleware: ['authenticated'],
		},
		children: [
			{
				path: '',
				name: VIEWS.EVALUATION_EDIT,
				component: EvaluationsView,
				props: true,
			},
			{
				path: 'test-runs/:runId',
				name: VIEWS.EVALUATION_RUNS_DETAIL,
				component: TestRunDetailView,
				props: true,
			},
		],
	},
	{
		path: '/workflow/:workflowId/history/:versionId?',
		name: VIEWS.WORKFLOW_HISTORY,
		component: WorkflowHistory,
		meta: {
			middleware: ['authenticated'],
		},
	},
	{
		path: '/workflows/templates/:id',
		name: VIEWS.TEMPLATE_IMPORT,
		component: NodeView,
		meta: {
			layout: 'workflow',
			templatesEnabled: true,
			keepWorkflowAlive: true,
			getRedirect: getTemplatesRedirect,
			middleware: ['authenticated'],
		},
	},
	{
		path: '/workflows/onboarding/:id',
		name: VIEWS.WORKFLOW_ONBOARDING,
		component: WorkflowOnboardingView,
		meta: {
			layout: 'workflow',
			templatesEnabled: true,
			keepWorkflowAlive: true,
			getRedirect: () => getTemplatesRedirect(VIEWS.NEW_WORKFLOW),
			middleware: ['authenticated'],
		},
	},
	{
		path: '/workflow/new',
		name: VIEWS.NEW_WORKFLOW,
		component: NodeView,
		meta: {
			layout: 'workflow',
			layoutProps: { logs: true },
			nodeView: true,
			keepWorkflowAlive: true,
			middleware: ['authenticated'],
		},
		beforeEnter: (to) => {
			// Generate a unique workflow ID using nanoid and redirect to it
			// Preserve existing query params (e.g., templateId, projectId) and add new=true
			const newWorkflowId = nanoid();
			return {
				name: VIEWS.WORKFLOW,
				params: { name: newWorkflowId },
				query: { ...to.query, new: 'true' },
			};
		},
	},
	{
		path: '/workflows/demo',
		name: VIEWS.DEMO,
		component: NodeView,
		meta: {
			layout: 'demo',
			middleware: ['authenticated'],
			middlewareOptions: {
				authenticated: {
					bypass: () => {
						const settingsStore = useSettingsStore();
						return settingsStore.isPreviewMode;
					},
				},
			},
		},
	},
	{
		path: '/workflows/demo/diff',
		name: VIEWS.DEMO_DIFF,
		component: async () => await import('@/app/views/DemoDiffView.vue'),
		meta: {
			layout: 'demo',
			middleware: ['authenticated'],
			middlewareOptions: {
				authenticated: {
					bypass: () => {
						const settingsStore = useSettingsStore();
						return settingsStore.isPreviewMode;
					},
				},
			},
		},
	},
	{
		path: '/workflow/:name/:nodeId?',
		name: VIEWS.WORKFLOW,
		component: NodeView,
		meta: {
			layout: 'workflow',
			layoutProps: { logs: true },
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
		path: '/signin',
		name: VIEWS.SIGNIN,
		component: SigninView,
		meta: {
			layout: 'auth',
			telemetry: {
				pageCategory: 'auth',
			},
			middleware: ['guest'],
		},
	},
	{
		path: '/signup',
		name: VIEWS.SIGNUP,
		component: SignupView,
		meta: {
			layout: 'auth',
			telemetry: {
				pageCategory: 'auth',
			},
			middleware: ['guest'],
		},
	},
	{
		path: '/signout',
		name: VIEWS.SIGNOUT,
		component: SignoutView,
		meta: {
			layout: 'auth',
			telemetry: {
				pageCategory: 'auth',
			},
			middleware: ['authenticated'],
		},
	},
	{
		path: '/oauth/consent',
		name: VIEWS.OAUTH_CONSENT,
		component: OAuthConsentView,
		meta: {
			middleware: ['authenticated'],
		},
	},
	{
		path: '/setup',
		name: VIEWS.SETUP,
		component: SetupView,
		meta: {
			layout: 'auth',
			middleware: ['defaultUser'],
			telemetry: {
				pageCategory: 'auth',
			},
		},
	},
	{
		path: '/forgot-password',
		name: VIEWS.FORGOT_PASSWORD,
		component: ForgotMyPasswordView,
		meta: {
			layout: 'auth',
			middleware: ['guest'],
			telemetry: {
				pageCategory: 'auth',
			},
		},
	},
	{
		path: '/change-password',
		name: VIEWS.CHANGE_PASSWORD,
		component: ChangePasswordView,
		meta: {
			layout: 'auth',
			middleware: ['guest'],
			telemetry: {
				pageCategory: 'auth',
			},
		},
	},
	{
		path: '/settings',
		name: VIEWS.SETTINGS,
		props: true,
		redirect: () => {
			const settingsStore = useSettingsStore();
			if (settingsStore.settings.hideUsagePage) {
				return { name: VIEWS.PERSONAL_SETTINGS };
			}
			return { name: VIEWS.USAGE };
		},
		meta: {
			layout: 'settings',
		},
		children: [
			{
				path: 'usage',
				name: VIEWS.USAGE,
				component: SettingsUsageAndPlan,
				meta: {
					layout: 'settings',
					middleware: ['authenticated', 'custom'],
					middlewareOptions: {
						custom: () => {
							const settingsStore = useSettingsStore();
							return !settingsStore.settings.hideUsagePage;
						},
					},
					telemetry: {
						pageCategory: 'settings',
						getProperties() {
							return {
								feature: 'usage',
							};
						},
					},
				},
			},
			{
				path: 'migration-report',
				component: RouterView,
				children: [
					{
						path: '',
						name: VIEWS.MIGRATION_REPORT,
						component: MigrationReportView,
					},
					{
						path: ':migrationRuleId',
						name: VIEWS.MIGRATION_RULE_REPORT,
						component: MigrationRuleReportView,
						props: true,
					},
				],
				meta: {
					middleware: ['authenticated', 'rbac'],
					middlewareOptions: {
						rbac: {
							scope: ['breakingChanges:list'],
						},
					},
					telemetry: {
						pageCategory: 'settings',
						getProperties() {
							return {
								feature: 'migration-report',
							};
						},
					},
				},
			},
			{
				path: 'personal',
				name: VIEWS.PERSONAL_SETTINGS,
				component: SettingsPersonalView,
				meta: {
					middleware: ['authenticated'],
					telemetry: {
						pageCategory: 'settings',
						getProperties() {
							return {
								feature: 'personal',
							};
						},
					},
				},
			},
			{
				path: 'users',
				name: VIEWS.USERS_SETTINGS,
				component: SettingsUsersView,
				meta: {
					middleware: ['authenticated', 'rbac'],
					middlewareOptions: {
						rbac: {
							scope: ['user:create', 'user:update'],
						},
					},
					telemetry: {
						pageCategory: 'settings',
						getProperties() {
							return {
								feature: 'users',
							};
						},
					},
				},
			},
			{
				path: 'resolvers',
				name: VIEWS.RESOLVERS,
				component: SettingsResolversView,
				meta: {
					middleware: ['authenticated', 'custom'],
					middlewareOptions: {
						custom: () => {
							const { check } = useEnvFeatureFlag();
							return check.value('DYNAMIC_CREDENTIALS');
						},
					},
					telemetry: {
						pageCategory: 'settings',
						getProperties() {
							return {
								feature: 'resolvers',
							};
						},
					},
				},
			},
			{
				path: 'project-roles',
				component: RouterView,
				children: [
					{
						path: '',
						name: VIEWS.PROJECT_ROLES_SETTINGS,
						component: async () => await import('@/features/project-roles/ProjectRolesView.vue'),
					},
					{
						path: 'new',
						name: VIEWS.PROJECT_NEW_ROLE,
						component: async () => await import('@/features/project-roles/ProjectRoleView.vue'),
					},
					{
						path: 'edit/:roleSlug',
						name: VIEWS.PROJECT_ROLE_SETTINGS,
						component: async () => await import('@/features/project-roles/ProjectRoleView.vue'),
						props: true,
					},
				],
				meta: {
					middleware: ['authenticated', 'rbac'],
					middlewareOptions: {
						rbac: {
							scope: ['role:manage'],
						},
					},
					telemetry: {
						pageCategory: 'settings',
						getProperties() {
							return {
								feature: 'project-roles',
							};
						},
					},
				},
			},
			{
				path: 'api',
				name: VIEWS.API_SETTINGS,
				component: SettingsApiView,
				meta: {
					middleware: ['authenticated', 'rbac'],
					middlewareOptions: {
						rbac: {
							scope: ['apiKey:manage'],
						},
					},
					telemetry: {
						pageCategory: 'settings',
						getProperties() {
							return {
								feature: 'api',
							};
						},
					},
				},
			},
			{
				path: 'environments',
				name: VIEWS.SOURCE_CONTROL,
				component: SettingsSourceControl,
				meta: {
					middleware: ['authenticated', 'rbac'],
					middlewareOptions: {
						rbac: {
							scope: 'sourceControl:manage',
						},
					},
					telemetry: {
						pageCategory: 'settings',
						getProperties() {
							return {
								feature: 'environments',
							};
						},
					},
				},
			},
			{
				path: 'external-secrets',
				name: VIEWS.EXTERNAL_SECRETS_SETTINGS,
				component: SettingsExternalSecrets,
				meta: {
					middleware: ['authenticated', 'rbac'],
					middlewareOptions: {
						rbac: {
							scope: ['externalSecretsProvider:list', 'externalSecretsProvider:update'],
						},
					},
					telemetry: {
						pageCategory: 'settings',
						getProperties() {
							return {
								feature: 'external-secrets',
							};
						},
					},
				},
			},
			{
				path: 'sso',
				name: VIEWS.SSO_SETTINGS,
				component: SettingsSso,
				meta: {
					middleware: ['authenticated', 'rbac'],
					middlewareOptions: {
						rbac: {
							scope: 'saml:manage',
						},
					},
					telemetry: {
						pageCategory: 'settings',
						getProperties() {
							return {
								feature: 'sso',
							};
						},
					},
				},
			},
			{
				path: 'log-streaming',
				name: VIEWS.LOG_STREAMING_SETTINGS,
				component: SettingsLogStreamingView,
				meta: {
					middleware: ['authenticated', 'rbac'],
					middlewareOptions: {
						rbac: {
							scope: 'logStreaming:manage',
						},
					},
					telemetry: {
						pageCategory: 'settings',
					},
				},
			},
			{
				path: 'workers',
				name: VIEWS.WORKER_VIEW,
				component: WorkerView,
				meta: {
					middleware: ['authenticated', 'rbac'],
					middlewareOptions: {
						rbac: {
							scope: 'workersView:manage',
						},
					},
				},
			},
			{
				path: 'community-nodes',
				name: VIEWS.COMMUNITY_NODES,
				component: SettingsCommunityNodesView,
				meta: {
					middleware: ['authenticated', 'rbac', 'custom'],
					middlewareOptions: {
						rbac: {
							scope: ['communityPackage:list', 'communityPackage:update'],
						},
						custom: () => {
							const settingsStore = useSettingsStore();
							return settingsStore.isCommunityNodesFeatureEnabled;
						},
					},
					telemetry: {
						pageCategory: 'settings',
					},
				},
			},
			{
				path: 'ldap',
				name: VIEWS.LDAP_SETTINGS,
				component: SettingsLdapView,
				meta: {
					middleware: ['authenticated', 'rbac'],
					middlewareOptions: {
						rbac: {
							scope: 'ldap:manage',
						},
					},
				},
			},
		],
	},
	{
		path: '/saml/onboarding',
		name: VIEWS.SAML_ONBOARDING,
		component: SamlOnboarding,
		meta: {
			layout: 'auth',
			middleware: ['authenticated', 'custom'],
			middlewareOptions: {
				custom: () => {
					const settingsStore = useSettingsStore();
					const ssoStore = useSSOStore();
					return ssoStore.isEnterpriseSamlEnabled && !settingsStore.isCloudDeployment;
				},
			},
			telemetry: {
				pageCategory: 'auth',
			},
		},
	},
	...projectsRoutes,
	{
		path: '/entity-not-found/:entityType(credential|workflow)',
		props: true,
		name: VIEWS.ENTITY_NOT_FOUND,
		component: EntityNotFound,
	},
	{
		path: '/entity-not-authorized/:entityType(credential|workflow)',
		props: true,
		name: VIEWS.ENTITY_UNAUTHORIZED,
		component: EntityUnAuthorised,
	},
	{
		path: '/:pathMatch(.*)*',
		name: VIEWS.NOT_FOUND,
		component: ErrorView,
		props: {
			messageKey: 'error.pageNotFound',
			errorCode: 404,
			redirectTextKey: 'error.goBack',
			redirectPage: VIEWS.HOMEPAGE,
		},
		meta: {
			nodeView: true,
			telemetry: {
				disabled: true,
			},
		},
	},
];

function withCanvasReadOnlyMeta(route: RouteRecordRaw) {
	if (!route.meta) {
		route.meta = {};
	}
	route.meta.readOnlyCanvas = !EDITABLE_CANVAS_VIEWS.includes((route?.name ?? '') as VIEWS);

	if (route.children) {
		route.children = route.children.map(withCanvasReadOnlyMeta);
	}

	return route;
}

const router = createRouter({
	history: createWebHistory(import.meta.env.DEV ? '/' : (window.BASE_PATH ?? '/')),
	scrollBehavior(to: RouteLocationNormalized, _, savedPosition) {
		// saved position == null means the page is NOT visited from history (back button)
		if (savedPosition === null && to.name === VIEWS.TEMPLATES && to.meta?.setScrollPosition) {
			// for templates view, reset scroll position in this case
			to.meta.setScrollPosition(0);
		}
	},
	routes: routes.map(withCanvasReadOnlyMeta),
});

router.beforeEach(async (to: RouteLocationNormalized, from, next) => {
	try {
		/**
		 * Initialize application core
		 * This step executes before first route is loaded and is required for permission checks
		 */

		await initializeCore();
		// Pass undefined for first param to use default
		await initializeAuthenticatedFeatures(undefined, to.name as string);

		/**
		 * Redirect to setup page. User should be redirected to this only once
		 */

		const settingsStore = useSettingsStore();
		if (settingsStore.showSetupPage) {
			if (to.name === VIEWS.SETUP) {
				return next();
			}

			return next({ name: VIEWS.SETUP });
		}

		/**
		 * Verify user permissions for current route
		 */

		const routeMiddleware = to.meta?.middleware ?? [];
		const routeMiddlewareOptions = to.meta?.middlewareOptions ?? {};
		for (const middlewareName of routeMiddleware) {
			let nextCalled = false;
			const middlewareNext = ((location: RouteLocationRaw): void => {
				next(location);
				nextCalled = true;
			}) as NavigationGuardNext;

			const middlewareOptions = routeMiddlewareOptions[middlewareName];
			const middlewareFn = middleware[middlewareName] as RouterMiddleware<unknown>;
			await middlewareFn(to, from, middlewareNext, middlewareOptions);

			if (nextCalled) {
				return;
			}
		}

		return next();
	} catch (failure) {
		const settingsStore = useSettingsStore();
		if (failure instanceof MfaRequiredError && settingsStore.isMFAEnforced) {
			if (to.name !== VIEWS.PERSONAL_SETTINGS) {
				return next({ name: VIEWS.PERSONAL_SETTINGS });
			} else {
				return next();
			}
		}
		if (isNavigationFailure(failure)) {
			console.log(failure);
		} else {
			console.error(failure);
		}
	}
});

router.afterEach((to, from) => {
	try {
		const telemetry = useTelemetry();
		const uiStore = useUIStore();
		const templatesStore = useTemplatesStore();

		/**
		 * Run external hooks
		 */

		void useExternalHooks().run('main.routeChange', { from, to });

		/**
		 * Track current view for telemetry
		 */

		uiStore.currentView = (to.name as string) ?? '';
		if (to.meta?.templatesEnabled) {
			templatesStore.setSessionId();
		} else {
			templatesStore.resetSessionId(); // reset telemetry session id when user leaves template pages
		}
		telemetry.page(to);

		const { trackResourceOpened } = useRecentResources();
		trackResourceOpened(to);
	} catch (failure) {
		if (isNavigationFailure(failure)) {
			console.log(failure);
		} else {
			console.error(failure);
		}
	}
});

export default router;
