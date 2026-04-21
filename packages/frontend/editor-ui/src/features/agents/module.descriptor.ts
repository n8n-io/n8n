import { i18n } from '@n8n/i18n';
import { type FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import { hasPermission } from '@/app/utils/rbac/permissions';
import {
	AGENTS_LIST_VIEW,
	AGENT_BUILDER_SETTINGS_VIEW,
	AGENT_BUILDER_VIEW,
	NEW_AGENT_VIEW,
	PROJECT_AGENTS,
} from '@/features/agents/constants';

const AgentsListView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentsListView.vue');
const AgentBuilderView = async (): Promise<unknown> =>
	await import('@/features/agents/views/AgentBuilderView.vue');
const NewAgentView = async (): Promise<unknown> =>
	await import('@/features/agents/views/NewAgentView.vue');
const SettingsAgentBuilderView = async (): Promise<unknown> =>
	await import('@/features/agents/views/SettingsAgentBuilderView.vue');

export const AgentsModule: FrontendModuleDescription = {
	id: 'agents',
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
		{
			name: NEW_AGENT_VIEW,
			path: '/new-agent',
			component: NewAgentView,
			meta: {
				middleware: ['authenticated', 'custom'],
			},
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
						scope: 'aiAssistant:manage',
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
	settingsPages: [
		{
			id: 'settings-agent-builder',
			icon: 'robot',
			label: i18n.baseText('settings.agentBuilder.title'),
			position: 'top',
			beta: true,
			route: { to: { name: AGENT_BUILDER_SETTINGS_VIEW } },
			get available() {
				return hasPermission(['rbac'], { rbac: { scope: 'aiAssistant:manage' } });
			},
		},
	],
};
