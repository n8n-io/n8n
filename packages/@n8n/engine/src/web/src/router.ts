import { createRouter, createWebHistory } from 'vue-router';
import WorkspaceView from './views/WorkspaceView.vue';

export const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', name: 'workspace', component: WorkspaceView },
		{ path: '/workflows/:id', name: 'workflow', component: WorkspaceView },
		{
			path: '/workflows/:id/executions/:execId',
			name: 'execution',
			component: WorkspaceView,
		},
	],
});
