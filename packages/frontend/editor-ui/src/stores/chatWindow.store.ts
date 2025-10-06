import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { STORES } from '@n8n/stores';
import { useUIStore } from '@/stores/ui.store';

export const MAX_CHAT_WIDTH = 425;
export const MIN_CHAT_WIDTH = 380;
export const DEFAULT_CHAT_WIDTH = 400;
const PANEL_CLOSE_ANIMATION_DURATION = 200;

export type ChatWindowMode = 'assistant' | 'builder';

export const useChatWindowStore = defineStore(STORES.CHAT_WINDOW, () => {
	const uiStore = useUIStore();

	// State
	const isOpen = ref<boolean>(false);
	const width = ref<number>(DEFAULT_CHAT_WIDTH);
	const activeMode = ref<ChatWindowMode>('builder');

	// Computed
	const isAssistantModeActive = computed(() => activeMode.value === 'assistant');
	const isBuilderModeActive = computed(() => activeMode.value === 'builder');

	// Actions
	function open(mode?: ChatWindowMode) {
		if (mode) {
			activeMode.value = mode;
		}
		isOpen.value = true;
		// Update UI grid dimensions when opening
		uiStore.appGridDimensions = {
			...uiStore.appGridDimensions,
			width: window.innerWidth - width.value,
		};
	}

	function close() {
		isOpen.value = false;
		// Wait for slide animation to finish before updating grid width
		setTimeout(() => {
			uiStore.appGridDimensions = {
				...uiStore.appGridDimensions,
				width: window.innerWidth,
			};
		}, PANEL_CLOSE_ANIMATION_DURATION);
	}

	function toggle(mode?: ChatWindowMode) {
		if (isOpen.value) {
			close();
		} else {
			open(mode);
		}
	}

	function switchMode(mode: ChatWindowMode) {
		activeMode.value = mode;
	}

	function updateWidth(newWidth: number) {
		const clampedWidth = Math.min(Math.max(newWidth, MIN_CHAT_WIDTH), MAX_CHAT_WIDTH);
		width.value = clampedWidth;
		if (isOpen.value) {
			uiStore.appGridDimensions = {
				...uiStore.appGridDimensions,
				width: window.innerWidth - clampedWidth,
			};
		}
	}

	return {
		// State
		isOpen,
		width,
		activeMode,
		// Computed
		isAssistantModeActive,
		isBuilderModeActive,
		// Actions
		open,
		close,
		toggle,
		switchMode,
		updateWidth,
		// Constants
		DEFAULT_CHAT_WIDTH,
		MIN_CHAT_WIDTH,
		MAX_CHAT_WIDTH,
	};
});
