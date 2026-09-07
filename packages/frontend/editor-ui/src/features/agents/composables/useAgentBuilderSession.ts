import { computed, ref, watch, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { truncate } from '@n8n/utils/string/truncate';
import { useRoute, useRouter } from 'vue-router';
import type { LocationQueryRaw } from 'vue-router';

import { useAgentSessionsStore } from '../agentSessions.store';
import { CONTINUE_SESSION_ID_PARAM, NEW_SESSION_PARAM } from '../constants';
import { useThreadTitle } from '../utils/thread-title';
import { useRelativeTimestamp } from '../utils/relative-time';

/**
 * Max chars for session-name display in the preview breadcrumb dropdown trigger
 * and its menu rows. Long titles otherwise crowd the header actions.
 */
const SESSION_TITLE_MAX_CHARS = 64;

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

interface AgentBuilderSessionOptions {
	routeBacked: Readonly<Ref<boolean>>;
}

/**
 * Owns the preview chat-session state:
 *
 * - `continueSessionId` — set via the URL query string for shareable deep-links
 *   into a specific session. Takes precedence when route backing is enabled.
 * - `activeChatSessionId` — the in-tab session selection. Used exclusively
 *   when route backing is disabled and as a fallback otherwise.
 *
 * Plus the session-picker dropdown menu and titles, all driven off the
 * `agentSessionsStore` thread list.
 */
export function useAgentBuilderSession({ routeBacked }: AgentBuilderSessionOptions) {
	const route = useRoute();
	const router = useRouter();
	const i18n = useI18n();
	const sessionsStore = useAgentSessionsStore();
	const threadTitleOf = useThreadTitle();
	const relativeTimeOf = useRelativeTimestamp();

	const activeChatSessionId = ref<string | null>(null);
	const pendingRouteSessionId = ref<string | null>(null);
	const ephemeralSessionId = ref<string | null>(null);
	const continueSessionId = computed(() => {
		// Vue Router types this as `LocationQuery[key]: string | string[] | null`.
		// Picking the first string defends against duplicate query params
		// (`?session=a&session=b` → array) and unset/null values.
		const raw = route.query[CONTINUE_SESSION_ID_PARAM];
		const value = Array.isArray(raw) ? raw[0] : raw;
		return typeof value === 'string' && value.length > 0 ? value : undefined;
	});
	const effectiveSessionId = computed<string | undefined>(
		() =>
			(routeBacked.value ? (pendingRouteSessionId.value ?? continueSessionId.value) : undefined) ??
			activeChatSessionId.value ??
			undefined,
	);

	watch(
		[routeBacked, continueSessionId],
		([isRouteBacked, routeSessionId]) => {
			if (!isRouteBacked) {
				pendingRouteSessionId.value = null;
				return;
			}
			if (routeSessionId && routeSessionId !== ephemeralSessionId.value) {
				ephemeralSessionId.value = null;
			}
			if (pendingRouteSessionId.value !== null) {
				// Setting the pending id does not trigger this watcher. Any later
				// route change is authoritative, whether it confirms the replace or
				// comes from back/forward navigation.
				pendingRouteSessionId.value = null;
			}
			if (routeSessionId) activeChatSessionId.value = routeSessionId;
		},
		{ immediate: true },
	);

	watch(activeChatSessionId, (sessionId) => {
		if (sessionId === null) {
			pendingRouteSessionId.value = null;
			ephemeralSessionId.value = null;
		} else {
			if (ephemeralSessionId.value !== null && sessionId !== ephemeralSessionId.value) {
				ephemeralSessionId.value = null;
			}
			if (routeBacked.value && sessionId !== continueSessionId.value) {
				pendingRouteSessionId.value = sessionId;
			}
		}
	});
	const currentSessionIsEphemeral = computed(
		() =>
			ephemeralSessionId.value !== null && ephemeralSessionId.value === effectiveSessionId.value,
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

	function selectSession(id: string, ephemeral = false) {
		activeChatSessionId.value = id;
		ephemeralSessionId.value = ephemeral ? id : null;
		if (!routeBacked.value) return;
		pendingRouteSessionId.value = id;
		const query: LocationQueryRaw = { ...route.query, [CONTINUE_SESSION_ID_PARAM]: id };
		if (ephemeral) delete query[NEW_SESSION_PARAM];
		void router.replace({ query });
	}

	function setSessionInUrl(id: string) {
		selectSession(id);
	}

	function clearContinueSessionParam() {
		if (!routeBacked.value) return;
		const { [CONTINUE_SESSION_ID_PARAM]: _dropped, ...rest } = route.query as LocationQueryRaw;
		void router.replace({ query: rest });
	}

	function onSessionPick(id: string) {
		if (id === '__empty__') return;
		selectSession(id);
	}

	function onNewChat() {
		selectSession(crypto.randomUUID(), true);
	}

	return {
		activeChatSessionId,
		continueSessionId,
		effectiveSessionId,
		currentSessionHasMessages,
		currentSessionTitle,
		currentSessionIsEphemeral,
		sessionMenu,
		setSessionInUrl,
		clearContinueSessionParam,
		onSessionPick,
		onNewChat,
	};
}
