import { useElementSize } from '@vueuse/core';
import { jsonParse } from 'n8n-workflow';
import type { MaybeRefOrGetter } from 'vue';
import { computed, ref, toRef, toValue, watch } from 'vue';
import type { ResizeData, XYPosition } from '@/Interface';
import type { MainPanelType } from '@/features/ndv/shared/ndv.types';
import { LOCAL_STORAGE_NDV_PANEL_WIDTH } from '@/features/ndv/shared/ndv.constants';

// CSS grid drives the layout. A manual override pins a side to an exact px track;
// when the tracks no longer fit, the grid scrolls horizontally instead of cropping content.
const CENTER_MIN_WIDTH_PX = 280;
const SIDE_MIN_WIDTH_PX = 96;
const SIDE_MAX_WIDTH_PX = 420;
const SIDE_DEFAULT_MAX_PX = 300;

interface UseNdvLayoutOptions {
	grid: MaybeRefOrGetter<HTMLElement | null>;
	hasInputPanel: MaybeRefOrGetter<boolean>;
	paneType: MaybeRefOrGetter<MainPanelType>;
}

type NdvStoredSize = { left: number; main: number; right: number };

const clampSideWidth = (width: number) =>
	Math.min(Math.max(Math.round(width), SIDE_MIN_WIDTH_PX), SIDE_MAX_WIDTH_PX);

export function useNdvLayout(options: UseNdvLayoutOptions) {
	// px; `null` = automatic grid track.
	const leftOverride = ref<number | null>(null);
	const rightOverride = ref<number | null>(null);

	// Snapshot at drag start so pointer moves never read the DOM (no reflow).
	const dragSnapshot = ref({
		containerLeft: 0,
		containerRight: 0,
		center: CENTER_MIN_WIDTH_PX,
	});

	const localStorageKey = computed(
		() => `${LOCAL_STORAGE_NDV_PANEL_WIDTH}_${toValue(options.paneType).toUpperCase()}`,
	);

	const gridSize = useElementSize(options.grid);
	const containerWidth = computed(() => gridSize.width.value);

	const sideTrack = (override: number | null) =>
		override === null
			? `minmax(${SIDE_MIN_WIDTH_PX}px, ${SIDE_DEFAULT_MAX_PX}px)`
			: `${override}px`;

	const gridTemplateColumns = computed(() => {
		const center = `minmax(${CENTER_MIN_WIDTH_PX}px, 1fr)`;
		if (!toValue(options.hasInputPanel)) {
			return `${center} ${sideTrack(rightOverride.value)}`;
		}
		return `${sideTrack(leftOverride.value)} ${center} ${sideTrack(rightOverride.value)}`;
	});

	// Resolved track px — read only at drag start/end, never per move.
	const resolvedWidths = () => {
		const el = toValue(options.grid);
		const columns = el
			? getComputedStyle(el)
					.gridTemplateColumns.split(' ')
					.map((value) => Number.parseFloat(value))
					.filter((value) => Number.isFinite(value))
			: [];
		const hasInput = toValue(options.hasInputPanel);
		return {
			left: hasInput ? (columns[0] ?? 0) : 0,
			center: (hasInput ? columns[1] : columns[0]) ?? CENTER_MIN_WIDTH_PX,
			right: (hasInput ? columns[2] : columns[1]) ?? 0,
		};
	};

	const persistOverrides = () => {
		if (leftOverride.value === null && rightOverride.value === null) {
			localStorage.removeItem(localStorageKey.value);
			return;
		}
		const total = containerWidth.value;
		if (!total) return;

		const { left, center, right } = resolvedWidths();
		const toPercent = (px: number) => (px / total) * 100;
		const value: NdvStoredSize = {
			left: toPercent(left),
			main: toPercent(center),
			right: toPercent(right),
		};
		localStorage.setItem(localStorageKey.value, JSON.stringify(value));
	};

	const isUsableSize = (value: NdvStoredSize | null): value is NdvStoredSize =>
		!!value &&
		Number.isFinite(value.left) &&
		Number.isFinite(value.main) &&
		Number.isFinite(value.right);

	// Loaded once per pane type; px overrides then stay fixed (no rescale on resize).
	const loadedForKey = ref<string | null>(null);

	const loadOverrides = () => {
		const total = containerWidth.value;
		const stored = localStorage.getItem(localStorageKey.value);
		const parsed = stored ? jsonParse<NdvStoredSize | null>(stored, { fallbackValue: null }) : null;

		if (!total || !isUsableSize(parsed)) {
			leftOverride.value = null;
			rightOverride.value = null;
			return;
		}

		const hasInput = toValue(options.hasInputPanel);
		const toPx = (pct: number) => (pct / 100) * total;
		leftOverride.value = hasInput && parsed.left > 0 ? clampSideWidth(toPx(parsed.left)) : null;
		rightOverride.value = parsed.right > 0 ? clampSideWidth(toPx(parsed.right)) : null;
	};

	const maybeLoad = () => {
		if (!containerWidth.value) return;
		if (loadedForKey.value === localStorageKey.value) return;
		loadOverrides();
		loadedForKey.value = localStorageKey.value;
	};

	const onResizeStart = () => {
		const rect = toValue(options.grid)?.getBoundingClientRect();
		dragSnapshot.value = {
			containerLeft: rect?.left ?? 0,
			containerRight: rect?.right ?? 0,
			center: resolvedWidths().center,
		};
	};

	// Side width = pointer distance from the container edge captured at drag start.
	const onResize = (event: ResizeData) => {
		if (event.direction === 'left' && toValue(options.hasInputPanel)) {
			leftOverride.value = clampSideWidth(event.x - dragSnapshot.value.containerLeft);
		} else if (event.direction === 'right') {
			rightOverride.value = clampSideWidth(dragSnapshot.value.containerRight - event.x);
		}
	};

	// Drag grip: move Parameters (keep its width), resplit the two sides.
	const onDrag = (position: XYPosition) => {
		const total = containerWidth.value;
		if (!total) return;

		const center = dragSnapshot.value.center;
		const pointerInContainer = position[0] - dragSnapshot.value.containerLeft;
		const newLeft = clampSideWidth(pointerInContainer - center / 2);
		leftOverride.value = newLeft;
		rightOverride.value = clampSideWidth(total - newLeft - center);
	};

	const resetSide = (side: 'input' | 'output') => {
		if (side === 'input') leftOverride.value = null;
		else rightOverride.value = null;
		persistOverrides();
	};

	const resetAll = () => {
		leftOverride.value = null;
		rightOverride.value = null;
		persistOverrides();
	};

	const onResizeEnd = () => {
		persistOverrides();
	};

	watch([toRef(options.paneType), containerWidth], () => maybeLoad(), { immediate: true });

	return {
		containerWidth,
		gridTemplateColumns,
		onResizeStart,
		onResize,
		onDrag,
		resetSide,
		resetAll,
		onResizeEnd,
	};
}
