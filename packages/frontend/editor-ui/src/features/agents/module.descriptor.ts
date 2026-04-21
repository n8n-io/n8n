import { type FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import {
	AGENTS_LIST_VIEW,
	AGENT_BUILDER_VIEW,
	AGENT_TOOLS_MODAL_KEY,
	NEW_AGENT_VIEW,
	PROJECT_AGENTS,
} from '@/features/agents/constants';

const AgentsListView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentsListView.vue');
const AgentBuilderView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentBuilderView.vue');
const NewAgentView = async (): Promise<unknown> =>
	await import('@/features/agents/views/NewAgentView.vue');
const AgentToolsModalDemo = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentToolsModalDemo.vue');

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
			name: AGENT_BUILDER_VIEW,
			path: 'agents/:agentId',
			props: true,
			component: AgentBuilderView,
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
		// Iterative-UI-development harness only — skipped in production builds,
		// never linked from the app. Used by `.tmp/out-*.png` vs Figma pixel diffs.
		...(import.meta.env.DEV
			? [
					{
						name: 'AgentToolsModalDemo',
						path: '/ui-demo/agent-tools-modal',
						component: AgentToolsModalDemo,
						meta: { layout: 'auth' as const },
					},
				]
			: []),
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
			key: 'agent',
			displayName: 'Agent',
		},
	],
};
