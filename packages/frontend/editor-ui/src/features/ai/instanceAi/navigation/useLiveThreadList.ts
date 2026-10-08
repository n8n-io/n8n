import type { MaybeRefOrGetter } from 'vue';
import type { PushMessage } from '@n8n/api-types';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { TIME } from '@/app/constants/durations';
import { ASSISTANT_AGENT_ID } from '../agentsChatMode';
import { useInstanceAiStore } from '../instanceAi.store';
import { usePushTrigger } from './usePushTrigger';

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
 * also while the user works on another page.
 */
export function useLiveThreadList(enabled: MaybeRefOrGetter<boolean>) {
	const store = useInstanceAiStore();
	const wait = getDebounceTime(RELOAD_INTERVAL);

	// The server sends an event for each step of a running turn. `maxWait` makes a long run of
	// events reload once a second, so that the sidebar shows "Working" while the turn runs.
	usePushTrigger(enabled, isAssistantThreadEvent, async () => await store.loadThreads(), {
		wait,
		maxWait: wait,
	});
}
