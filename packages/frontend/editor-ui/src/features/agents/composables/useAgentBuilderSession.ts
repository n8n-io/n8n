import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { truncate } from '@n8n/utils';
import { useRoute, useRouter } from 'vue-router';
import type { LocationQueryRaw } from 'vue-router';

import { useAgentSessionsStore } from '../agentSessions.store';
import { CONTINUE_SESSION_ID_PARAM } from '../constants';
import { useThreadTitle } from '../utils/thread-title';
import { useRelativeTimestamp } from '../utils/relative-time';

/**
 * Max chars for session-name display in the chat-header dropdown trigger and
 * its menu rows. Long titles otherwise wrap and push the "new chat" button
 * onto a second line.
 */
const SESSION_TITLE_MAX_CHARS = 20;

interface SessionMenuItem {
	id: string;
	/**
	 * Always empty for thread rows — the visible row content is rendered by the
	 * view's `item.append.<id>` slot so we can truncate the label and right-align
	 * the timestamp. Populated only for the disabled empty-state row.
	 */
	title: string;
	disabled?: boolean;
	/** Visible label (LLM title or first-message preview). Used by the slot renderer. */
	label?: string;
	/** Right-aligned secondary text (e.g. "5m ago"). Used by the slot renderer. */
	when?: string;
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
	const relativeTimeOf = useRelativeTimestamp();

	const activeChatSessionId = ref<string | null>(null);
	const continueSessionId = computed(() => {
		// Vue Router types this as `LocationQuery[key]: string | string[] | null`.
		// Picking the first string defends against duplicate query params
		// (`?session=a&session=b` → array) and unset/null values.
		const raw = route.query[CONTINUE_SESSION_ID_PARAM];
		const value = Array.isArray(raw) ? raw[0] : raw;
		return typeof value === 'string' && value.length > 0 ? value : undefined;
	});
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
		return truncate(threadTitleOf(thread), SESSION_TITLE_MAX_CHARS);
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
			title: '',
			label: truncate(threadTitleOf(thread), SESSION_TITLE_MAX_CHARS),
			when: relativeTimeOf(thread.updatedAt),
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
