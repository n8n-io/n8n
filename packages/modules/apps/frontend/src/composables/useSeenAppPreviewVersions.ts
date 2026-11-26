import { useUsersStore } from '@n8n/stores/users.store';
import { useLocalStorage } from '@vueuse/core';
import { ref } from 'vue';

const MAX_SEEN_VERSIONS = 200;

export function useSeenAppPreviewVersions() {
	const userId = useUsersStore().currentUserId;
	const seen = userId
		? useLocalStorage<string[]>(`${userId}_N8N_APP_PREVIEW_SEEN_VERSIONS`, [], {
				writeDefaults: false,
			})
		: ref<string[]>([]);

	function hasSeen(versionId: string) {
		return seen.value.includes(versionId);
	}

	function markSeen(versionId: string) {
		if (hasSeen(versionId)) return;
		seen.value = [...seen.value, versionId].slice(-MAX_SEEN_VERSIONS);
	}

	return { hasSeen, markSeen };
}
