import { type FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import {
	CHAT_VIEW,
	CHAT_CONVERSATION_VIEW,
	CHAT_AGENTS_VIEW,
	TOOLS_SELECTOR_MODAL_KEY,
	AGENT_EDITOR_MODAL_KEY,
} from '@/features/ai/chatHub/constants';

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
				middleware: ['authenticated', 'custom'],
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
				middleware: ['authenticated', 'custom'],
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
				middleware: ['authenticated', 'custom'],
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
};
