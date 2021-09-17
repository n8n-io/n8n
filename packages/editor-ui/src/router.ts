import Vue from 'vue';
import Router from 'vue-router';
import MainHeader from '@/components/MainHeader/MainHeader.vue';
import MainSidebar from '@/components/MainSidebar.vue';
import NodeView from '@/views/NodeView.vue';
import ErrorView from './views/ErrorView.vue';
import SigninView from './views/SigninView.vue';
import SetupView from './views/SetupView.vue';
import SignupView from './views/SignupView.vue';
import ForgotMyPasswordView from './views/ForgotMyPasswordView.vue';
import ChangePasswordView from './views/ChangePasswordView.vue';

Vue.use(Router);

export default new Router({
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
		},
		{
			path: '/workflow',
			name: 'NodeViewNew',
			components: {
				default: NodeView,
				header: MainHeader,
				sidebar: MainSidebar,
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
			path: '*',
			name: 'NotFoundView',
			component: ErrorView,
			props: {
				message: 'Oops, couldn’t find that',
				errorCode: '404',
			},
		},
	],
});
