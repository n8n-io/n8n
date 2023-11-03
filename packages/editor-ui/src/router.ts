import { useStorage } from '@/composables/useStorage';

import type { RouteLocation, RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';
import type { IPermissions } from './Interface';
import { isAuthorized, LOGIN_STATUS, ROLE, runExternalHook } from '@/utils';
import { useSettingsStore } from './stores/settings.store';
import { useUsersStore } from './stores/users.store';
import { useTemplatesStore } from './stores/templates.store';
import { useUIStore } from '@/stores/ui.store';
import { useSSOStore } from './stores/sso.store';
import { useWebhooksStore } from '@/stores/webhooks.store';
import { EnterpriseEditionFeature, VIEWS } from '@/constants';
import { useTelemetry } from '@/composables';

const ChangePasswordView = async () => import('./views/ChangePasswordView.vue');
const ErrorView = async () => import('./views/ErrorView.vue');
const ForgotMyPasswordView = async () => import('./views/ForgotMyPasswordView.vue');
const MainHeader = async () => import('@/components/MainHeader/MainHeader.vue');
const MainSidebar = async () => import('@/components/MainSidebar.vue');
const NodeView = async () => import('@/views/NodeView.vue');
const WorkflowExecutionsList = async () => import('@/components/ExecutionsView/ExecutionsList.vue');
const ExecutionsLandingPage = async () =>
	import('@/components/ExecutionsView/ExecutionsLandingPage.vue');
const ExecutionPreview = async () => import('@/components/ExecutionsView/ExecutionPreview.vue');
const SettingsView = async () => import('./views/SettingsView.vue');
const SettingsLdapView = async () => import('./views/SettingsLdapView.vue');
const SettingsPersonalView = async () => import('./views/SettingsPersonalView.vue');
const SettingsUsersView = async () => import('./views/SettingsUsersView.vue');
const SettingsCommunityNodesView = async () => import('./views/SettingsCommunityNodesView.vue');
const SettingsApiView = async () => import('./views/SettingsApiView.vue');
const SettingsLogStreamingView = async () => import('./views/SettingsLogStreamingView.vue');
const SettingsFakeDoorView = async () => import('./views/SettingsFakeDoorView.vue');
const SetupView = async () => import('./views/SetupView.vue');
const SigninView = async () => import('./views/SigninView.vue');
const SignupView = async () => import('./views/SignupView.vue');
const TemplatesCollectionView = async () => import('@/views/TemplatesCollectionView.vue');
const TemplatesWorkflowView = async () => import('@/views/TemplatesWorkflowView.vue');
const TemplatesSearchView = async () => import('@/views/TemplatesSearchView.vue');
const CredentialsView = async () => import('@/views/CredentialsView.vue');
const ExecutionsView = async () => import('@/views/ExecutionsView.vue');
const WorkflowsView = async () => import('@/views/WorkflowsView.vue');
const VariablesView = async () => import('@/views/VariablesView.vue');
const SettingsUsageAndPlan = async () => import('./views/SettingsUsageAndPlan.vue');
const SettingsSso = async () => import('./views/SettingsSso.vue');
const SignoutView = async () => import('@/views/SignoutView.vue');
const SamlOnboarding = async () => import('@/views/SamlOnboarding.vue');
const SettingsSourceControl = async () => import('./views/SettingsSourceControl.vue');
const SettingsExternalSecrets = async () => import('./views/SettingsExternalSecrets.vue');
const SettingsAuditLogs = async () => import('./views/SettingsAuditLogs.vue');
const WorkflowHistory = async () => import('@/views/WorkflowHistory.vue');
const WorkflowOnboardingView = async () => import('@/views/WorkflowOnboardingView.vue');

interface IRouteConfig {
	meta: {
		nodeView?: boolean;
		templatesEnabled?: boolean;
		getRedirect?: () => { name: string } | false;
		permissions: IPermissions;
		telemetry?: {
			disabled?: true;
			getProperties: (route: RouteLocation) => object;
		};
		scrollOffset?: number;
	};
}

function getTemplatesRedirect(defaultRedirect: VIEWS[keyof VIEWS]) {
	const settingsStore = useSettingsStore();
	const isTemplatesEnabled: boolean = settingsStore.isTemplatesEnabled;
	if (!isTemplatesEnabled) {
		return { name: defaultRedirect || VIEWS.NOT_FOUND };
	}

	return false;
}

export const routes = [
	{
		path: '/',
		name: VIEWS.HOMEPAGE,
		redirect: (to) => {
			return { name: VIEWS.WORKFLOWS };
		},
		meta: {
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
		},
	},
	{
		path: '/collections/:id',
		name: VIEWS.COLLECTION,
		components: {
			default: TemplatesCollectionView,
			sidebar: MainSidebar,
		},
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
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
		},
	},
	{
		path: '/templates/:id',
		name: VIEWS.TEMPLATE,
		components: {
			default: TemplatesWorkflowView,
			sidebar: MainSidebar,
		},
		meta: {
			templatesEnabled: true,
			getRedirect: getTemplatesRedirect,
			telemetry: {
				getProperties(route: RouteLocation) {
					const templatesStore = useTemplatesStore();
					return {
						template_id: route.params.id,
						wf_template_repo_session_id: templatesStore.currentSessionId,
					};
				},
			},
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
		},
	},
	{
		path: '/templates/',
		name: VIEWS.TEMPLATES,
		components: {
			default: TemplatesSearchView,
			sidebar: MainSidebar,
		},
		meta: {
			templatesEnabled: true,
			getRedirect: getTemplatesRedirect,
			// Templates view remembers it's scroll position on back
			scrollOffset: 0,
			telemetry: {
				getProperties(route: RouteLocation) {
					const templatesStore = useTemplatesStore();
					return {
						wf_template_repo_session_id: templatesStore.currentSessionId,
					};
				},
			},
			setScrollPosition(pos: number) {
				this.scrollOffset = pos;
			},
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
		},
	},
	{
		path: '/credentials',
		name: VIEWS.CREDENTIALS,
		components: {
			default: CredentialsView,
			sidebar: MainSidebar,
		},
		meta: {
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
		},
	},
	{
		path: '/variables',
		name: VIEWS.VARIABLES,
		components: {
			default: VariablesView,
			sidebar: MainSidebar,
		},
		meta: {
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
		},
	},
	{
		path: '/executions',
		name: VIEWS.EXECUTIONS,
		components: {
			default: ExecutionsView,
			sidebar: MainSidebar,
		},
		meta: {
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
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
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
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
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
				deny: {
					shouldDeny: () =>
						!useSettingsStore().isEnterpriseFeatureEnabled(EnterpriseEditionFeature.DebugInEditor),
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
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
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
					permissions: {
						allow: {
							loginStatus: [LOGIN_STATUS.LoggedIn],
						},
					},
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
					permissions: {
						allow: {
							loginStatus: [LOGIN_STATUS.LoggedIn],
						},
					},
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
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
				deny: {
					shouldDeny: () =>
						!useSettingsStore().isEnterpriseFeatureEnabled(
							EnterpriseEditionFeature.WorkflowHistory,
						),
				},
			},
		},
	},
	{
		path: '/workflows/templates/:id',
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
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
		},
	},
	{
		path: '/workflows/onboarding/:id',
		name: VIEWS.WORKFLOW_ONBOARDING,
		components: {
			default: WorkflowOnboardingView,
			header: MainHeader,
			sidebar: MainSidebar,
		},
		meta: {
			templatesEnabled: true,
			keepWorkflowAlive: true,
			getRedirect: () => getTemplatesRedirect(VIEWS.NEW_WORKFLOW),
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
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
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
		},
	},
	{
		path: '/workflows/demo',
		name: VIEWS.DEMO,
		components: {
			default: NodeView,
		},
		meta: {
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
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
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
		},
	},
	{
		path: '/workflow',
		redirect: '/workflow/new',
	},
	{
		path: '/signin',
		name: VIEWS.SIGNIN,
		components: {
			default: SigninView,
		},
		meta: {
			telemetry: {
				pageCategory: 'auth',
			},
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedOut],
				},
			},
		},
	},
	{
		path: '/signup',
		name: VIEWS.SIGNUP,
		components: {
			default: SignupView,
		},
		meta: {
			telemetry: {
				pageCategory: 'auth',
			},
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedOut],
				},
			},
		},
	},
	{
		path: '/signout',
		name: VIEWS.SIGNOUT,
		components: {
			default: SignoutView,
		},
		meta: {
			telemetry: {
				pageCategory: 'auth',
			},
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
		},
	},
	{
		path: '/setup',
		name: VIEWS.SETUP,
		components: {
			default: SetupView,
		},
		meta: {
			telemetry: {
				pageCategory: 'auth',
			},
			permissions: {
				allow: {
					role: [ROLE.Default],
				},
			},
		},
	},
	{
		path: '/forgot-password',
		name: VIEWS.FORGOT_PASSWORD,
		components: {
			default: ForgotMyPasswordView,
		},
		meta: {
			telemetry: {
				pageCategory: 'auth',
			},
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedOut],
				},
			},
		},
	},
	{
		path: '/change-password',
		name: VIEWS.CHANGE_PASSWORD,
		components: {
			default: ChangePasswordView,
		},
		meta: {
			telemetry: {
				pageCategory: 'auth',
			},
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedOut],
				},
			},
		},
	},
	{
		path: '/settings',
		component: SettingsView,
		props: true,
		children: [
			{
				path: 'usage',
				name: VIEWS.USAGE,
				components: {
					settingsView: SettingsUsageAndPlan,
				},
				meta: {
					telemetry: {
						pageCategory: 'settings',
						getProperties(route: RouteLocation) {
							return {
								feature: 'usage',
							};
						},
					},
					permissions: {
						allow: {
							loginStatus: [LOGIN_STATUS.LoggedIn],
						},
						deny: {
							shouldDeny: () => {
								const settingsStore = useSettingsStore();
								return (
									settingsStore.settings.hideUsagePage ||
									settingsStore.settings.deployment?.type === 'cloud'
								);
							},
						},
					},
				},
			},
			{
				path: 'personal',
				name: VIEWS.PERSONAL_SETTINGS,
				components: {
					settingsView: SettingsPersonalView,
				},
				meta: {
					telemetry: {
						pageCategory: 'settings',
						getProperties(route: RouteLocation) {
							return {
								feature: 'personal',
							};
						},
					},
					permissions: {
						allow: {
							loginStatus: [LOGIN_STATUS.LoggedIn],
						},
						deny: {
							role: [ROLE.Default],
						},
					},
				},
			},
			{
				path: 'users',
				name: VIEWS.USERS_SETTINGS,
				components: {
					settingsView: SettingsUsersView,
				},
				meta: {
					telemetry: {
						pageCategory: 'settings',
						getProperties(route: RouteLocation) {
							return {
								feature: 'users',
							};
						},
					},
					permissions: {
						allow: {
							role: [ROLE.Owner],
						},
					},
				},
			},
			{
				path: 'api',
				name: VIEWS.API_SETTINGS,
				components: {
					settingsView: SettingsApiView,
				},
				meta: {
					telemetry: {
						pageCategory: 'settings',
						getProperties(route: RouteLocation) {
							return {
								feature: 'api',
							};
						},
					},
					permissions: {
						allow: {
							loginStatus: [LOGIN_STATUS.LoggedIn],
						},
						deny: {
							shouldDeny: () => {
								const settingsStore = useSettingsStore();
								return !settingsStore.isPublicApiEnabled;
							},
						},
					},
				},
			},
			{
				path: 'environments',
				name: VIEWS.SOURCE_CONTROL,
				components: {
					settingsView: SettingsSourceControl,
				},
				meta: {
					telemetry: {
						pageCategory: 'settings',
						getProperties(route: RouteLocation) {
							return {
								feature: 'environments',
							};
						},
					},
					permissions: {
						allow: {
							role: [ROLE.Owner],
						},
					},
				},
			},
			{
				path: 'external-secrets',
				name: VIEWS.EXTERNAL_SECRETS_SETTINGS,
				components: {
					settingsView: SettingsExternalSecrets,
				},
				meta: {
					telemetry: {
						pageCategory: 'settings',
						getProperties(route: Route) {
							return {
								feature: 'external-secrets',
							};
						},
					},
					permissions: {
						allow: {
							role: [ROLE.Owner],
						},
					},
				},
			},
			{
				path: 'sso',
				name: VIEWS.SSO_SETTINGS,
				components: {
					settingsView: SettingsSso,
				},
				meta: {
					telemetry: {
						pageCategory: 'settings',
						getProperties(route: RouteLocation) {
							return {
								feature: 'sso',
							};
						},
					},
					permissions: {
						allow: {
							role: [ROLE.Owner],
						},
						deny: {
							shouldDeny: () => {
								const settingsStore = useSettingsStore();
								return settingsStore.isDesktopDeployment;
							},
						},
					},
				},
			},
			{
				path: 'log-streaming',
				name: VIEWS.LOG_STREAMING_SETTINGS,
				components: {
					settingsView: SettingsLogStreamingView,
				},
				meta: {
					telemetry: {
						pageCategory: 'settings',
					},
					permissions: {
						allow: {
							role: [ROLE.Owner],
						},
						deny: {
							role: [ROLE.Member],
						},
					},
				},
			},
			{
				path: 'community-nodes',
				name: VIEWS.COMMUNITY_NODES,
				components: {
					settingsView: SettingsCommunityNodesView,
				},
				meta: {
					telemetry: {
						pageCategory: 'settings',
					},
					permissions: {
						allow: {
							role: [ROLE.Owner],
						},
						deny: {
							shouldDeny: () => {
								const settingsStore = useSettingsStore();
								return !settingsStore.isCommunityNodesFeatureEnabled;
							},
						},
					},
				},
			},
			{
				path: 'coming-soon/:featureId',
				name: VIEWS.FAKE_DOOR,
				components: {
					settingsView: SettingsFakeDoorView,
				},
				meta: {
					telemetry: {
						pageCategory: 'settings',
						getProperties(route: RouteLocation) {
							return {
								feature: route.params.featureId,
							};
						},
					},
					permissions: {
						allow: {
							loginStatus: [LOGIN_STATUS.LoggedIn],
						},
					},
				},
			},
			{
				path: 'ldap',
				name: VIEWS.LDAP_SETTINGS,
				components: {
					settingsView: SettingsLdapView,
				},
				meta: {
					permissions: {
						allow: {
							role: [ROLE.Owner],
						},
						deny: {
							role: [ROLE.Member],
						},
					},
				},
			},
			{
				path: 'audit-logs',
				name: VIEWS.AUDIT_LOGS,
				components: {
					settingsView: SettingsAuditLogs,
				},
				meta: {
					telemetry: {
						pageCategory: 'settings',
						getProperties(route: RouteLocation) {
							return {
								feature: 'audit-logs',
							};
						},
					},
					permissions: {
						allow: {
							role: [ROLE.Owner],
						},
						deny: {
							shouldDeny: () => !useStorage('audit-logs').value,
						},
					},
				},
			},
		],
	},
	{
		path: '/saml/onboarding',
		name: VIEWS.SAML_ONBOARDING,
		components: {
			default: SamlOnboarding,
		},
		meta: {
			telemetry: {
				pageCategory: 'auth',
			},
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
				deny: {
					shouldDeny: () => {
						const settingsStore = useSettingsStore();
						const ssoStore = useSSOStore();
						return (
							!ssoStore.isEnterpriseSamlEnabled ||
							settingsStore.isCloudDeployment ||
							settingsStore.isDesktopDeployment
						);
					},
				},
			},
		},
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
			permissions: {
				allow: {
					// TODO: Once custom permissions are merged, this needs to be updated with index validation
					loginStatus: [LOGIN_STATUS.LoggedIn, LOGIN_STATUS.LoggedOut],
				},
			},
		},
	},
] as Array<RouteRecordRaw & IRouteConfig>;

