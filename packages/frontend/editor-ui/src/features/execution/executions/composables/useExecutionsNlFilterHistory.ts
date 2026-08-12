import type { ExecutionsNlFilterResponseDto } from '@n8n/api-types';
import { useUsersStore } from '@n8n/stores/users.store';
import { useLocalStorage } from '@vueuse/core';
import { computed } from 'vue';

import { LOCAL_STORAGE_EXECUTIONS_NL_FILTER_HISTORY } from '@/app/constants';

/**
 * Stores the raw AI extraction rather than the resolved `ExecutionFilterType`, so replaying an
 * entry re-runs `resolveNlFilterPatch` against the user's *current* workflows and tags. A workflow
 * or tag deleted since the query was saved then simply drops out of the filter instead of applying
 * a dangling ID, and the enterprise annotation-filter gate is re-evaluated at replay time.
 */
export type ExecutionsNlFilterHistoryEntry = {
	query: string;
	response: ExecutionsNlFilterResponseDto;
	savedAt: string;
};

/** Keeps localStorage bounded; the dropdown is a shortcut list, not an archive. */
const MAX_ENTRIES = 20;

export function useExecutionsNlFilterHistory() {
	const usersStore = useUsersStore();

	const entries = useLocalStorage<ExecutionsNlFilterHistoryEntry[]>(
		LOCAL_STORAGE_EXECUTIONS_NL_FILTER_HISTORY(usersStore.currentUserId ?? 'anonymous'),
		[],
	);

	/** Chronological ascending — newest last. */
	const history = computed(() => entries.value);

	function record(query: string, response: ExecutionsNlFilterResponseDto) {
		// Re-running an earlier query moves it to the end rather than appending a duplicate,
		// so the list stays a set of distinct queries ordered by when each was last used.
		const withoutDuplicate = entries.value.filter((entry) => entry.query !== query);

		entries.value = [
			...withoutDuplicate,
			{ query, response, savedAt: new Date().toISOString() },
		].slice(-MAX_ENTRIES);
	}

	function clear() {
		entries.value = [];
	}

	return { history, record, clear };
}
