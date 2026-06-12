import { reactive } from 'vue';

/**
 * Thread ids whose chat transcript is currently on screen (overlay or chat
 * tab). ChatMessages registers itself while mounted; the App-level prompt
 * stack hides 'external' prompts the transcript already renders, and the
 * auto-open-on-external-prompt logic skips threads already in view.
 * Refcounted — the overlay and the tab can briefly show the same thread.
 */
const visibleCounts = reactive(new Map<string, number>());

export function markChatThreadVisible(threadId: string): () => void {
	visibleCounts.set(threadId, (visibleCounts.get(threadId) ?? 0) + 1);
	let released = false;
	return () => {
		if (released) return;
		released = true;
		const count = visibleCounts.get(threadId) ?? 0;
		if (count <= 1) visibleCounts.delete(threadId);
		else visibleCounts.set(threadId, count - 1);
	};
}

export function isChatThreadVisible(threadId: string): boolean {
	return visibleCounts.has(threadId);
}
