import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRoute, useRouter } from 'vue-router';
import type { LocationQueryRaw } from 'vue-router';

import { useAgentSessionsStore } from '../agentSessions.store';
import { CONTINUE_SESSION_ID_PARAM } from '../constants';
import { useThreadTitle } from '../utils/thread-title';

interface SessionMenuItem {
	id: string;
	title: string;
	disabled?: boolean;
}

/**
 * Owns the chat-session state that's split across two surfaces in the builder:
 *
 * - `continueSessionId` — set via the URL query string for shareable deep-links
 *   into a specific session. Takes precedence when present.
 * - `activeChatSessionId` — the in-tab ephemeral session. Set when the user
 *   starts a new chat from the home input; cleared on the back button.
 *
 * Plus the session-picker dropdown menu and titles, all driven off the
 * `agentSessionsStore` thread list.
 */
export function useAgentBuilderSession() {
	const route = useRoute();
	const router = useRouter();
	const i18n = useI18n();
	const sessionsStore = useAgentSessionsStore();
	const threadTitleOf = useThreadTitle();

	const activeChatSessionId = ref<string | null>(null);
	const continueSessionId = computed(
		() => route.query[CONTINUE_SESSION_ID_PARAM] as string | undefined,
	);
	const effectiveSessionId = computed<string | undefined>(
		() => continueSessionId.value ?? activeChatSessionId.value ?? undefined,
	);

	/**
	 * The current session is "empty" until it's been persisted as a thread —
	 * a freshly minted `activeChatSessionId` doesn't show up in `threads` until
	 * the user sends the first message.
	 */
	const currentSessionHasMessages = computed(() => {
		const id = effectiveSessionId.value;
		if (!id) return false;
		return (sessionsStore.threads ?? []).some((t) => t.id === id);
	});

	const currentSessionTitle = computed(() => {
		const id = effectiveSessionId.value;
		if (!id) return '';
		const thread = (sessionsStore.threads ?? []).find((t) => t.id === id);
		if (!thread) return i18n.baseText('agents.builder.chat.newChat.label');
		return threadTitleOf(thread);
	});

	const sessionMenu = computed<SessionMenuItem[]>(() => {
		const threads = sessionsStore.threads ?? [];
		if (threads.length === 0) {
			return [
				{
					id: '__empty__',
					title: i18n.baseText('agents.builder.chat.sessionPicker.empty'),
					disabled: true,
				},
			];
		}
		return threads.map((thread) => ({
			id: thread.id,
			title: threadTitleOf(thread),
		}));
	});

	function setSessionInUrl(id: string) {
		activeChatSessionId.value = id;
		void router.replace({ query: { ...route.query, [CONTINUE_SESSION_ID_PARAM]: id } });
	}

	function clearContinueSessionParam() {
		const { [CONTINUE_SESSION_ID_PARAM]: _dropped, ...rest } = route.query as LocationQueryRaw;
		void router.replace({ query: rest });
	}

	function onSessionPick(id: string) {
		if (id === '__empty__') return;
		activeChatSessionId.value = null;
		void router.replace({ query: { ...route.query, [CONTINUE_SESSION_ID_PARAM]: id } });
	}

	function onNewChat() {
		activeChatSessionId.value = null;
		setSessionInUrl(crypto.randomUUID());
	}

	return {
		activeChatSessionId,
		continueSessionId,
		effectiveSessionId,
		currentSessionHasMessages,
		currentSessionTitle,
		sessionMenu,
		setSessionInUrl,
		clearContinueSessionParam,
		onSessionPick,
		onNewChat,
	};
}
