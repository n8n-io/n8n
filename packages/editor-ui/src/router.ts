import Vue from 'vue';
import Router from 'vue-router';
import MainHeader from '@/components/MainHeader/MainHeader.vue';
import MainSidebar from '@/components/MainSidebar.vue';
import NodeView from '@/views/NodeView.vue';
import TemplateView from '@/views/TemplateView.vue';

import SearchPageHeader from '@/components/Templates/SearchPage/Layout/Header.vue';
import SearchPageContent from '@/components/Templates/SearchPage/Layout/Content.vue';

import WorkflowPageHeader from '@/components/Templates/WorkflowPage/Layout/Header.vue';
import WorkflowPageContent from '@/components/Templates/WorkflowPage/Layout/Content.vue';

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
			path: '/template/',
			components: {
				default: TemplateView,
				sidebar: MainSidebar,
			},
			children: [
				{
					path: ':id',
					name: 'TemplatePage',
					components: {
						header: WorkflowPageHeader,
						default: WorkflowPageContent,
					},
				},
			],
		},
		{
			path: '/templates/',
			components: {
				default: TemplateView,
				sidebar: MainSidebar,
			},
			children: [
				{
					path: '',
					name: 'TemplateSearchPage',
					components: {
						header: SearchPageHeader,
						default: SearchPageContent,
					},
				},
			],
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
	],
});
