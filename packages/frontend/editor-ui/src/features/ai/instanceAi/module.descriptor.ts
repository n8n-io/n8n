import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW } from './constants';

const InstanceAiView = async () => await import('./InstanceAiView.vue');

export const InstanceAiModule: FrontendModuleDescription = {
	id: 'instance-ai',
	name: 'Instance AI',
	description: 'Chat with the n8n Instance AI agent.',
	icon: 'sparkles',
	routes: [
		{
			name: INSTANCE_AI_VIEW,
			path: '/instance-ai',
			component: InstanceAiView,
			meta: {
				layout: 'default',
				middleware: ['authenticated'],
			},
		},
		{
			name: INSTANCE_AI_THREAD_VIEW,
			path: '/instance-ai/:threadId',
			component: InstanceAiView,
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
