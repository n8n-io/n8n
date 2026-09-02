import { VIEWS } from '@/app/constants';
import { type FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import {
	AGENTS_LIST_VIEW,
	AGENT_BUILDER_VIEW,
	AGENT_PREVIEW_VIEW,
	NEW_AGENT_VIEW,
	AGENT_VIEW,
	AGENT_SESSIONS_LIST_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
	PROJECT_AGENTS,
} from '@/features/agents/constants';
import { AGENTS_MODALS } from '@/features/agents/modals';

const AgentsListView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentsListView.vue');
const AgentView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentView.vue');
const AgentBuilderView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentBuilderView.vue');
const NewAgentView = async (): Promise<unknown> =>
	await import('@/features/agents/views/NewAgentView.vue');
const AgentSessionsListView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentSessionsListView.vue');
const AgentSessionTimelineView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentSessionTimelineView.vue');

export const AgentsModule: FrontendModuleDescription = {
	id: 'agents',
	name: 'Agents',
	description: 'Build and manage AI agents',
	icon: 'robot',
	modals: AGENTS_MODALS,
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
	resources: [
		{
			key: 'agent',
			displayName: 'Agent',
		},
	],
};
