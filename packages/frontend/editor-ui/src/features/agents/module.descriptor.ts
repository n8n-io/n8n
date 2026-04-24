import { type FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import {
	AGENTS_LIST_VIEW,
	AGENT_BUILDER_VIEW,
	AGENT_TOOLS_MODAL_KEY,
	AGENT_TOOL_CONFIG_MODAL_KEY,
	AGENT_VIEW,
	AGENT_SESSIONS_LIST_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
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
	],
	projectTabs: {
		overview: [
			{
				label: 'Agents',
				value: AGENTS_LIST_VIEW,
				tag: 'Preview',
				to: {
					name: AGENTS_LIST_VIEW,
				},
			},
		],
		project: [
			{
				label: 'Agents',
				value: PROJECT_AGENTS,
				tag: 'Preview',
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
};
