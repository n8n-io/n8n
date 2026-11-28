import { useUsersStore } from '@n8n/stores/users.store';
import { useLocalStorage } from '@vueuse/core';
import { effectScope, ref, type Ref } from 'vue';

const MAX_SEEN_VERSIONS = 200;

const lists = new Map<string, Ref<string[]>>();
const scope = effectScope(true);

function seenList(userId: string | null): Ref<string[]> {
	if (!userId) return ref([]);
	const key = `${userId}_N8N_APP_PREVIEW_SEEN_VERSIONS`;
	const cached = lists.get(key);
	if (cached) return cached;
	const list =
		scope.run(() => useLocalStorage<string[]>(key, [], { writeDefaults: false })) ?? ref([]);
	lists.set(key, list);
	return list;
}

/**
 * The app versions that the current user ran in a preview or that their assistant wrote.
 * The preview runs these without a confirmation.
 */
export function useSeenAppPreviewVersions() {
	const seen = seenList(useUsersStore().currentUserId);

	function hasSeen(versionId: string) {
		return seen.value.includes(versionId);
	}

	function markSeen(versionId: string) {
		if (hasSeen(versionId)) return;
		seen.value = [...seen.value, versionId].slice(-MAX_SEEN_VERSIONS);
	}

	return { hasSeen, markSeen };
}
