import { computed, watch } from 'vue';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';

/**
 * One key for each chat that is not working: its ID and the time of its last activity.
 * Chats after the first 50 have no activity time, so their last update counts.
 */
export function settledActivityKeys(threads: readonly InstanceAiThreadSummary[]): Set<string> {
	return new Set(
		threads
			.filter((thread) => thread.state !== 'working')
			.map((thread) => `${thread.id}@${thread.lastActivityAt ?? thread.updatedAt}`),
	);
}

/** True when `next` has a key that `previous` does not have. */
export function hasNewKey(previous: ReadonlySet<string>, next: ReadonlySet<string>): boolean {
	for (const key of next) {
		if (!previous.has(key)) return true;
	}
	return false;
}

/**
 * Calls `onEnded` when a chat of the sidebar list ends a turn: the chat stops working, or it
 * has new activity and is not working (a turn too short to show as working). The live list
 * (`useLiveThreadList`) keeps the store current. The first list that has chats is the
 * baseline, so the first load of the list calls nothing.
 */
export function useChatTurnEnded(onEnded: () => void) {
	const store = useInstanceAiStore();
	const keys = computed(() => settledActivityKeys(store.threads));
	let hasBaseline = store.threads.length > 0;

	watch(keys, (next, previous) => {
		if (!hasBaseline) {
			hasBaseline = store.threads.length > 0;
			return;
		}
		if (hasNewKey(previous, next)) onEnded();
	});
}
