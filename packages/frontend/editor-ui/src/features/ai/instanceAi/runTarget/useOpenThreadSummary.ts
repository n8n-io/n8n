import { computed } from 'vue';

import { useInstanceAiStore, useOptionalThread, useThread } from '../instanceAi.store';

type InstanceAiStore = ReturnType<typeof useInstanceAiStore>;

/** The sidebar list and the history page can each hold a copy of the chat. */
function summaryOf(store: InstanceAiStore, threadId: string) {
	return (
		store.threads.find(({ id }) => id === threadId) ??
		store.threadHistory.threads.find(({ id }) => id === threadId)
	);
}

/** The store copy of the open chat. The sidebar list and the history page can each hold one. */
export function useOpenThreadSummary() {
	const thread = useThread();
	const store = useInstanceAiStore();
	return computed(() => summaryOf(store, thread.id));
}

/** The store copy of the open chat, or `undefined` outside a chat, for parts that render alone too. */
export function useOptionalOpenThreadSummary() {
	const thread = useOptionalThread();
	const store = useInstanceAiStore();
	return computed(() => (thread ? summaryOf(store, thread.id) : undefined));
}
