import Vue from 'vue';
import Router, { Route } from 'vue-router';

import TemplatesCollectionView from '@/views/TemplatesCollectionView.vue';
import MainHeader from '@/components/MainHeader/MainHeader.vue';
import MainSidebar from '@/components/MainSidebar.vue';
import NodeView from '@/views/NodeView.vue';
import TemplatesWorkflowView from '@/views/TemplatesWorkflowView.vue';
import TemplatesSearchView from '@/views/TemplatesSearchView.vue';
import { Store } from 'vuex';
import { IRootState } from './Interface';

Vue.use(Router);

export default new Router({
	mode: 'history',
	// @ts-ignore
	base: window.BASE_PATH === '/%BASE_PATH%/' ? '/' : window.BASE_PATH,
	routes: [
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
			meta: {
				nodeView: true,
				telemetry: {
					disabled: true,
				},
			},
		},
	],
});
