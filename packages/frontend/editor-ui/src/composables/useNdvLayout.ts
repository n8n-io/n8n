import { useElementSize } from '@vueuse/core';
import { jsonParse } from 'n8n-workflow';
import type { MaybeRefOrGetter } from 'vue';
import { computed, ref, toRef, toValue, watch } from 'vue';
import type { MainPanelType, ResizeData, XYPosition } from '../Interface';
import { LOCAL_STORAGE_NDV_PANEL_WIDTH } from '../constants';

interface UseNdvLayoutOptions {
	container: MaybeRefOrGetter<HTMLElement | null>;
	hasInputPanel: MaybeRefOrGetter<boolean>;
	paneType: MaybeRefOrGetter<MainPanelType>;
}

type NdvPanelsSize = {
	left: number;
	main: number;
	right: number;
};

export function useNdvLayout(options: UseNdvLayoutOptions) {
	const MIN_MAIN_PANEL_WIDTH_PX = 368;
	const MIN_PANEL_WIDTH_PX = 120;
	const DEFAULT_INPUTLESS_MAIN_WIDTH_PX = 480;
	const DEFAULT_WIDE_MAIN_WIDTH_PX = 640;
	const DEFAULT_REGULAR_MAIN_WIDTH_PX = 420;

	const panelWidthPercentage = ref<NdvPanelsSize>({ left: 40, main: 20, right: 40 });
	const localStorageKey = computed(
		() => `${LOCAL_STORAGE_NDV_PANEL_WIDTH}_${toValue(options.paneType).toUpperCase()}`,
	);

	const containerSize = useElementSize(options.container);

	const containerWidth = computed(() => containerSize.width.value);

	const percentageToPixels = (percentage: number) => {
		return (percentage / 100) * containerWidth.value;
	};

	const pixelsToPercentage = (pixels: number) => {
		return (pixels / containerWidth.value) * 100;
	};

	const minMainPanelWidthPercentage = computed(() => pixelsToPercentage(MIN_MAIN_PANEL_WIDTH_PX));
	const panelWidthPixels = computed(() => ({
		left: percentageToPixels(panelWidthPercentage.value.left),
		main: percentageToPixels(panelWidthPercentage.value.main),
		right: percentageToPixels(panelWidthPercentage.value.right),
	}));
	const minPanelWidthPercentage = computed(() => pixelsToPercentage(MIN_PANEL_WIDTH_PX));

	const defaultPanelSize = computed(() => {
		switch (toValue(options.paneType)) {
			case 'inputless': {
				const main = pixelsToPercentage(DEFAULT_INPUTLESS_MAIN_WIDTH_PX);
				return { left: 0, main, right: 100 - main };
			}
			case 'wide': {
				const main = pixelsToPercentage(DEFAULT_WIDE_MAIN_WIDTH_PX);
				const panels = (100 - main) / 2;
				return { left: panels, main, right: panels };
			}
			case 'dragless':
			case 'unknown':
			case 'regular':
			default: {
				const main = pixelsToPercentage(DEFAULT_REGULAR_MAIN_WIDTH_PX);
				const panels = (100 - main) / 2;
				return { left: panels, main, right: panels };
			}
		}
	});

	const safePanelWidth = ({ left, main, right }: { left: number; main: number; right: number }) => {
		const hasInput = toValue(options.hasInputPanel);
		const minLeft = hasInput ? minPanelWidthPercentage.value : 0;
		const minRight = minPanelWidthPercentage.value;
		const minMain = minMainPanelWidthPercentage.value;

		const newPanelWidth = {
			left: Math.max(minLeft, left),
			main: Math.max(minMain, main),
			right: Math.max(minRight, right),
		};

		const total = newPanelWidth.left + newPanelWidth.main + newPanelWidth.right;

		if (total > 100) {
			const overflow = total - 100;

			const trimLeft = (newPanelWidth.left / (newPanelWidth.left + newPanelWidth.right)) * overflow;
			const trimRight = overflow - trimLeft;

			newPanelWidth.left = Math.max(minLeft, newPanelWidth.left - trimLeft);
			newPanelWidth.right = Math.max(minRight, newPanelWidth.right - trimRight);
		}

		return newPanelWidth;
	};

	const persistPanelSize = () => {
		localStorage.setItem(localStorageKey.value, JSON.stringify(panelWidthPercentage.value));
	};

	const loadPanelSize = () => {
		const storedPanelSizeString = localStorage.getItem(localStorageKey.value);
		const defaultSize = defaultPanelSize.value;
		if (storedPanelSizeString) {
			const storedPanelSize = jsonParse<NdvPanelsSize>(storedPanelSizeString, {
				fallbackValue: defaultSize,
			});
			panelWidthPercentage.value = safePanelWidth(storedPanelSize ?? defaultSize);
		} else {
			panelWidthPercentage.value = safePanelWidth(defaultSize);
		}
	};

	const onResizeEnd = () => {
		persistPanelSize();
	};

	const onResize = (event: ResizeData) => {
		const newMain = Math.max(minMainPanelWidthPercentage.value, pixelsToPercentage(event.width));
		const initialLeft = panelWidthPercentage.value.left;
		const initialMain = panelWidthPercentage.value.main;
		const initialRight = panelWidthPercentage.value.right;
		const diffMain = newMain - initialMain;

		if (event.direction === 'left') {
			const potentialLeft = initialLeft - diffMain;

			if (potentialLeft < minPanelWidthPercentage.value) return;

			const newLeft = Math.max(minPanelWidthPercentage.value, potentialLeft);
			const newRight = initialRight;
			panelWidthPercentage.value = safePanelWidth({
				left: newLeft,
				main: newMain,
				right: newRight,
			});
		} else if (event.direction === 'right') {
			const potentialRight = initialRight - diffMain;

			if (potentialRight < minPanelWidthPercentage.value) return;

			const newRight = Math.max(minPanelWidthPercentage.value, potentialRight);
			const newLeft = initialLeft;
			panelWidthPercentage.value = safePanelWidth({
				left: newLeft,
				main: newMain,
				right: newRight,
			});
		}
	};

	const onDrag = (position: XYPosition) => {
		const newLeft = Math.max(
			minPanelWidthPercentage.value,
			pixelsToPercentage(position[0]) - panelWidthPercentage.value.main / 2,
		);
		const newRight = Math.max(
			minPanelWidthPercentage.value,
			100 - newLeft - panelWidthPercentage.value.main,
		);

		if (newLeft + panelWidthPercentage.value.main + newRight > 100) {
			return;
		}

		panelWidthPercentage.value.left = newLeft;
		panelWidthPercentage.value.right = newRight;
	};

	watch(containerWidth, (newWidth, oldWidth) => {
		if (!newWidth) return;

		if (!oldWidth) {
			loadPanelSize();
		} else {
			panelWidthPercentage.value = safePanelWidth(panelWidthPercentage.value);
		}
	});

	watch(
		toRef(options.paneType),
		() => {
			loadPanelSize();
		},
		{ immediate: true },
	);

	return {
		containerWidth,
		panelWidthPercentage,
		panelWidthPixels,
		onResize,
		onDrag,
		onResizeEnd,
	};
}
