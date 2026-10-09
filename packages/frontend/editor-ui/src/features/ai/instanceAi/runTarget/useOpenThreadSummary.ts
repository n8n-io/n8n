import { computed } from 'vue';

import { useInstanceAiStore, useThread } from '../instanceAi.store';

/** The store copy of the open chat. The sidebar list and the history page can each hold one. */
export function useOpenThreadSummary() {
	const thread = useThread();
	const store = useInstanceAiStore();
	return computed(
		() =>
			store.threads.find(({ id }) => id === thread.id) ??
			store.threadHistory.threads.find(({ id }) => id === thread.id),
	);
}
