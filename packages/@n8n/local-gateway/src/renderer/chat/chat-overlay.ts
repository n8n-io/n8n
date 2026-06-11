import { reactive, readonly } from 'vue';

interface ChatOverlayState {
	isOpen: boolean;
	threadId: string | null;
	/** Replay cursor handed to ChatMessages — see its `lastEventId` prop contract. */
	lastEventId: number | undefined;
	title: string | null;
}

const state = reactive<ChatOverlayState>({
	isOpen: false,
	threadId: null,
	lastEventId: undefined,
	title: null,
});

/** Reactive chat-overlay state for App.vue / ChatPanel / AppHeader. */
export const chatOverlay = readonly(state);

/**
 * Open the chat overlay for a thread — callable from anywhere (composer flow,
 * history, …). `lastEventId` replays the thread's events from where the caller
 * started observing; `title` is an optional initial header label (refined later
 * by the thread's own title events).
 */
export function openChat(
	threadId: string,
	options: { lastEventId?: number; title?: string } = {},
): void {
	state.threadId = threadId;
	state.lastEventId = options.lastEventId;
	state.title = options.title ?? null;
	state.isOpen = true;
}

export function closeChat(): void {
	state.isOpen = false;
	state.threadId = null;
	state.lastEventId = undefined;
	state.title = null;
}

/** Update the header label; a fallback never overrides an already-known title. */
export function setChatTitle(title: string, options: { fallback?: boolean } = {}): void {
	if (options.fallback && state.title) return;
	state.title = title;
}
