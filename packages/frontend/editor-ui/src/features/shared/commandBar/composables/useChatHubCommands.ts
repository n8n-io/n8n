import { computed, type Ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import type { CommandGroup, CommandBarItem } from '../types';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import type { ChatHubSessionDto, ChatSessionId } from '@n8n/api-types';
import { CHAT_CONVERSATION_VIEW, CHAT_VIEW } from '@/features/ai/chatHub/constants';

const ITEM_ID = {
	NEW_SESSION: 'new-session',
	OPEN_SESSION: 'open-session',
	DELETE_SESSION: 'delete-session',
	STOP_MESSAGE_GENERATION: 'stop-message-generation',
} as const;

export function useChatHubCommands(options: {
	lastQuery: Ref<string>;
}): CommandGroup {
	const i18n = useI18n();
	const { lastQuery } = options;
	const router = useRouter();
	const route = useRoute();
	const chatStore = useChatStore();
	const toast = useToast();
	const message = useMessage();

	const currentSessionId = computed<ChatSessionId | null>(() =>
		typeof route.params.id === 'string' ? route.params.id : null,
	);

	const isResponding = computed(() => {
		if (!currentSessionId.value) return false;
		return chatStore.isResponding(currentSessionId.value);
	});

	async function handleDeleteSession(sessionId: ChatSessionId) {
		const confirmed = await message.confirm(
			i18n.baseText('chatHub.session.delete.confirm.message'),
			i18n.baseText('chatHub.session.delete.confirm.title'),
			{
				confirmButtonText: i18n.baseText('chatHub.session.delete.confirm.button'),
				cancelButtonText: i18n.baseText('chatHub.session.delete.cancel.button'),
			},
		);

		if (confirmed !== MODAL_CONFIRM) {
			return;
		}

		try {
			await chatStore.deleteSession(sessionId);
			toast.showMessage({
				type: 'success',
				title: i18n.baseText('chatHub.session.delete.success'),
			});

			if (sessionId === currentSessionId.value) {
				void router.push({ name: CHAT_VIEW });
			}
		} catch (error) {
			toast.showError(error, i18n.baseText('chatHub.session.delete.error'));
		}
	}

	const filteredSesssions = computed<ChatHubSessionDto[]>(() => {
		const trimmed = (lastQuery.value || '').trim().toLowerCase();

		// TODO: Pagination, loading
		const allSesssions = Object.values(chatStore.sessions.byId) ?? [];

		if (!trimmed) {
			return allSesssions;
		}

		const filtered = allSesssions.filter((session) =>
			session.title?.toLowerCase().includes(trimmed),
		);

		return filtered;
	});

	const openSessionCommand = (session: ChatHubSessionDto, isRoot: boolean): CommandBarItem => {
		let title = session.title;

		if (isRoot) {
			title = i18n.baseText('generic.openResource', { interpolate: { resource: title } });
		}

		const section = isRoot
			? i18n.baseText('commandBar.sections.chat')
			: i18n.baseText('commandBar.chat.open');

		return {
			id: session.id,
			title,
			section,
			keywords: [title],
			handler: () => {
				void router.push({ name: CHAT_CONVERSATION_VIEW, params: { id: session.id } });
			},
		};
	};

	const openSessionCommands = computed<CommandBarItem[]>(() => {
		return filteredSesssions.value.map((session) => openSessionCommand(session, false));
	});

	const deleteSessionCommand = (session: ChatHubSessionDto, isRoot: boolean): CommandBarItem => {
		let title = session.title;

		if (isRoot) {
			title = i18n.baseText('commandBar.chat.deleteSession', { interpolate: { title } });
		}

		const section = isRoot
			? i18n.baseText('commandBar.sections.chat')
			: i18n.baseText('commandBar.chat.delete');

		return {
			id: session.id,
			title,
			section,
			handler: () => {
				void handleDeleteSession(session.id);
			},
		};
	};

	const deleteSessionCommands = computed<CommandBarItem[]>(() => {
		return filteredSesssions.value.map((session) => deleteSessionCommand(session, false));
	});

	const chatHubCommands = computed<CommandBarItem[]>(() => {
		const commands: CommandBarItem[] = [
			{
				id: ITEM_ID.NEW_SESSION,
				title: i18n.baseText('commandBar.chat.new'),
				section: i18n.baseText('commandBar.sections.chat'),
				handler: () => {
					void router.push({ name: CHAT_VIEW, force: true });
				},
				icon: {
					component: N8nIcon,
					props: {
						icon: 'square-pen',
					},
				},
			},
			{
				id: ITEM_ID.OPEN_SESSION,
				title: i18n.baseText('commandBar.chat.open'),
				section: i18n.baseText('commandBar.sections.chat'),
				placeholder: i18n.baseText('commandBar.chat.open.searchPlaceholder'),
				children: openSessionCommands.value,
				icon: {
					component: N8nIcon,
					props: {
						icon: 'layers',
						color: 'text-light',
					},
				},
			},
			{
				id: ITEM_ID.DELETE_SESSION,
				title: i18n.baseText('commandBar.chat.delete'),
				section: i18n.baseText('commandBar.sections.chat'),
				placeholder: i18n.baseText('commandBar.chat.open.searchPlaceholder'),
				children: deleteSessionCommands.value,
				icon: {
					component: N8nIcon,
					props: {
						icon: 'trash-2',
						color: 'text-light',
					},
				},
			},
		];

		if (isResponding.value && currentSessionId.value) {
			commands.push({
				id: ITEM_ID.STOP_MESSAGE_GENERATION,
				title: i18n.baseText('commandBar.chat.stop'),
				section: i18n.baseText('commandBar.sections.chat'),
				handler: async () => {
					if (!currentSessionId.value) return;
					await chatStore.stopStreamingMessage(currentSessionId.value);
				},
			});
		}

		return commands;
	});

	return {
		commands: chatHubCommands,
	};
}
