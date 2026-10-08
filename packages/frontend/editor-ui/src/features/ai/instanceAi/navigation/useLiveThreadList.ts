import type { MaybeRefOrGetter } from 'vue';
import type { PushMessage } from '@n8n/api-types';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { TIME } from '@/app/constants/durations';
import { ASSISTANT_AGENT_ID } from '../agentsChatMode';
import { useInstanceAiStore } from '../instanceAi.store';
import { usePushTrigger } from './usePushTrigger';

/** The list reloads this long after the last event of a burst. */
const RELOAD_DELAY = TIME.SECOND;

/** While events keep coming, the list reloads at least once in this time. */
const MAX_RELOAD_DELAY = 3 * TIME.SECOND;

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

	// The server sends an event for each step of a running turn, so a burst can last as long as
	// the turn. `maxWait` lets the sidebar show "Working" while the turn runs. It is longer than
	// `wait`, because each reload is a full list request.
	usePushTrigger(enabled, isAssistantThreadEvent, async () => await store.loadThreads(), {
		wait: getDebounceTime(RELOAD_DELAY),
		maxWait: getDebounceTime(MAX_RELOAD_DELAY),
	});
}
