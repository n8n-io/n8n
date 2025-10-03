import { useI18n } from '@n8n/i18n';
import { type FrontendModuleDescription } from '@/moduleInitializer/module.types';
import { CHAT_VIEW } from './constants';

const i18n = useI18n();

const MainSidebar = async () => await import('@/components/MainSidebar.vue');
const ChatView = async () => await import('@/features/chat/ChatView.vue');

export const ChatModule: FrontendModuleDescription = {
	id: 'chat',
	name: 'Chat',
	description: 'Interact with various LLM models or your n8n AI agents.',
	icon: 'chat',
	modals: [],
	routes: [
		{
			name: CHAT_VIEW,
			path: '/chat',
			components: {
				default: ChatView,
				sidebar: MainSidebar,
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
