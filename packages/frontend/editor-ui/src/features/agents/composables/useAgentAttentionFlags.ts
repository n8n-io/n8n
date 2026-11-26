import type { AgentAttentionFlag } from '@n8n/api-types';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import { useAgentSessionsStore } from '../agentSessions.store';

/**
 * Reads attention flags for one agent from the sessions store.
 * The store fetches the flags with the session list, so this composable sends no extra requests.
 */
export function useAgentAttentionFlags(
	projectId: MaybeRefOrGetter<string>,
	agentId: MaybeRefOrGetter<string>,
) {
	const sessionsStore = useAgentSessionsStore();

	const flags = computed(() => sessionsStore.attentionFlags);
	const count = computed(() => flags.value.length);
	const hasFlags = computed(() => count.value > 0);
	const flaggedSessionIds = computed(() => new Set(flags.value.map(({ sessionId }) => sessionId)));

	function isFlagged(sessionId: string) {
		return flaggedSessionIds.value.has(sessionId);
	}

	async function dismiss(toDismiss: AgentAttentionFlag[] = flags.value) {
		await sessionsStore.dismissAttentionFlags(toValue(projectId), toValue(agentId), toDismiss);
	}

	async function dismissSession(sessionId: string) {
		await dismiss(flags.value.filter((flag) => flag.sessionId === sessionId));
	}

	/** Dismisses every flag in the current list. Flags that arrive later stay visible. */
	async function dismissAllSessions() {
		await dismiss([...flags.value]);
	}

	return {
		flags,
		count,
		hasFlags,
		flaggedSessionIds,
		isFlagged,
		dismiss,
		dismissSession,
		dismissAllSessions,
	};
}
