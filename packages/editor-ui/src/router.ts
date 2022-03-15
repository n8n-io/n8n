import Vue from 'vue';

import ChangePasswordView from './views/ChangePasswordView.vue';
import ErrorView from './views/ErrorView.vue';
import ForgotMyPasswordView from './views/ForgotMyPasswordView.vue';
import MainHeader from '@/components/MainHeader/MainHeader.vue';
import MainSidebar from '@/components/MainSidebar.vue';
import NodeView from '@/views/NodeView.vue';
import SettingsPersonalView from './views/SettingsPersonalView.vue';
import SettingsUsersView from './views/SettingsUsersView.vue';
import SetupView from './views/SetupView.vue';
import SigninView from './views/SigninView.vue';
import SignupView from './views/SignupView.vue';
import Router, { Route } from 'vue-router';

import TemplatesCollectionView from '@/views/TemplatesCollectionView.vue';
import TemplatesWorkflowView from '@/views/TemplatesWorkflowView.vue';
import TemplatesSearchView from '@/views/TemplatesSearchView.vue';
import { Store } from 'vuex';
import { IPermissions, IRootState } from './Interface';
import { LOGIN_STATUS, ROLE } from './modules/userHelpers';
import { RouteConfigSingleView } from 'vue-router/types/router';
import { VIEWS } from './constants';

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
	// @ts-ignore
	base: window.BASE_PATH === '/%BASE_PATH%/' ? '/' : window.BASE_PATH,
	routes: [
		{
			path: '/',
			name: VIEWS.HOMEPAGE,
			meta: {
				getRedirect(store: Store<IRootState>) {
					const isTemplatesEnabled: boolean = store.getters['settings/isTemplatesEnabled'];
					const isTemplatesEndpointReachable: boolean = store.getters['settings/isTemplatesEndpointReachable'];
					if (isTemplatesEnabled && isTemplatesEndpointReachable) {
						return { name: VIEWS.TEMPLATES };
					}

					return { name: VIEWS.NEW_WORKFLOW };
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
				telemetry: {
					getProperties(route: Route, store: Store<IRootState>) {
						return {
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
			path: '/workflow',
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
						um: false,
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
				},
				permissions: {
					allow: {
						role: [ROLE.Default, ROLE.Owner],
					},
					deny: {
						um: false,
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
						loginStatus: [LOGIN_STATUS.LoggedIn, LOGIN_STATUS.LoggedOut],
					},
				},
			},
		},
	] as IRouteConfig[],
});

export default router;
