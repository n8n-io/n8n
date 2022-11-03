import Vue from 'vue';

import ChangePasswordView from './views/ChangePasswordView.vue';
import ErrorView from './views/ErrorView.vue';
import ForgotMyPasswordView from './views/ForgotMyPasswordView.vue';
import MainHeader from '@/components/MainHeader/MainHeader.vue';
import MainSidebar from '@/components/MainSidebar.vue';
import NodeView from '@/views/NodeView.vue';
import ExecutionsView from '@/components/ExecutionsView/ExecutionsView.vue';
import ExecutionsLandingPage from '@/components/ExecutionsView/ExecutionsLandingPage.vue';
import ExecutionPreview from '@/components/ExecutionsView/ExecutionPreview.vue';
import SettingsPersonalView from './views/SettingsPersonalView.vue';
import SettingsUsersView from './views/SettingsUsersView.vue';
import SettingsCommunityNodesView from './views/SettingsCommunityNodesView.vue';
import SettingsApiView from './views/SettingsApiView.vue';
import SettingsFakeDoorView from './views/SettingsFakeDoorView.vue';
import SetupView from './views/SetupView.vue';
import SigninView from './views/SigninView.vue';
import SignupView from './views/SignupView.vue';
import Router, { Route } from 'vue-router';

import TemplatesCollectionView from '@/views/TemplatesCollectionView.vue';
import TemplatesWorkflowView from '@/views/TemplatesWorkflowView.vue';
import TemplatesSearchView from '@/views/TemplatesSearchView.vue';
import CredentialsView from '@/views/CredentialsView.vue';
import WorkflowsView from '@/views/WorkflowsView.vue';
import { Store } from 'vuex';
import { IPermissions, IRootState } from './Interface';
import { LOGIN_STATUS, ROLE } from './modules/userHelpers';
import { RouteConfigSingleView } from 'vue-router/types/router';
import { VIEWS } from './constants';
import { store } from './store';

Vue.use(Router);

interface IRouteConfig extends RouteConfigSingleView {
	meta: {
		nodeView?: boolean;
		templatesEnabled?: boolean;
		getRedirect?: (store: Store<IRootState>) => {name: string} | false;
		permissions: IPermissions;
		telemetry?: {
			disabled?: true;
			getProperties: (route: Route, store: Store<IRootState>) => object;
		};
		scrollOffset?: number;
	};
}

function getTemplatesRedirect(store: Store<IRootState>) {
	const isTemplatesEnabled: boolean = store.getters['settings/isTemplatesEnabled'];
	if (!isTemplatesEnabled) {
		return {name: VIEWS.NOT_FOUND};
	}

	return false;
}

const router = new Router({
	mode: 'history',
	base: import.meta.env.DEV ? '/' : window.BASE_PATH ?? '/',
	scrollBehavior(to, from, savedPosition) {
		// saved position == null means the page is NOT visited from history (back button)
		if (savedPosition === null && to.name === VIEWS.TEMPLATES && to.meta) {
			// for templates view, reset scroll position in this case
			to.meta.setScrollPosition(0);
		}
	},
	routes: [
		{
			path: '/',
			name: VIEWS.HOMEPAGE,
			meta: {
				getRedirect(store: Store<IRootState>) {
					const startOnNewWorkflowRouteFlag = window.posthog?.isFeatureEnabled?.('start-at-wf-empty-state');

					return { name: startOnNewWorkflowRouteFlag ? VIEWS.NEW_WORKFLOW : VIEWS.WORKFLOWS };
				},
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
					getProperties(route: Route, store: Store<IRootState>) {
						return {
							collection_id: route.params.id,
							wf_template_repo_session_id: store.getters['templates/currentSessionId'],
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
			path: '/execution/:id',
			name: VIEWS.EXECUTION,
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
					getProperties(route: Route, store: Store<IRootState>) {
						return {
							template_id: route.params.id,
							wf_template_repo_session_id: store.getters['templates/currentSessionId'],
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
					getProperties(route: Route, store: Store<IRootState>) {
						return {
							wf_template_repo_session_id: store.getters['templates/currentSessionId'],
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
			name: VIEWS.EXECUTIONS,
			components: {
				default: ExecutionsView,
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
					deny: {
						shouldDeny: () => {
							return store.getters['settings/isUserManagementEnabled'] === false;
						},
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
			redirect: '/settings/personal',
		},
		{
			path: '/settings/users',
			name: VIEWS.USERS_SETTINGS,
			components: {
				default: SettingsUsersView,
			},
			meta: {
				telemetry: {
					pageCategory: 'settings',
					getProperties(route: Route, store: Store<IRootState>) {
						return {
							feature: 'users',
						};
					},
				},
				permissions: {
					allow: {
						role: [ROLE.Default, ROLE.Owner],
					},
					deny: {
						shouldDeny: () => {
							return store.getters['settings/isUserManagementEnabled'] === false;
						},
					},
				},
			},
		},
		{
			path: '/settings/personal',
			name: VIEWS.PERSONAL_SETTINGS,
			components: {
				default: SettingsPersonalView,
			},
			meta: {
				telemetry: {
					pageCategory: 'settings',
					getProperties(route: Route, store: Store<IRootState>) {
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
			path: '/settings/api',
			name: VIEWS.API_SETTINGS,
			components: {
				default: SettingsApiView,
			},
			meta: {
				telemetry: {
					pageCategory: 'settings',
					getProperties(route: Route, store: Store<IRootState>) {
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
							return store.getters['settings/isPublicApiEnabled'] === false;
						},
					},
				},
			},
		},
		{
			path: '/settings/community-nodes',
			name: VIEWS.COMMUNITY_NODES,
			components: {
				default: SettingsCommunityNodesView,
			},
			meta: {
				telemetry: {
					pageCategory: 'settings',
				},
				permissions: {
					allow: {
						role: [ROLE.Default, ROLE.Owner],
					},
					deny: {
						shouldDeny: () => {
							return store.getters['settings/isCommunityNodesFeatureEnabled'] === false;
						},
					},
				},
			},
		},
		{
			path: '/settings/coming-soon/:featureId',
			name: VIEWS.FAKE_DOOR,
			component: SettingsFakeDoorView,
			props: true,
			meta: {
				telemetry: {
					pageCategory: 'settings',
					getProperties(route: Route, store: Store<IRootState>) {
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
			path: '*',
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
	] as IRouteConfig[],
});

export default router;
