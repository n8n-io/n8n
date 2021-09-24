import Vue from 'vue';
import Router from 'vue-router';

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
import { LOGIN_STATUS, ROLE } from './constants';

Vue.use(Router);

const router = new Router({
	mode: 'history',
	// @ts-ignore
	base: window.BASE_PATH === '/%BASE_PATH%/' ? '/' : window.BASE_PATH,
	routes: [
		{
			path: '/execution/:id',
			name: 'ExecutionById',
			components: {
				default: NodeView,
				header: MainHeader,
				sidebar: MainSidebar,
			},
			meta: {
				authorize: [LOGIN_STATUS.LoggedIn],
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
				authorize: [LOGIN_STATUS.LoggedIn],
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
				authorize: [LOGIN_STATUS.LoggedIn],
			},
		},
		{
			path: '/',
			redirect: '/workflow',
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
				authorize: [LOGIN_STATUS.LoggedIn],
			},
		},
		{
			path: '/signin',
			name: 'SigninView',
			components: {
				default: SigninView,
			},
			meta: {
				authorize: [LOGIN_STATUS.LoggedOut],
			},
		},
		{
			path: '/signup',
			name: 'SignupView',
			components: {
				default: SignupView,
			},
			meta: {
				authorize: [LOGIN_STATUS.LoggedOut],
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
			meta: {
				authorize: [LOGIN_STATUS.LoggedOut],
			},
		},
		{
			path: '/change-password',
			name: 'ChangePasswordView',
			components: {
				default: ChangePasswordView,
			},
			meta: {
				authorize: [LOGIN_STATUS.LoggedOut],
			},
		},
		{
			path: '/settings',
			redirect: '/settings/personal',
		},
		{
			path: '/settings/users',
			name: 'UsersSettings',
			components: {
				default: SettingsUsersView,
			},
			meta: {
				authorize: [ROLE.Owner],
			},
		},
		{
			path: '/settings/personal',
			name: 'PersonalSettings',
			components: {
				default: SettingsPersonalView,
			},
			meta: {
				authorize: [LOGIN_STATUS.LoggedIn],
			},
		},
		{
			path: '*',
			name: 'NotFoundView',
			component: ErrorView,
			props: {
				message: 'Oops, couldn’t find that',
				errorCode: 404,
				redirectText: 'Go to editor',
				redirectLink: '/',
			},
			meta: {
				authorize: [LOGIN_STATUS.LoggedIn, LOGIN_STATUS.LoggedOut],
			},
		},
	],
});

export default router;
