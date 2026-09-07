import type { ModalDefinition } from '@n8n/frontend-module-sdk';

import {
	AGENT_CONFIRMATION_MODAL_KEY,
	AGENT_JSON_IMPORT_MODAL_KEY,
	AGENT_SKILL_MODAL_KEY,
	AGENT_SUB_AGENTS_MODAL_KEY,
	AGENT_TASK_MODAL_KEY,
	AGENT_TOOLS_MODAL_KEY,
	AGENT_TOOL_CONFIG_MODAL_KEY,
	AGENT_VECTOR_STORES_MODAL_KEY,
} from './constants';

export const AGENTS_MODALS: ModalDefinition[] = [
	{
		key: AGENT_TOOLS_MODAL_KEY,
		component: async () => await import('./components/AgentToolsConnectionModalWrapper.vue'),
		initialState: {
			open: false,
			data: {
				tools: [],
				mcpServers: [],
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
				kind: 'node',
				toolRef: null,
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
		key: AGENT_TASK_MODAL_KEY,
		component: async () => await import('./components/AgentTaskModal.vue'),
		initialState: {
			open: false,
			data: {
				projectId: '',
				agentId: '',
				isPublished: false,
				onSaved: () => {},
			},
		},
	},
	{
		key: AGENT_SUB_AGENTS_MODAL_KEY,
		component: async () => await import('./components/AgentSubAgentsModal.vue'),
		initialState: {
			open: false,
			data: {
				agents: [],
				onConfirm: () => {},
			},
		},
	},
	{
		key: AGENT_VECTOR_STORES_MODAL_KEY,
		component: async () => await import('./components/AgentVectorStoresModal.vue'),
		initialState: {
			open: false,
			data: {
				projectId: '',
				agentId: '',
				existingNames: [],
				onConfirm: () => {},
			},
		},
	},
	{
		key: AGENT_JSON_IMPORT_MODAL_KEY,
		component: async () => await import('./components/AgentJsonImportModal.vue'),
		initialState: {
			open: false,
			data: {
				onConfirm: () => {},
			},
		},
	},
	{
		key: AGENT_CONFIRMATION_MODAL_KEY,
		component: async () => await import('./components/AgentConfirmationModal.vue'),
		initialState: { open: false },
	},
];
