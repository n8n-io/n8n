import { computed, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import type { CommandGroup, CommandBarItem } from '../types';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';

const NAME_KEYWORDS = [
	'assistant',
	'ai assistant',
	'instance ai',
	'ai',
	'agent',
	'n8n agent',
	'chat',
];

export function useInstanceAiCommands(options: { lastQuery: Ref<string> }): CommandGroup {
	const i18n = useI18n();
	const { lastQuery } = options;
	const router = useRouter();
	const settingsStore = useSettingsStore();
	const instanceAiStore = useInstanceAiStore();

	const isInstanceAiCommandsVisible = computed(
		() =>
			settingsStore.isModuleActive('instance-ai') &&
			settingsStore.moduleSettings['instance-ai']?.enabled !== false,
	);

	const filteredThreads = computed(() => {
		const trimmed = (lastQuery.value || '').trim().toLowerCase();
		const allThreads = instanceAiStore.threads;

		if (!trimmed) return allThreads;

		return allThreads.filter((thread) => thread.title?.toLowerCase().includes(trimmed));
	});

	const openThreadCommands = computed<CommandBarItem[]>(() =>
		filteredThreads.value.map((thread) => ({
			id: thread.id,
			title: thread.title,
			section: i18n.baseText('commandBar.instanceAi.openThread'),
			keywords: [...NAME_KEYWORDS, thread.title],
			handler: () => {
				void router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId: thread.id } });
			},
		})),
	);

	const commands = computed<CommandBarItem[]>(() => {
		if (!isInstanceAiCommandsVisible.value) return [];

		return [
			{
				id: 'instance-ai-open',
				title: i18n.baseText('commandBar.instanceAi.open'),
				section: i18n.baseText('commandBar.sections.instanceAi'),
				handler: () => {
					void router.push({ name: INSTANCE_AI_VIEW });
				},
				icon: {
					component: N8nIcon,
					props: { icon: 'sparkles' },
				},
				keywords: [...NAME_KEYWORDS, 'open', 'view'],
			},
			{
				id: 'instance-ai-new-thread',
				title: i18n.baseText('commandBar.instanceAi.newThread'),
				section: i18n.baseText('commandBar.sections.instanceAi'),
				handler: () => {
					const threadId = instanceAiStore.newThread();
					void router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
				},
				icon: {
					component: N8nIcon,
					props: { icon: 'plus' },
				},
				keywords: [...NAME_KEYWORDS, 'new', 'conversation', 'thread', 'chat'],
			},
			{
				id: 'instance-ai-open-thread',
				title: i18n.baseText('commandBar.instanceAi.openThread'),
				section: i18n.baseText('commandBar.sections.instanceAi'),
				placeholder: i18n.baseText('commandBar.instanceAi.openThread.searchPlaceholder'),
				children: openThreadCommands.value,
				icon: {
					component: N8nIcon,
					props: { icon: 'message-square', color: 'text-light' },
				},
				keywords: [...NAME_KEYWORDS, 'open', 'conversation', 'thread', 'chat'],
			},
		];
	});

	return {
		commands,
		async initialize() {
			if (isInstanceAiCommandsVisible.value) {
				await instanceAiStore.loadThreads();
			}
		},
	};
}
