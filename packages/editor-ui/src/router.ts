import { useStorage } from '@vueuse/core';
import type { RouteLocation, RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';
import type { IPermissions } from './Interface';
import { LOGIN_STATUS, ROLE } from '@/utils';
import { useSettingsStore } from './stores/settings.store';
import { useTemplatesStore } from './stores/templates.store';
import { useSSOStore } from './stores/sso.store';
import { EnterpriseEditionFeature, VIEWS } from '@/constants';

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
		redirect: () => {
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
			default: async () => import('./views/TemplatesCollectionView.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
			default: async () => import('./views/TemplatesWorkflowView.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
			default: async () => import('./views/TemplatesSearchView.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
			default: async () => import('./views/CredentialsView.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
			default: async () => import('./views/VariablesView.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
			default: async () => import('./views/ExecutionsView.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
			default: async () => import('./views/WorkflowsView.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
			default: async () => import('./views/NodeView.vue'),
			header: async () => import('./components/MainHeader/MainHeader.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
			default: async () => import('./components/ExecutionsView/ExecutionsList.vue'),
			header: async () => import('./components/MainHeader/MainHeader.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
					executionPreview: async () =>
						import('./components/ExecutionsView/ExecutionsLandingPage.vue'),
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
					executionPreview: async () => import('./components/ExecutionsView/ExecutionPreview.vue'),
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
			default: async () => import('./views/WorkflowHistory.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
			default: async () => import('./views/NodeView.vue'),
			header: async () => import('./components/MainHeader/MainHeader.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
			default: async () => import('./views/WorkflowOnboardingView.vue'),
			header: async () => import('./components/MainHeader/MainHeader.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
			default: async () => import('./views/NodeView.vue'),
			header: async () => import('./components/MainHeader/MainHeader.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
			default: async () => import('./views/NodeView.vue'),
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
			default: async () => import('./views/NodeView.vue'),
			header: async () => import('./components/MainHeader/MainHeader.vue'),
			sidebar: async () => import('./components/MainSidebar.vue'),
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
			default: async () => import('./views/SigninView.vue'),
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
			default: async () => import('./views/SignupView.vue'),
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
			default: async () => import('./views/SignoutView.vue'),
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
			default: async () => import('./views/SetupView.vue'),
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
			default: async () => import('./views/ForgotMyPasswordView.vue'),
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
			default: async () => import('./views/ChangePasswordView.vue'),
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
		component: async () => import('./views/SettingsView.vue'),
		props: true,
		children: [
			{
				path: 'usage',
				name: VIEWS.USAGE,
				components: {
					settingsView: async () => import('./views/SettingsUsageAndPlan.vue'),
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
					settingsView: async () => import('./views/SettingsPersonalView.vue'),
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
					settingsView: async () => import('./views/SettingsUsersView.vue'),
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
					settingsView: async () => import('./views/SettingsApiView.vue'),
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
					settingsView: async () => import('./views/SettingsSourceControl.vue'),
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
					settingsView: async () => import('./views/SettingsExternalSecrets.vue'),
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
					settingsView: async () => import('./views/SettingsSso.vue'),
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
					settingsView: async () => import('./views/SettingsLogStreamingView.vue'),
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
					settingsView: async () => import('./views/SettingsCommunityNodesView.vue'),
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
					settingsView: async () => import('./views/SettingsFakeDoorView.vue'),
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
					settingsView: async () => import('./views/SettingsLdapView.vue'),
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
					settingsView: async () => import('./views/SettingsAuditLogs.vue'),
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
							shouldDeny: () => !useStorage('audit-logs', undefined).value,
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
			default: async () => import('./views/SamlOnboarding.vue'),
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
		component: async () => import('./views/ErrorView.vue'),
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

export default router;
