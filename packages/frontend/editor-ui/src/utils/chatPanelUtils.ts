import { ref } from 'vue';

export type ChatPanelMode = 'assistant' | 'builder';

/**
 * Shared reactive state for chat panel that can be imported without circular dependencies.
 * Updated by chatPanel.store.ts, read by assistant/builder stores.
 */
export const chatPanelState = {
	isOpen: ref(false),
	width: ref(400),
	activeMode: ref<ChatPanelMode>('builder'),
};
