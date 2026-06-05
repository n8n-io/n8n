import { i18n } from '@n8n/i18n';
import { v4 as uuidv4 } from 'uuid';
import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import {
	INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
} from '@/app/constants/modals';
import { VIEWS } from '@/app/constants';
import { telemetry } from '@/app/plugins/telemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	INSTANCE_AI_VIEW,
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_SETTINGS_VIEW,
	INSTANCE_AI_NEW_VIEW,
} from './constants';
import { useInstanceAiStore } from './instanceAi.store';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
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
					name: INSTANCE_AI_NEW_VIEW,
					path: 'new',
					component: InstanceAiEmptyView,
					beforeEnter: async (to) => {
						const settings = useInstanceAiSettingsStore();
						if (settings.isInstanceAiDisabled) {
							return { name: VIEWS.HOMEPAGE };
						}

						const prompt = typeof to.query.prompt === 'string' ? to.query.prompt : '';
						const sourceParam = typeof to.query.source === 'string' ? to.query.source : undefined;
						let sourceContext: Record<string, unknown> | undefined;
						if (typeof to.query.sourceContext === 'string') {
							try {
								sourceContext = JSON.parse(to.query.sourceContext) as Record<string, unknown>;
							} catch {
								sourceContext = undefined;
							}
						}

						const store = useInstanceAiStore();
						const rootStore = useRootStore();
						const threadId = uuidv4();

						try {
							await store.syncThread(threadId, {
								source: sourceParam ?? 'external-link',
								origin: 'external',
								sourceContext,
							});
						} catch {
							return { name: INSTANCE_AI_VIEW };
						}

						// External input is untrusted: always prefill, never auto-send.
						if (prompt) store.setPendingPrefill(threadId, prompt);

						telemetry.track('User launched Instance AI thread', {
							thread_id: threadId,
							instance_id: rootStore.instanceId,
							source: sourceParam ?? 'external-link',
							origin: 'external',
							auto_send: false,
						});

						// Redirect with no query → URL cleared, back-button won't re-fire this.
						return { name: INSTANCE_AI_THREAD_VIEW, params: { threadId } };
					},
				},
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
