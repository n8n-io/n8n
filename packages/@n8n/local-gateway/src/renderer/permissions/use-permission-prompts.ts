import { computed, onUnmounted, watch } from 'vue';

import {
	connectLocalPromptSource,
	permissionPromptState,
	respondToPrompt,
} from './permission-prompt-store';
import { getThreadPromptWatcher, type ThreadPromptWatcher } from './thread-prompt-watcher';
import { chatOverlay, openChat } from '../chat/chat-overlay';
import { isChatThreadVisible } from '../chat/visible-chat-threads';

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

	// An 'external' prompt means the agent is waiting on input the prompt cards
	// cannot collect (question, plan review, setup) — open its conversation so
	// the user sees the request in context (the chat renders it as an assistant
	// message). Each prompt opens the chat at most once, so closing it isn't
	// fought.
	const openedExternalPromptIds = new Set<string>();
	const stopExternalPromptWatch = watch(
		() => permissionPromptState.prompts.length,
		() => {
			for (const prompt of permissionPromptState.prompts) {
				if (prompt.source !== 'instance' || prompt.kind !== 'external') continue;
				if (openedExternalPromptIds.has(prompt.id)) continue;
				openedExternalPromptIds.add(prompt.id);
				if (isChatThreadVisible(prompt.threadId)) continue;
				if (chatOverlay.isOpen && chatOverlay.threadId === prompt.threadId) continue;
				openChat(prompt.threadId);
			}
		},
		{ immediate: true },
	);

	registerCleanup(() => {
		stopChatThreadWatch();
		stopExternalPromptWatch();
		releaseChatWatch?.();
		releaseChatWatch = undefined;
	});

	return {
		/**
		 * Pending prompts for the floating card stack, oldest first. 'External'
		 * prompts of a thread whose chat transcript is on screen are omitted —
		 * the transcript renders them as assistant messages.
		 */
		prompts: computed(() =>
			permissionPromptState.prompts.filter(
				(prompt) =>
					!(
						prompt.source === 'instance' &&
						prompt.kind === 'external' &&
						isChatThreadVisible(prompt.threadId)
					),
			),
		),
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
