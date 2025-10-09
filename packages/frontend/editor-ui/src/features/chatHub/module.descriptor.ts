import { type FrontendModuleDescription } from '@/moduleInitializer/module.types';
import { CHAT_VIEW, CHAT_CONVERSATION_VIEW } from './constants';

const ChatSidebar = async () => await import('@/features/chatHub/components/ChatSidebar.vue');
const ChatView = async () => await import('@/features/chatHub/ChatView.vue');

export const ChatModule: FrontendModuleDescription = {
	id: 'chat-hub',
	name: 'Chat',
	description: 'Interact with various LLM models or your n8n AI agents.',
	icon: 'chat',
	modals: [],
	routes: [
		{
			name: CHAT_VIEW,
			path: '/ask',
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
			path: '/ask/:id',
			components: {
				default: ChatView,
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
