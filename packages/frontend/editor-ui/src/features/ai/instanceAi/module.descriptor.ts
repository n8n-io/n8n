import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import { CHAT_INSTANCE_AI_VIEW, CHAT_INSTANCE_AI_THREAD_VIEW } from '../chatHub/constants';

export const InstanceAiModule: FrontendModuleDescription = {
	id: 'instance-ai',
	name: 'Instance AI',
	description: 'Chat with the n8n Instance AI agent.',
	icon: 'sparkles',
	routes: [
		{
			name: 'instance-ai-redirect',
			path: '/instance-ai',
			redirect: { name: CHAT_INSTANCE_AI_VIEW },
			meta: {
				layout: 'default',
				middleware: ['authenticated'],
			},
		},
		{
			name: 'instance-ai-thread-redirect',
			path: '/instance-ai/:threadId',
			redirect: (to) => ({
				name: CHAT_INSTANCE_AI_THREAD_VIEW,
				params: { threadId: to.params.threadId },
			}),
			meta: {
				layout: 'default',
				middleware: ['authenticated'],
			},
		},
	],
	projectTabs: {
		overview: [],
		project: [],
	},
	resources: [],
	modals: [],
	settingsPages: [],
};
