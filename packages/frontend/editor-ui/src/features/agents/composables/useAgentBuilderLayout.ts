import { useDebounceFn, useElementSize } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';

const CHAT_COLLAPSED_KEY = 'agentBuilder.chatColumnCollapsed';
const CHAT_WIDTH_KEY = 'agentBuilder.chatColumnWidth';
const TREE_WIDTH_KEY = 'agentBuilder.treeColumnWidth';
const DEFAULT_CHAT_WIDTH = 460;
const DEFAULT_TREE_WIDTH = 260;
const MIN_CHAT_WIDTH = 320;
const MIN_EDITOR_WIDTH = 420;
const MIN_TREE_WIDTH = 220;
const RESIZE_GRID_SIZE = 8;

/**
 * Three-column shell layout state for the agent builder. Owns persisted panel
 * widths, the chat-column collapse toggle, and the corresponding
 * `grid-template-columns` value.
 */
export function useAgentBuilderLayout() {
	const builderRef = ref<HTMLElement | null>(null);
	const { width: observedBuilderWidth } = useElementSize(builderRef);
	const builderWidth = computed(
		() => observedBuilderWidth.value || builderRef.value?.offsetWidth || 0,
	);
	const chatColumnCollapsed = ref(
		typeof window !== 'undefined' && window.localStorage?.getItem(CHAT_COLLAPSED_KEY) === '1',
	);
	const chatColumnWidth = ref(readStoredNumber(CHAT_WIDTH_KEY, DEFAULT_CHAT_WIDTH));
	const treeColumnWidth = ref(readStoredNumber(TREE_WIDTH_KEY, DEFAULT_TREE_WIDTH));
	const writeChatColumnWidth = useDebounceFn((width: number) => {
		writeStoredNumber(CHAT_WIDTH_KEY, width);
	}, getDebounceTime(DEBOUNCE_TIME.UI.RESIZE));
	const writeTreeColumnWidth = useDebounceFn((width: number) => {
		writeStoredNumber(TREE_WIDTH_KEY, width);
	}, getDebounceTime(DEBOUNCE_TIME.UI.RESIZE));

	const maxChatWidth = computed(() =>
		Math.max(MIN_CHAT_WIDTH, builderWidth.value - treeColumnWidth.value - MIN_EDITOR_WIDTH),
	);
	const maxTreeWidth = computed(() =>
		Math.max(MIN_TREE_WIDTH, builderWidth.value - chatColumnWidth.value - MIN_EDITOR_WIDTH),
	);

	watch(chatColumnCollapsed, (v) => {
		try {
			window.localStorage?.setItem(CHAT_COLLAPSED_KEY, v ? '1' : '0');
		} catch {
			// localStorage may throw in private-browsing modes; silently ignore.
		}
	});

	watch(chatColumnWidth, (width) => {
		void writeChatColumnWidth(width);
	});

	watch(treeColumnWidth, (width) => {
		void writeTreeColumnWidth(width);
	});

	watch([builderRef, builderWidth], () => clampPanelWidths(), { immediate: true });

	const gridColumns = computed(() =>
		chatColumnCollapsed.value
			? `0 minmax(${MIN_EDITOR_WIDTH}px, 1fr) ${treeColumnWidth.value}px`
			: `${chatColumnWidth.value}px minmax(${MIN_EDITOR_WIDTH}px, 1fr) ${treeColumnWidth.value}px`,
	);

	function onToggleChatColumn() {
		chatColumnCollapsed.value = !chatColumnCollapsed.value;
		clampPanelWidths();
	}

	function onChatColumnResize({ width }: { width: number }) {
		chatColumnCollapsed.value = false;
		chatColumnWidth.value = clamp(width, MIN_CHAT_WIDTH, maxChatWidth.value);
		clampPanelWidths();
	}

	function onTreeColumnResize({ width }: { width: number }) {
		treeColumnWidth.value = clamp(width, MIN_TREE_WIDTH, maxTreeWidth.value);
	}

	function clampPanelWidths() {
		if (builderWidth.value <= 0) return;

		treeColumnWidth.value = clamp(treeColumnWidth.value, MIN_TREE_WIDTH, maxTreeWidth.value);
		chatColumnWidth.value = clamp(chatColumnWidth.value, MIN_CHAT_WIDTH, maxChatWidth.value);
	}

	return {
		builderRef,
		chatColumnCollapsed,
		chatColumnWidth,
		treeColumnWidth,
		gridColumns,
		onChatColumnResize,
		onTreeColumnResize,
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
