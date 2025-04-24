import type { Ref } from 'vue';
import { ref, computed, onMounted, onBeforeUnmount, watchEffect } from 'vue';
import { useDebounce } from '@/composables/useDebounce';
import type { IChatResizeStyles } from '../types/chat';
import { useStorage } from '@/composables/useStorage';
import { type ResizeData } from '@n8n/design-system';

export const LOCAL_STORAGE_PANEL_HEIGHT = 'N8N_CANVAS_CHAT_HEIGHT';
export const LOCAL_STORAGE_PANEL_WIDTH = 'N8N_CANVAS_CHAT_WIDTH';
export const LOCAL_STORAGE_OVERVIEW_PANEL_WIDTH = 'N8N_LOGS_OVERVIEW_PANEL_WIDTH';

// Percentage of container width for chat panel constraints
const MAX_WIDTH_PERCENTAGE = 0.8;
const MIN_WIDTH_PERCENTAGE = 0.3;

// Percentage of window height for panel constraints
const MIN_HEIGHT_PERCENTAGE = 0.3;
const MAX_HEIGHT_PERCENTAGE = 0.75;

export function useResize(container: Ref<HTMLElement | undefined>) {
	const storage = {
		height: useStorage(LOCAL_STORAGE_PANEL_HEIGHT),
		width: useStorage(LOCAL_STORAGE_PANEL_WIDTH),
	};

	const dimensions = {
		container: ref(0), // Container width
		minHeight: ref(0),
		maxHeight: ref(0),
		chat: ref(0), // Chat panel width
		logs: ref(0),
		height: ref(0),
	};

	/** Computed styles for root element based on current dimensions */
	const rootStyles = computed<IChatResizeStyles>(() => ({
		'--panel-height': `${dimensions.height.value}px`,
		'--chat-width': `${dimensions.chat.value}px`,
	}));

	const panelToContainerRatio = computed(() => {
		const chatRatio = dimensions.chat.value / dimensions.container.value;
		const containerRatio = dimensions.container.value / window.screen.width;
		return {
			chat: chatRatio.toFixed(2),
			logs: (1 - chatRatio).toFixed(2),
			container: containerRatio.toFixed(2),
		};
	});

	/**
	 * Constrains height to min/max bounds and updates panel height
	 */
	function onResize(newHeight: number) {
		const { minHeight, maxHeight } = dimensions;
		dimensions.height.value = Math.min(Math.max(newHeight, minHeight.value), maxHeight.value);
	}

	function onResizeDebounced(data: ResizeData) {
		void useDebounce().callDebounced(onResize, { debounceTime: 10, trailing: true }, data.height);
	}

	/**
	 * Constrains chat width to min/max percentage of container width
	 */
	function onResizeChat(width: number) {
		const containerWidth = dimensions.container.value;
		const maxWidth = containerWidth * MAX_WIDTH_PERCENTAGE;
		const minWidth = containerWidth * MIN_WIDTH_PERCENTAGE;

		dimensions.chat.value = Math.min(Math.max(width, minWidth), maxWidth);
		dimensions.logs.value = dimensions.container.value - dimensions.chat.value;
	}

	function onResizeChatDebounced(data: ResizeData) {
		void useDebounce().callDebounced(
			onResizeChat,
			{ debounceTime: 10, trailing: true },
			data.width,
		);
	}
	/**
	 * Initializes dimensions from localStorage if available
	 */
	function restorePersistedDimensions() {
		const persistedHeight = parseInt(storage.height.value ?? '0', 10);
		const persistedWidth = parseInt(storage.width.value ?? '0', 10);

		if (persistedHeight) onResize(persistedHeight);
		if (persistedWidth) onResizeChat(persistedWidth);
	}

	/**
	 * Updates container width and height constraints on window resize
	 */
	function onWindowResize() {
		if (!container.value) return;

		// Update container width and adjust chat panel if needed
		dimensions.container.value = container.value.getBoundingClientRect().width;
		onResizeChat(dimensions.chat.value);

		// Update height constraints and adjust panel height if needed
		dimensions.minHeight.value = window.innerHeight * MIN_HEIGHT_PERCENTAGE;
		dimensions.maxHeight.value = window.innerHeight * MAX_HEIGHT_PERCENTAGE;
		onResize(dimensions.height.value);
	}

	// Persist dimensions to localStorage when they change
	watchEffect(() => {
		const { chat, height } = dimensions;
		if (chat.value > 0) storage.width.value = chat.value.toString();
		if (height.value > 0) storage.height.value = height.value.toString();
	});

	// Initialize dimensions when container is available
	watchEffect(() => {
		if (container.value) {
			onWindowResize();
			restorePersistedDimensions();
		}
	});

	// Window resize handling
	onMounted(() => window.addEventListener('resize', onWindowResize));
	onBeforeUnmount(() => window.removeEventListener('resize', onWindowResize));

	return {
		height: dimensions.height,
		chatWidth: dimensions.chat,
		logsWidth: dimensions.logs,
		rootStyles,
		onWindowResize,
		onResizeDebounced,
		onResizeChatDebounced,
		panelToContainerRatio,
	};
}
