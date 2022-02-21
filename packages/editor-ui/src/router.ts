import Vue from 'vue';
import Router from 'vue-router';

import TemplatesCollectionView from '@/views/TemplatesCollectionView.vue';
import MainHeader from '@/components/MainHeader/MainHeader.vue';
import MainSidebar from '@/components/MainSidebar.vue';
import NodeView from '@/views/NodeView.vue';
import TemplatesWorkflowView from '@/views/TemplatesWorkflowView.vue';
import TemplatesSearchView from '@/views/TemplatesSearchView.vue';

Vue.use(Router);

export default new Router({
	mode: 'history',
	// @ts-ignore
	base: window.BASE_PATH === '/%BASE_PATH%/' ? '/' : window.BASE_PATH,
	routes: [
		{
			path: '/collection/:id',
			name: 'TemplatesCollectionView',
			components: {
				default: TemplatesCollectionView,
				sidebar: MainSidebar,
			},
			meta: {
				templatesEnabled: true,
				telemetry: {
					params: {
						id: 'collection_id',
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
				telemetry: {
					params: {
						id: 'template_id',
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
			path: '/workflows/templates/:id',
			name: 'WorkflowTemplate',
			components: {
				default: NodeView,
				header: MainHeader,
				sidebar: MainSidebar,
			},
			meta: {
				templatesEnabled: true,
			},
		},
		{
			path: '/workflows/demo',
			name: 'WorkflowDemo',
			components: {
				default: NodeView,
			},
		},
	],
});
