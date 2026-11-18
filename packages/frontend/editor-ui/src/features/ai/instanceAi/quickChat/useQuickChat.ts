import { reactive, readonly } from 'vue';
import { v4 as uuidv4 } from 'uuid';

export interface QuickChatAnchor {
	/** The right edge and top of the element that opened the chat, in viewport pixels */
	right: number;
	top: number;
}

interface QuickChatState {
	open: boolean;
	anchor: QuickChatAnchor | null;
	/** The thread the chat shows. It stays a local draft until the first message is sent. */
	threadId: string;
	isDraft: boolean;
}

// One quick chat for the whole app. Module state, so it survives the layout changes that
// mount a new navigation, and the chat keeps its thread while the user moves around.
const state = reactive<QuickChatState>({
	open: false,
	anchor: null,
	threadId: uuidv4(),
	isDraft: true,
});

/**
 * Quick chat: a small floating Assistant chat that opens next to the Assistant rail item,
 * so the user can ask something without leaving the page they are on.
 */
export function useQuickChat() {
	function open(anchor: QuickChatAnchor | null) {
		state.anchor = anchor;
		state.open = true;
	}

	function close() {
		state.open = false;
	}

	function toggle(anchor: QuickChatAnchor | null) {
		if (state.open) close();
		else open(anchor);
	}

	/** Starts again with an empty chat. The previous chat stays in the Assistant's history. */
	function startNewChat() {
		state.threadId = uuidv4();
		state.isDraft = true;
	}

	/** The first message saved the thread, so it is no longer a draft. */
	function markPersisted(threadId: string) {
		if (state.threadId === threadId) state.isDraft = false;
	}

	return { state: readonly(state), open, close, toggle, startNewChat, markPersisted };
}
