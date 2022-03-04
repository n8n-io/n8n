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
import { IRootState } from './Interface';

Vue.use(Router);

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
			},
		},
		{
			path: '/workflows/demo',
			name: 'WorkflowDemo',
			components: {
				default: NodeView,
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
			},
		},
		{
			path: '/signin',
			name: 'SigninView',
			components: {
				default: SigninView,
			},
		},
		{
			path: '/signup',
			name: 'SignupView',
			components: {
				default: SignupView,
			},
		},
		{
			path: '/setup',
			name: 'SetupView',
			components: {
				default: SetupView,
			},
		},
		{
			path: '/forgot-password',
			name: 'ForgotMyPasswordView',
			components: {
				default: ForgotMyPasswordView,
			},
		},
		{
			path: '/change-password',
			name: 'ChangePasswordView',
			components: {
				default: ChangePasswordView,
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
		},
		{
			path: '/settings/personal',
			name: 'PersonalSettings',
			components: {
				default: SettingsPersonalView,
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
			},
		},
	],
});

export default router;