const router = createRouter({
	history: createWebHistory(import.meta.env.DEV ? '/' : window.BASE_PATH ?? '/'),
	scrollBehavior(to, from, savedPosition) {
		// saved position == null means the page is NOT visited from history (back button)
		if (savedPosition === null && to.name === VIEWS.TEMPLATES && to.meta) {
			// for templates view, reset scroll position in this case
			to.meta.setScrollPosition(0);
		}
	},
	routes,
});

router.beforeEach(async (to, from, next) => {
	/**
	 * Initialize stores before routing
	 */

	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	await settingsStore.initialize();
	await usersStore.initialize();

	/**
	 * Redirect to setup page. User should be redirected to this only once
	 */

	if (settingsStore.showSetupPage) {
		if (to.name === VIEWS.SETUP) {
			return next();
		}

		return next({ name: VIEWS.SETUP });
	}

	/**
	 * Verify user permissions for current route
	 */

	const currentUser = usersStore.currentUser;
	const permissions = to.meta?.permissions as IPermissions;
	const canUserAccessCurrentRoute = permissions && isAuthorized(permissions, currentUser);
	if (canUserAccessCurrentRoute) {
		return next();
	}

	/**
	 * If user cannot access the page and is not logged in, redirect to sign in
	 */

	if (!currentUser) {
		const redirect =
			to.query.redirect ||
			encodeURIComponent(`${window.location.pathname}${window.location.search}`);
		return next({ name: VIEWS.SIGNIN, query: { redirect } });
	}

	/**
	 * If user cannot access page but is logged in, respect sign in redirect
	 */

	if (to.name === VIEWS.SIGNIN && typeof to.query.redirect === 'string') {
		const redirect = decodeURIComponent(to.query.redirect);
		if (redirect.startsWith('/')) {
			// protect against phishing
			return next(redirect);
		}
	}

	/**
	 * Otherwise, redirect to home page
	 */

	return next({ name: VIEWS.HOMEPAGE });
});

router.afterEach((to, from) => {
	const telemetry = useTelemetry();
	const uiStore = useUIStore();
	const templatesStore = useTemplatesStore();

	/**
	 * Run external hooks
	 */

	void runExternalHook('main.routeChange', useWebhooksStore(), { from, to });

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
});

export default router;
