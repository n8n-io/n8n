import ChangePasswordView from './views/ChangePasswordView.vue';
import ErrorView from './views/ErrorView.vue';
import ForgotMyPasswordView from './views/ForgotMyPasswordView.vue';
import MainHeader from '@/components/MainHeader/MainHeader.vue';
import MainSidebar from '@/components/MainSidebar.vue';
import NodeView from '@/views/NodeView.vue';
import WorkflowExecutionsList from '@/components/ExecutionsView/ExecutionsList.vue';
import ExecutionsLandingPage from '@/components/ExecutionsView/ExecutionsLandingPage.vue';
import ExecutionPreview from '@/components/ExecutionsView/ExecutionPreview.vue';
import SettingsView from './views/SettingsView.vue';
import SettingsLdapView from './views/SettingsLdapView.vue';
import SettingsPersonalView from './views/SettingsPersonalView.vue';
import SettingsUsersView from './views/SettingsUsersView.vue';
import SettingsCommunityNodesView from './views/SettingsCommunityNodesView.vue';
import SettingsApiView from './views/SettingsApiView.vue';
import SettingsLogStreamingView from './views/SettingsLogStreamingView.vue';
import SettingsFakeDoorView from './views/SettingsFakeDoorView.vue';
import SetupView from './views/SetupView.vue';
import SigninView from './views/SigninView.vue';
import SignupView from './views/SignupView.vue';
import type { RouteLocation, RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';

import TemplatesCollectionView from '@/views/TemplatesCollectionView.vue';
import TemplatesWorkflowView from '@/views/TemplatesWorkflowView.vue';
import TemplatesSearchView from '@/views/TemplatesSearchView.vue';
import CredentialsView from '@/views/CredentialsView.vue';
import ExecutionsView from '@/views/ExecutionsView.vue';
import WorkflowsView from '@/views/WorkflowsView.vue';
import VariablesView from '@/views/VariablesView.vue';
import type { IPermissions } from './Interface';
import { LOGIN_STATUS, ROLE } from '@/utils';
import { useSettingsStore } from './stores/settings.store';
import { useTemplatesStore } from './stores/templates.store';
import { useSSOStore } from './stores/sso.store';
import SettingsUsageAndPlanVue from './views/SettingsUsageAndPlan.vue';
import SettingsSso from './views/SettingsSso.vue';
import SignoutView from '@/views/SignoutView.vue';
import SamlOnboarding from '@/views/SamlOnboarding.vue';
import SettingsSourceControl from './views/SettingsSourceControl.vue';
import SettingsAuditLogs from './views/SettingsAuditLogs.vue';
import { VIEWS } from '@/constants';

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

function getTemplatesRedirect() {
	const settingsStore = useSettingsStore();
	const isTemplatesEnabled: boolean = settingsStore.isTemplatesEnabled;
	if (!isTemplatesEnabled) {
		return { name: VIEWS.NOT_FOUND };
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
		path: '/workflow',
		redirect: '/workflow/new',
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
		path: '/workflow/new',
		name: VIEWS.NEW_WORKFLOW,
		components: {
			default: NodeView,
			header: MainHeader,
			sidebar: MainSidebar,
		},
		meta: {
			nodeView: true,
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
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
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
		path: '/workflows/templates/:id',
		name: VIEWS.TEMPLATE_IMPORT,
		components: {
			default: NodeView,
			header: MainHeader,
			sidebar: MainSidebar,
		},
		meta: {
			templatesEnabled: true,
			getRedirect: getTemplatesRedirect,
			permissions: {
				allow: {
					loginStatus: [LOGIN_STATUS.LoggedIn],
				},
			},
		},
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
					settingsView: SettingsUsageAndPlanVue,
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
									settingsStore.settings.hideUsagePage === true ||
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
								return settingsStore.isPublicApiEnabled === false;
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
								return settingsStore.isCommunityNodesFeatureEnabled === false;
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
								feature: route.params['featureId'],
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
							shouldDeny: () => !window.localStorage.getItem('audit-logs'),
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

export default router;
