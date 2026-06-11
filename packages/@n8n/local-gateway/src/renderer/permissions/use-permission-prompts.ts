import { computed, onUnmounted, watch } from 'vue';

import {
	connectLocalPromptSource,
	permissionPromptState,
	respondToPrompt,
} from './permission-prompt-store';
import { getThreadPromptWatcher, type ThreadPromptWatcher } from './thread-prompt-watcher';
import { chatOverlay } from '../chat/chat-overlay';

/**
 * Internal factory behind `usePermissionPrompts` — tests inject `registerCleanup`
 * because Vue lifecycle hooks can't fire outside a component instance.
 */
export function createPermissionPrompts(
	watcher: Pick<ThreadPromptWatcher, 'watchThread'>,
	registerCleanup: (cleanup: () => void) => void,
) {
	connectLocalPromptSource();

	// The open chat's thread is permission-watched for as long as it stays open;
	// task-triggered threads are tracked app-wide by the watcher itself.
	let releaseChatWatch: (() => void) | undefined;
	const stopChatThreadWatch = watch(
		() => chatOverlay.threadId,
		(threadId) => {
			releaseChatWatch?.();
			releaseChatWatch = threadId ? watcher.watchThread(threadId) : undefined;
		},
		{ immediate: true },
	);

	registerCleanup(() => {
		stopChatThreadWatch();
		releaseChatWatch?.();
		releaseChatWatch = undefined;
	});

	return {
		/** All pending prompts, oldest first. */
		prompts: computed(() => permissionPromptState.prompts),
		/** Prompt ids with an in-flight response. */
		respondingIds: computed(() => permissionPromptState.respondingIds),
		/** Prompt ids whose response failed retryably. */
		failedIds: computed(() => permissionPromptState.failedIds),
		respondToPrompt,
	};
}

/**
 * The App-level permission prompt surface: connects the local (main-process)
 * prompt source, watches the open chat thread for instance confirmations, and
 * exposes the reactive prompt list. Watches are released when the calling
 * component unmounts.
 */
export function usePermissionPrompts() {
	return createPermissionPrompts(getThreadPromptWatcher(), onUnmounted);
}
