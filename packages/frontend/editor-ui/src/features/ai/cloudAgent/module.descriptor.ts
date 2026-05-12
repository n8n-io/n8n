import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';

import { CLOUD_AGENT_VIEW } from './constants';

const CloudAgentView = async () => await import('./CloudAgentView.vue');

/**
 * Frontend module descriptor for the cloud agent. v1 surface is a single
 * /cloud-agent route rendering CloudAgentView (which mounts CloudAgentChat).
 *
 * Gated by `cloudAgent:message` scope via the RBAC middleware. The module
 * itself is feature-flagged on the backend (N8N_CLOUD_AGENT_ENABLED) — when
 * disabled, /rest/cloud-agent endpoints 404 and this route still renders
 * but every API call fails cleanly.
 */
export const CloudAgentModule: FrontendModuleDescription = {
	id: 'cloud-agent',
	name: 'Cloud Agent',
	description: 'Chat with the cloud workflow agent.',
	icon: 'sparkles',
	routes: [
		{
			path: '/cloud-agent',
			name: CLOUD_AGENT_VIEW,
			component: CloudAgentView,
			meta: {
				layout: 'default',
				middleware: ['authenticated', 'rbac'],
				middlewareOptions: {
					rbac: {
						scope: 'cloudAgent:message',
					},
				},
			},
		},
	],
	projectTabs: {
		overview: [],
		project: [],
	},
	resources: [],
	modals: [],
	settingsPages: [],
};
