import { useDebounceFn } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';

const CHAT_COLLAPSED_KEY = 'agentBuilder.chatColumnCollapsed';
const CHAT_WIDTH_KEY = 'agentBuilder.chatColumnWidth';
const DEFAULT_CHAT_WIDTH = 460;
const MIN_CHAT_WIDTH = 320;
const RESIZE_GRID_SIZE = 8;

export function useAgentBuilderLayout() {
	const chatColumnCollapsed = ref(
		typeof window !== 'undefined' && window.localStorage?.getItem(CHAT_COLLAPSED_KEY) === '1',
	);
	const expandedChatColumnWidth = ref(readStoredNumber(CHAT_WIDTH_KEY, DEFAULT_CHAT_WIDTH));
	const chatColumnWidth = computed(() =>
		chatColumnCollapsed.value ? MIN_CHAT_WIDTH : expandedChatColumnWidth.value,
	);
	const writeChatColumnWidth = useDebounceFn((width: number) => {
		writeStoredNumber(CHAT_WIDTH_KEY, width);
	}, getDebounceTime(DEBOUNCE_TIME.UI.RESIZE));

	watch(chatColumnCollapsed, (v) => {
		try {
			window.localStorage?.setItem(CHAT_COLLAPSED_KEY, v ? '1' : '0');
		} catch {
			// localStorage may throw in private-browsing modes; silently ignore.
		}
	});

	watch(expandedChatColumnWidth, (width) => {
		void writeChatColumnWidth(width);
	});

	function onChatColumnResize({ width }: { width: number }) {
		chatColumnCollapsed.value = false;
		expandedChatColumnWidth.value = Math.max(width, MIN_CHAT_WIDTH);
	}

	return {
		chatColumnCollapsed,
		chatColumnWidth,
		onChatColumnResize,
		resizeGridSize: RESIZE_GRID_SIZE,
	};
}

function readStoredNumber(key: string, fallback: number) {
	if (typeof window === 'undefined') return fallback;

	try {
		const storedValue = Number(window.localStorage?.getItem(key));

		return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : fallback;
	} catch {
		// localStorage may throw in private-browsing modes; silently ignore.
		return fallback;
	}
}

function writeStoredNumber(key: string, value: number) {
	try {
		window.localStorage?.setItem(key, String(Math.round(value)));
	} catch {
		// localStorage may throw in private-browsing modes; silently ignore.
	}
}
