import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import type { PushMessage } from '@n8n/api-types';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { TIME } from '@/app/constants/durations';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { ASSISTANT_AGENT_ID } from '../agentsChatMode';
import { useInstanceAiStore } from '../instanceAi.store';

/** The list reloads at most once in this time. */
const RELOAD_INTERVAL = TIME.SECOND;

/** True for a push event that can change the state of an Assistant chat. */
export function isAssistantThreadEvent(event: PushMessage): boolean {
	return (
		(event.type === 'agentExecutionUpdated' || event.type === 'agentBackgroundTasksUpdated') &&
		event.data.agentId === ASSISTANT_AGENT_ID
	);
}

/**
 * Reloads the chat list of the sidebar when the server reports a change to an Assistant chat,
 * also while the user works on another page. The push event only tells that something changed,
 * so the list loads again from the server.
 */
export function useLiveThreadList(enabled: MaybeRefOrGetter<boolean>) {
	const store = useInstanceAiStore();
	const wait = getDebounceTime(RELOAD_INTERVAL);
	let stopListening: (() => void) | undefined;

	// The server sends an event for each step of a running turn. `maxWait` makes a long run of
	// events reload once a second, so that the sidebar shows "Working" while the turn runs.
	const reload = useDebounceFn(
		() => {
			if (stopListening) void store.loadThreads();
		},
		wait,
		{ maxWait: wait },
	);

	function start() {
		if (stopListening) return;
		const pushStore = usePushConnectionStore();
		const removeListener = pushStore.addEventListener((event) => {
			if (isAssistantThreadEvent(event)) void reload();
		});
		// Pages without a workflow or chat do not open the push connection, so the sidebar asks
		// for it. The store counts the owners, so this closes it only when no page needs it.
		pushStore.pushConnect();
		stopListening = () => {
			removeListener();
			pushStore.pushDisconnect();
		};
	}

	function stop() {
		stopListening?.();
		stopListening = undefined;
	}

	watch(
		() => toValue(enabled),
		(isOn) => (isOn ? start() : stop()),
		{ immediate: true },
	);
	onScopeDispose(stop);
}
