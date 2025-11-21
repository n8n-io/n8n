import { type FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import {
	CHAT_VIEW,
	CHAT_CONVERSATION_VIEW,
	CHAT_AGENTS_VIEW,
	TOOLS_SELECTOR_MODAL_KEY,
	AGENT_EDITOR_MODAL_KEY,
	CHAT_CREDENTIAL_SELECTOR_MODAL_KEY,
	CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY,
	CHAT_SETTINGS_VIEW,
	CHAT_PROVIDER_SETTINGS_MODAL_KEY,
} from '@/features/ai/chatHub/constants';
import { i18n } from '@n8n/i18n';
import SettingsChatHubView from './SettingsChatHubView.vue';

const ChatSidebar = async () => await import('@/features/ai/chatHub/components/ChatSidebar.vue');
const ChatView = async () => await import('@/features/ai/chatHub/ChatView.vue');
const ChatAgentsView = async () => await import('@/features/ai/chatHub/ChatAgentsView.vue');

export const ChatModule: FrontendModuleDescription = {
	id: 'chat-hub',
	name: 'Chat',
	description: 'Interact with various LLM models or your n8n AI agents.',
	icon: 'chat',
	modals: [
		{
			key: TOOLS_SELECTOR_MODAL_KEY,
			component: async () => await import('./components/ToolsSelectorModal.vue'),
			initialState: {
				open: false,
				data: {
					selected: [],
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
					onCreateNew: () => {},
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
			components: {
				default: ChatView,
				sidebar: ChatSidebar,
			},
			meta: {
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
			components: {
				default: ChatView,
				sidebar: ChatSidebar,
			},
			meta: {
				middleware: ['authenticated'],
				getProperties() {
					return {
						feature: 'chat-hub',
					};
				},
			},
		},
		{
			name: CHAT_AGENTS_VIEW,
			path: '/home/chat/agents',
			components: {
				default: ChatAgentsView,
				sidebar: ChatSidebar,
			},
			meta: {
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
			components: {
				settingsView: SettingsChatHubView,
			},
			meta: {
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
		},
	],
};
