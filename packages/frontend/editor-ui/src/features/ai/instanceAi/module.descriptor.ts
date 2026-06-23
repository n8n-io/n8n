import { i18n } from '@n8n/i18n';
import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import {
	INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
} from '@/app/constants/modals';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_SETTINGS_VIEW } from './constants';
import { hasPermission } from '@/app/utils/rbac/permissions';

const InstanceAiView = async () => await import('./InstanceAiView.vue');
const InstanceAiEmptyView = async () => await import('./InstanceAiEmptyView.vue');
const InstanceAiThreadView = async () => await import('./InstanceAiThreadView.vue');
const SettingsInstanceAiView = async () => await import('./views/SettingsInstanceAiView.vue');
const ComputerUseSetupModal = async () =>
	await import('./components/modals/ComputerUseSetupModal.vue');
const BrowserUseSetupModal = async () =>
	await import('./components/modals/BrowserUseSetupModal.vue');

export const InstanceAiModule: FrontendModuleDescription = {
	id: 'instance-ai',
	name: 'AI Assistant',
	description: 'Chat with your n8n instance.',
	icon: 'sparkles',
	routes: [
		{
			path: '/instance-ai',
			component: InstanceAiView,
			meta: {
				layout: 'instanceAi',
				middleware: ['authenticated', 'custom'],
			},
			children: [
				{
					name: INSTANCE_AI_VIEW,
					path: '',
					component: InstanceAiEmptyView,
				},
				{
					name: INSTANCE_AI_THREAD_VIEW,
					path: ':threadId',
					component: InstanceAiThreadView,
					props: true,
				},
			],
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
						scope: 'instanceAi:message',
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
	modals: [
		{ key: INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY, component: ComputerUseSetupModal },
		{ key: INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY, component: BrowserUseSetupModal },
	],
	settingsPages: [
		{
			id: 'settings-instance-ai',
			icon: 'sparkles',
			label: i18n.baseText('settings.n8nAgent'),
			position: 'top',
			route: { to: { name: INSTANCE_AI_SETTINGS_VIEW } },
			preview: true,
			get available() {
				return hasPermission(['rbac'], { rbac: { scope: 'instanceAi:message' } });
			},
		},
	],
};
