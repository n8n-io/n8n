import { ref } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';

export type ChatPanelMode = 'assistant' | 'builder';

export const DEFAULT_CHAT_WIDTH = 400;

/**
 * Shared reactive state for chat panel that can be imported without circular dependencies.
 * This is a simple store that only holds state, no actions.
 * Updated by chatPanel.store.ts, read by assistant/builder stores.
 */
export const useChatPanelStateStore = defineStore(STORES.CHAT_PANEL_STATE, () => {
	const isOpen = ref(false);
	const width = ref(DEFAULT_CHAT_WIDTH);
	const activeMode = ref<ChatPanelMode>('builder');

	return {
		isOpen,
		width,
		activeMode,
	};
});
