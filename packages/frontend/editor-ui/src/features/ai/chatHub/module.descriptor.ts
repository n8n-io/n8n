import { type FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import {
	CHAT_VIEW,
	CHAT_CONVERSATION_VIEW,
	CHAT_WORKFLOW_AGENTS_VIEW,
	CHAT_PERSONAL_AGENTS_VIEW,
	TOOL_SETTINGS_MODAL_KEY,
	TOOLS_MANAGER_MODAL_KEY,
	AGENT_EDITOR_MODAL_KEY,
	CHAT_CREDENTIAL_SELECTOR_MODAL_KEY,
	CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY,
	CHAT_SETTINGS_VIEW,
	CHAT_PROVIDER_SETTINGS_MODAL_KEY,
} from '@/features/ai/chatHub/constants';
import { i18n } from '@n8n/i18n';
import { hasPermission } from '@/app/utils/rbac/permissions';

const ChatView = async () => await import('@/features/ai/chatHub/ChatView.vue');
const ChatWorkflowAgentsView = async () =>
	await import('@/features/ai/chatHub/ChatWorkflowAgentsView.vue');
const ChatPersonalAgentsView = async () =>
	await import('@/features/ai/chatHub/ChatPersonalAgentsView.vue');
const SettingsChatHubView = async () =>
	await import('@/features/ai/chatHub/SettingsChatHubView.vue');

export const ChatModule: FrontendModuleDescription = {
	id: 'chat-hub',
	name: 'Chat',
	description: 'Chat with LLM models or your n8n AI agents.',
	icon: 'chat',
	modals: [
		{
			key: TOOL_SETTINGS_MODAL_KEY,
			component: async () => await import('./components/ToolSettingsModal.vue'),
			initialState: {
				open: false,
				data: {
					node: null,
					existingToolNames: [],
					onConfirm: () => {},
				},
			},
		},
		{
			key: TOOLS_MANAGER_MODAL_KEY,
			component: async () => await import('./components/ToolsManagerModal.vue'),
			initialState: {
				open: false,
				data: {
					tools: [],
					onConfirm: () => {},
				},
			},
		},
		{
			key: AGENT_EDITOR_MODAL_KEY,
			component: async () => await import('./components/AgentEditorModal.vue'),
			initialState: {
				open: false,
				data: {
					credentials: {},
					onClose: () => {},
					onCreateCustomAgent: () => {},
				},
			},
		},
		{
			key: CHAT_CREDENTIAL_SELECTOR_MODAL_KEY,
			component: async () => await import('./components/CredentialSelectorModal.vue'),
			initialState: {
				open: false,
				data: {
					provider: null,
					initialValue: null,
					onSelect: () => {},
				},
			},
		},
		{
			key: CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY,
			component: async () => await import('./components/ModelByIdSelectorModal.vue'),
			initialState: {
				open: false,
				data: {
					provider: null,
					initialValue: null,
					onSelect: () => {},
				},
			},
		},
		{
			key: CHAT_PROVIDER_SETTINGS_MODAL_KEY,
			component: async () => await import('./components/ProviderSettingsModal.vue'),
			initialState: {
				open: false,
				data: {
					provider: null,
					disabled: false,
					onConfirm: () => {},
					onCancel: () => {},
				},
			},
		},
	],
	routes: [
		{
			name: CHAT_VIEW,
			path: '/home/chat',
			component: ChatView,
			meta: {
				layout: 'chat',
				middleware: ['authenticated'],
				getProperties() {
					return {
						feature: 'chat-hub',
					};
				},
			},
		},
		{
			name: CHAT_CONVERSATION_VIEW,
			path: '/home/chat/:id',
			component: ChatView,
			meta: {
				layout: 'chat',
				middleware: ['authenticated'],
				getProperties() {
					return {
						feature: 'chat-hub',
					};
				},
			},
		},
		{
			name: CHAT_WORKFLOW_AGENTS_VIEW,
			path: '/home/chat/workflow-agents',
			component: ChatWorkflowAgentsView,
			meta: {
				layout: 'chat',
				middleware: ['authenticated'],
				getProperties() {
					return {
						feature: 'chat-hub',
					};
				},
			},
		},
		{
			name: CHAT_PERSONAL_AGENTS_VIEW,
			path: '/home/chat/personal-agents',
			component: ChatPersonalAgentsView,
			meta: {
				layout: 'chat',
				middleware: ['authenticated'],
				getProperties() {
					return {
						feature: 'chat-hub',
					};
				},
			},
		},
		{
			path: 'chat',
			name: CHAT_SETTINGS_VIEW,
			component: SettingsChatHubView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac'],
				middlewareOptions: {
					rbac: {
						scope: ['chatHub:manage'],
					},
				},
				telemetry: {
					pageCategory: 'settings',
					getProperties() {
						return {
							feature: 'chat-hub',
						};
					},
				},
			},
		},
	],
	projectTabs: {
		overview: [],
		project: [],
	},
	resources: [
		{
			key: 'chat',
			displayName: 'Chat',
		},
	],
	settingsPages: [
		{
			id: 'settings-chat-hub',
			icon: 'message-circle',
			label: i18n.baseText('settings.chatHub'),
			position: 'top',
			route: { to: { name: CHAT_SETTINGS_VIEW } },
			get available() {
				return hasPermission(['rbac'], { rbac: { scope: 'chatHub:manage' } });
			},
		},
	],
};
