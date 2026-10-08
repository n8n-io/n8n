import { computed, type Ref } from 'vue';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';

/**
 * Shows the chat `workingThreadId` as working when the server sent no state for it. A new chat
 * gets its state only with the next list load, so without this it would show as done while its
 * first turn runs. A state from the server always wins.
 */
export function withLocalWork(
	threads: InstanceAiThreadSummary[],
	workingThreadId: string | undefined,
): InstanceAiThreadSummary[] {
	if (workingThreadId === undefined) return threads;
	return threads.map(
		(thread): InstanceAiThreadSummary =>
			thread.id === workingThreadId && thread.state === undefined && thread.needsInput === undefined
				? { ...thread, state: 'working' }
				: thread,
	);
}

/**
 * The chats of the sidebar. The open chat counts as working while it sends or streams a turn in
 * this tab. Only the open chat has a live chat view, so only its runtime state is current.
 */
export function useSidebarThreads(openThreadId: Readonly<Ref<string | undefined>>) {
	const store = useInstanceAiStore();

	const workingHere = computed(() => {
		const threadId = openThreadId.value;
		if (threadId === undefined) return undefined;
		const runtime = store.getRuntime(threadId);
		return runtime?.isStreaming === true || runtime?.isSendingMessage === true
			? threadId
			: undefined;
	});

	return computed(() => withLocalWork(store.threads, workingHere.value));
}
