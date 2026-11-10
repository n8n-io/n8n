import { defineComponent } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { APP_DETAIL_VIEW } from '@n8n/frontend-module-apps';
import { VIEWS } from '@/app/constants';
import { AGENT_BUILDER_VIEW, AGENT_VIEW, AGENTS_LIST_VIEW } from '@/features/agents/constants';
import { DATA_TABLE_DETAILS, DATA_TABLE_VIEW } from '@/features/core/dataTable/constants';

const Stub = defineComponent({ render: () => null });

/**
 * A router with the app routes that Assistant links open. The names and paths
 * mirror the app routes, so a test sees the real hrefs for a history base.
 */
export function createArtifactTestRouter(base = '/') {
	return createRouter({
		history: createWebHistory(base),
		routes: [
			{ path: '/workflow/:workflowId/:nodeId?', name: VIEWS.WORKFLOW, component: Stub },
			{ path: '/home/credentials/:credentialId?', name: VIEWS.CREDENTIALS, component: Stub },
			{ path: '/home/datatables', name: DATA_TABLE_VIEW, component: Stub },
			{ path: '/home/agents', name: AGENTS_LIST_VIEW, component: Stub },
			{
				path: '/settings/context/skills',
				name: VIEWS.SETTINGS_CONTEXT_SKILLS,
				component: Stub,
			},
			{
				path: '/projects/:projectId',
				name: VIEWS.PROJECT_DETAILS,
				component: Stub,
				children: [
					{
						path: 'credentials/:credentialId?',
						name: VIEWS.PROJECTS_CREDENTIALS,
						component: Stub,
					},
					{ path: 'datatables/:id', name: DATA_TABLE_DETAILS, component: Stub },
					{
						path: 'agents/:agentId',
						name: AGENT_VIEW,
						component: Stub,
						children: [{ path: '', name: AGENT_BUILDER_VIEW, component: Stub }],
					},
					{ path: 'apps/:appId', name: APP_DETAIL_VIEW, component: Stub },
				],
			},
			{ path: '/:pathMatch(.*)*', component: Stub },
		],
	});
}
