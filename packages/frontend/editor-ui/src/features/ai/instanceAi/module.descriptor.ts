import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import {
	INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY,
	INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY,
} from '@/app/constants/modals';
import { VIEWS } from '@/app/constants';
import { telemetry } from '@/app/plugins/telemetry';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import {
	INSTANCE_AI_VIEW,
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_SETTINGS_VIEW,
	INSTANCE_AI_NEW_VIEW,
} from './constants';
import { stashPendingFirstMessage } from './composables/useInstanceAiHandoff';
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
			path: '/assistant',
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
						// Template deep-link entry (e.g. the n8n website). Only a numeric
						// template id is accepted — anything else lands on the empty view.
						const raw = to.query.templateId;
						if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
							return { name: INSTANCE_AI_VIEW };
						}
						const templateId = raw;

						// AI disabled → fall back to the classic template setup flow.
						const settings = useInstanceAiSettingsStore();
						if (settings.isInstanceAiDisabled) {
							return { name: VIEWS.TEMPLATE_SETUP, params: { id: templateId } };
						}

						// Threads are project-bound; deep links launch into the personal project.
						const projectsStore = useProjectsStore();
						if (!projectsStore.personalProject) {
							try {
								await projectsStore.getPersonalProject();
							} catch {
								return { name: INSTANCE_AI_VIEW };
							}
						}
						const projectId = projectsStore.personalProject?.id;
						if (!projectId) {
							return { name: INSTANCE_AI_VIEW };
						}

						const threadId = uuidv4();
						try {
							await useInstanceAiStore().syncThread(threadId, projectId, {
								source: 'website-template',
								origin: 'external',
								sourceContext: { templateId },
							});
						} catch {
							return { name: INSTANCE_AI_VIEW };
						}

						// Stash the kickoff as the thread's pending first message — the thread
						// view consumes and sends it after hydration + SSE connect, so the
						// guard never races the runtime.
						stashPendingFirstMessage(threadId, {
							message: i18n.baseText('instanceAi.launch.templateById.message', {
								interpolate: { id: templateId },
							}),
						});

						telemetry.track('User launched Instance AI thread', {
							thread_id: threadId,
							instance_id: useRootStore().instanceId,
							source: 'website-template',
							origin: 'external',
							template_id: templateId,
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
		// Permanent redirects from the legacy `/instance-ai` path to `/assistant`.
		{
			path: '/instance-ai',
			redirect: (to) => ({ name: INSTANCE_AI_VIEW, query: to.query, hash: to.hash }),
		},
		{
			path: '/instance-ai/:threadId',
			redirect: (to) => ({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId: to.params.threadId },
				query: to.query,
				hash: to.hash,
			}),
		},
		{
			path: 'assistant',
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
		// Permanent redirect from the legacy `/settings/instance-ai` path.
		{
			path: 'instance-ai',
			redirect: (to) => ({ name: INSTANCE_AI_SETTINGS_VIEW, query: to.query, hash: to.hash }),
			meta: {
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
