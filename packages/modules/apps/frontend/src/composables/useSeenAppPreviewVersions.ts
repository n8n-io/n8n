import { useUsersStore } from '@n8n/stores/users.store';
import { useLocalStorage } from '@vueuse/core';
import { ref, type Ref } from 'vue';

const MAX_SEEN_VERSIONS = 200;

const lists = new Map<string, Ref<string[]>>();

function seenList(userId: string | null): Ref<string[]> {
	if (!userId) return ref([]);
	const key = `${userId}_N8N_APP_PREVIEW_SEEN_VERSIONS`;
	let list = lists.get(key);
	if (!list) {
		list = useLocalStorage<string[]>(key, [], { writeDefaults: false });
		lists.set(key, list);
	}
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
