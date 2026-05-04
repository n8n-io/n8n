import { i18n } from '@n8n/i18n';
import { type FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import { hasPermission } from '@/app/utils/rbac/permissions';
import {
	AGENTS_LIST_VIEW,
	AGENT_BUILDER_SETTINGS_VIEW,
	AGENT_BUILDER_VIEW,
	AGENT_TOOLS_MODAL_KEY,
	AGENT_TOOL_CONFIG_MODAL_KEY,
	AGENT_SKILL_MODAL_KEY,
	AGENT_ADD_TRIGGER_MODAL_KEY,
	AGENT_VIEW,
	AGENT_SESSIONS_LIST_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
	NEW_AGENT_VIEW,
	PROJECT_AGENTS,
} from '@/features/agents/constants';

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
const NewAgentView = async (): Promise<unknown> =>
	await import('@/features/agents/views/NewAgentView.vue');
const SettingsAgentBuilderView = async (): Promise<unknown> =>
	await import('@/features/agents/views/SettingsAgentBuilderView.vue');

export const AgentsModule: FrontendModuleDescription = {
	id: 'agents',
	name: 'Agents',
	description: 'Build and manage AI agents',
	icon: 'robot',
	modals: [
		{
			key: AGENT_TOOLS_MODAL_KEY,
			component: async () => await import('./components/AgentToolsModal.vue'),
			initialState: {
				open: false,
				data: {
					tools: [],
					onConfirm: () => {},
				},
			},
		},
		{
			key: AGENT_TOOL_CONFIG_MODAL_KEY,
			component: async () => await import('./components/AgentToolConfigModal.vue'),
			initialState: {
				open: false,
				data: {
					toolRef: null,
					existingToolNames: [],
					onConfirm: () => {},
				},
			},
		},
		{
			key: AGENT_SKILL_MODAL_KEY,
			component: async () => await import('./components/AgentSkillModal.vue'),
			initialState: {
				open: false,
				data: {
					projectId: '',
					agentId: '',
					onConfirm: () => {},
				},
			},
		},
		{
			key: AGENT_ADD_TRIGGER_MODAL_KEY,
			component: async () => await import('./components/AgentAddTriggerModal.vue'),
			initialState: {
				open: false,
				data: {
					projectId: '',
					agentId: '',
					connectedTriggers: [],
					onConnectedTriggersChange: () => {},
					onTriggerAdded: () => {},
				},
			},
		},
	],
	routes: [
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
			name: NEW_AGENT_VIEW,
			path: '/new-agent',
			component: NewAgentView,
			meta: {
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
			name: AGENT_BUILDER_SETTINGS_VIEW,
			path: 'agent-builder',
			component: SettingsAgentBuilderView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac'],
				middlewareOptions: {
					rbac: {
						scope: 'agent:manage',
					},
				},
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
	projectTabs: {
		overview: [
			{
				label: 'Agents',
				value: AGENTS_LIST_VIEW,
				preview: true,
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
				dynamicRoute: {
					name: PROJECT_AGENTS,
					includeProjectId: true,
				},
			},
		],
	},
	resources: [
		{
			key: 'agent',
			displayName: 'Agent',
		},
	],
	settingsPages: [
		{
			id: 'settings-agent-builder',
			icon: 'robot',
			label: i18n.baseText('settings.agentBuilder.title'),
			position: 'top',
			preview: true,
			route: { to: { name: AGENT_BUILDER_SETTINGS_VIEW } },
			get available() {
				return hasPermission(['rbac'], { rbac: { scope: 'agent:manage' } });
			},
		},
	],
};
