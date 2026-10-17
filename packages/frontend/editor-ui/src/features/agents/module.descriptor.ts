import { VIEWS } from '@/app/constants';
import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { i18n } from '@n8n/i18n';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import {
	AGENTS_LIST_VIEW,
	AGENTS_SETTINGS_VIEW,
	AGENT_BUILDER_VIEW,
	AGENT_N8N_CHAT_VIEW,
	AGENT_N8N_CHAT_LIBRARY_VIEW,
	AGENT_PREVIEW_VIEW,
	AGENT_VIEW,
	AGENT_SESSIONS_LIST_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
	PROJECT_AGENTS,
} from '@/features/agents/constants';
import { isAgentsN8nChatFlagEnabledOnceEvaluated } from '@/features/agents/composables/useAgentsN8nChatFlag';
import { AGENTS_MODALS } from '@/features/agents/modals';

const AgentsListView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentsListView.vue');
const AgentView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentView.vue');
const AgentBuilderView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentBuilderView.vue');
const AgentSessionsListView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentSessionsListView.vue');
const AgentSessionTimelineView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentSessionTimelineView.vue');
const AgentN8nChatView = async (): Promise<unknown> =>
	await import('@/features/agents/n8nChatPage/AgentN8nChatView.vue');
const N8nChatAgentLibraryView = async (): Promise<unknown> =>
	await import('@/features/agents/n8nChatPage/N8nChatAgentLibraryView.vue');

// Same availability gate as `/assistant` itself, then the PostHog flag — posthog
// loads flags asynchronously, so the guard waits for them before deciding.
const n8nChatRouteGuard = async () => {
	if (!useInstanceAiAvailable().value) return { name: VIEWS.HOMEPAGE };
	return (await isAgentsN8nChatFlagEnabledOnceEvaluated()) ? true : { name: INSTANCE_AI_VIEW };
};

export const AgentsModule = defineFrontendModule({
	id: 'agents',
	name: 'Agents',
	description: 'Build and manage AI agents',
	icon: 'robot',
	modals: AGENTS_MODALS,
	routes: [
		{
			name: AGENTS_SETTINGS_VIEW,
			path: 'agents',
			component: async () => await import('./views/SettingsAgentsView.vue'),
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: { rbac: { scope: 'agent:manage' } },
				telemetry: { pageCategory: 'settings' },
			},
		},
		{
			name: AGENTS_LIST_VIEW,
			path: '/home/agents',
			component: AgentsListView,
			meta: {
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: PROJECT_AGENTS,
			path: 'agents',
			component: AgentsListView,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: AGENT_VIEW,
			path: 'agents/:agentId',
			component: AgentView,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
			children: [
				{
					name: AGENT_BUILDER_VIEW,
					path: '',
					props: true,
					component: AgentBuilderView,
				},
				{
					name: AGENT_PREVIEW_VIEW,
					path: 'preview',
					props: true,
					component: AgentBuilderView,
				},
				{
					name: AGENT_SESSIONS_LIST_VIEW,
					path: 'sessions',
					component: AgentSessionsListView,
				},
				{
					name: AGENT_SESSION_DETAIL_VIEW,
					path: 'sessions/:threadId',
					component: AgentSessionTimelineView,
				},
			],
		},
		{
			name: AGENT_N8N_CHAT_LIBRARY_VIEW,
			// A static path outranks `:agentId` and instanceAi's `/assistant/:threadId`, regardless of registration order.
			path: '/assistant/agents',
			component: N8nChatAgentLibraryView,
			meta: {
				layout: 'instanceAi',
				middleware: ['authenticated', 'custom'],
			},
			beforeEnter: n8nChatRouteGuard,
		},
		{
			name: AGENT_N8N_CHAT_VIEW,
			// `agentThreadId`, not `threadId`: the sibling instanceAi routes read
			// `route.params.threadId` for an n8n Assistant thread id, and the two
			// param names must not collide on this route.
			path: '/assistant/agents/:agentId/:agentThreadId?',
			component: AgentN8nChatView,
			props: true,
			meta: {
				layout: 'instanceAi',
				middleware: ['authenticated', 'custom'],
			},
			beforeEnter: n8nChatRouteGuard,
		},
	],
	projectTabs: {
		overview: [
			{
				label: 'Agents',
				value: AGENTS_LIST_VIEW,
				preview: true,
				insertAfter: VIEWS.WORKFLOWS,
				to: {
					name: AGENTS_LIST_VIEW,
				},
			},
		],
		project: [
			{
				label: 'Agents',
				value: PROJECT_AGENTS,
				preview: true,
				insertAfter: VIEWS.PROJECTS_WORKFLOWS,
				dynamicRoute: {
					name: PROJECT_AGENTS,
					includeProjectId: true,
				},
			},
		],
	},
	settingsPages: [
		{
			id: 'settings-agents',
			order: 240,
			icon: 'robot',
			label: i18n.baseText('settings.agents'),
			position: 'top',
			route: { to: { name: AGENTS_SETTINGS_VIEW } },
			preview: true,
			get available() {
				return hasPermission(['rbac'], { rbac: { scope: 'agent:manage' } });
			},
		},
	],
	resources: [
		{
			key: 'agent',
			displayName: 'Agent',
		},
	],
});
