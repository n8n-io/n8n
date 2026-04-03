import { type FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import {
	AGENTS_LIST_VIEW,
	AGENT_BUILDER_VIEW,
	PROJECT_AGENTS,
} from '@/features/agent-framework/constants';

const AgentsListView = async () =>
	await import('@/features/agent-framework/views/AgentsListView.vue');
const AgentBuilderView = async () =>
	await import('@/features/agent-framework/views/AgentBuilderView.vue');

export const AgentsModule: FrontendModuleDescription = {
	id: 'agent-framework',
	name: 'Agents',
	description: 'Build and manage AI agents',
	icon: 'robot',
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
			name: AGENT_BUILDER_VIEW,
			path: 'agents/:agentId',
			props: true,
			component: AgentBuilderView,
			meta: {
				projectRoute: true,
				middleware: ['authenticated', 'custom'],
			},
		},
	],
	projectTabs: {
		overview: [
			{
				label: 'Agents',
				value: AGENTS_LIST_VIEW,
				to: {
					name: AGENTS_LIST_VIEW,
				},
			},
		],
		project: [
			{
				label: 'Agents',
				value: PROJECT_AGENTS,
				dynamicRoute: {
					name: PROJECT_AGENTS,
					includeProjectId: true,
				},
			},
		],
	},
	resources: [
		{
			key: 'sdkAgent',
			displayName: 'Agent',
		},
	],
};
