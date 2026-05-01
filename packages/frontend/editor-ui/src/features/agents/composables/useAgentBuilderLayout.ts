import { useDebounceFn, useElementSize } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';

const CHAT_COLLAPSED_KEY = 'agentBuilder.chatColumnCollapsed';
const CHAT_WIDTH_KEY = 'agentBuilder.chatColumnWidth';
const DEFAULT_CHAT_WIDTH = 460;
const MIN_CHAT_WIDTH = 320;
const MIN_EDITOR_WIDTH = 420;
const RESIZE_GRID_SIZE = 8;

export function useAgentBuilderLayout() {
	const builderRef = ref<HTMLElement | null>(null);
	const { width: observedBuilderWidth } = useElementSize(builderRef);
	const builderWidth = computed(
		() => observedBuilderWidth.value || builderRef.value?.offsetWidth || 0,
	);
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

	const maxChatWidth = computed(() =>
		Math.max(MIN_CHAT_WIDTH, builderWidth.value - MIN_EDITOR_WIDTH),
	);

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

	watch([builderRef, builderWidth], () => clampPanelWidths(), { immediate: true });

	const gridColumns = computed(() =>
		chatColumnCollapsed.value
			? `0 minmax(${MIN_EDITOR_WIDTH}px, 1fr)`
			: `${chatColumnWidth.value}px minmax(${MIN_EDITOR_WIDTH}px, 1fr)`,
	);

	function onToggleChatColumn() {
		chatColumnCollapsed.value = !chatColumnCollapsed.value;
		clampPanelWidths();
	}

	function onChatColumnResize({ width }: { width: number }) {
		chatColumnCollapsed.value = false;
		expandedChatColumnWidth.value = clamp(width, MIN_CHAT_WIDTH, maxChatWidth.value);
		clampPanelWidths();
	}

	function clampPanelWidths() {
		if (builderWidth.value <= 0) return;
		expandedChatColumnWidth.value = clamp(
			expandedChatColumnWidth.value,
			MIN_CHAT_WIDTH,
			maxChatWidth.value,
		);
	}

	return {
		builderRef,
		chatColumnCollapsed,
		chatColumnWidth,
		gridColumns,
		onChatColumnResize,
		onToggleChatColumn,
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

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(value, max));
}
