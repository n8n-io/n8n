import { reactive, readonly } from 'vue';

interface ChatOverlayState {
	isOpen: boolean;
	threadId: string | null;
	title: string | null;
}

const state = reactive<ChatOverlayState>({
	isOpen: false,
	threadId: null,
	title: null,
});

/** Reactive chat-overlay state for App.vue / ChatPanel / AppHeader. */
export const chatOverlay = readonly(state);

/**
 * Open the chat overlay for a thread — callable from anywhere (composer flow,
 * history, …). `title` is an optional initial header label (refined later by
 * the thread's own title events).
 */
export function openChat(threadId: string, options: { title?: string } = {}): void {
	state.threadId = threadId;
	state.title = options.title ?? null;
	state.isOpen = true;
}

export function closeChat(): void {
	state.isOpen = false;
	state.threadId = null;
	state.title = null;
}

/** Update the header label; a fallback never overrides an already-known title. */
export function setChatTitle(title: string, options: { fallback?: boolean } = {}): void {
	if (options.fallback && state.title) return;
	state.title = title;
}
