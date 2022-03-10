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
};

function getTemplatesRedirect(store: Store<IRootState>) {
	const isTemplatesEnabled: boolean = store.getters['settings/isTemplatesEnabled'];
	if (!isTemplatesEnabled) {
		return {name: 'NotFoundView'};
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
			name: 'Homepage',
			meta: {
				getRedirect(store: Store<IRootState>) {
					const isTemplatesEnabled: boolean = store.getters['settings/isTemplatesEnabled'];
					const isTemplatesEndpointReachable: boolean = store.getters['settings/isTemplatesEndpointReachable'];
					if (isTemplatesEnabled && isTemplatesEndpointReachable) {
						return {name: 'TemplatesSearchView'};
					}

					return {name: 'NodeViewNew'};
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
			name: 'TemplatesCollectionView',
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
			name: 'ExecutionById',
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
			name: 'TemplatesWorkflowView',
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
			name: 'TemplatesSearchView',
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
			name: 'NodeViewNew',
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
			name: 'NodeViewExisting',
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
			name: 'WorkflowDemo',
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
			name: 'WorkflowTemplate',
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
			name: 'SigninView',
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
			name: 'SignupView',
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
			name: 'SetupView',
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
			name: 'ForgotMyPasswordView',
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
			name: 'ChangePasswordView',
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
			name: 'SettingsRedirect',
			redirect: '/settings/personal',
		},
		{
			path: '/settings/users',
			name: 'UsersSettings',
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
			name: 'PersonalSettings',
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
			name: 'NotFoundView',
			component: ErrorView,
			props: {
				messageKey: 'PAGE_NOT_FOUND_MESSAGE',
				errorCode: 404,
				redirectTextKey: 'GO_BACK',
				redirectPage: 'Homepage',
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
