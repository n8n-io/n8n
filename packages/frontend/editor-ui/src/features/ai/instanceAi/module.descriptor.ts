import { i18n } from '@n8n/i18n';
import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_SETTINGS_VIEW } from './constants';

const InstanceAiView = async () => await import('./InstanceAiView.vue');
const SettingsInstanceAiView = async () => await import('./views/SettingsInstanceAiView.vue');

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
				layout: 'instanceAi',
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			name: INSTANCE_AI_THREAD_VIEW,
			path: '/instance-ai/:threadId',
			component: InstanceAiView,
			meta: {
				layout: 'instanceAi',
				middleware: ['authenticated', 'custom'],
			},
		},
		{
			path: 'instance-ai',
			name: INSTANCE_AI_SETTINGS_VIEW,
			component: SettingsInstanceAiView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: {
					rbac: {
						scope: 'instanceAi:manage',
					},
				},
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
	projectTabs: {
		overview: [],
		project: [],
	},
	resources: [],
	modals: [],
	settingsPages: [
		{
			id: 'settings-instance-ai',
			icon: 'sparkles',
			label: i18n.baseText('settings.instanceAi'),
			position: 'top',
			route: { to: { name: INSTANCE_AI_SETTINGS_VIEW } },
			get available() {
				return hasPermission(['rbac'], { rbac: { scope: 'instanceAi:manage' } });
			},
		},
	],
};
