import { useElementSize } from '@vueuse/core';
import { jsonParse } from 'n8n-workflow';
import type { MaybeRefOrGetter } from 'vue';
import { computed, ref, toRef, toValue, watch } from 'vue';
import type { ResizeData, XYPosition } from '@/Interface';
import type { MainPanelType } from '@/features/ndv/shared/ndv.types';
import { LOCAL_STORAGE_NDV_PANEL_WIDTH } from '@/features/ndv/shared/ndv.constants';

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

	const isUsablePanelSize = (size: NdvPanelsSize | null | undefined): size is NdvPanelsSize =>
		!!size &&
		Number.isFinite(size.left) &&
		Number.isFinite(size.main) &&
		Number.isFinite(size.right);

	const safePanelWidth = ({ left, main, right }: { left: number; main: number; right: number }) => {
		const hasInput = toValue(options.hasInputPanel);
		const minLeft = hasInput ? minPanelWidthPercentage.value : 0;
		const minRight = minPanelWidthPercentage.value;
		const minMain = minMainPanelWidthPercentage.value;
		const minimumScale = Math.min(1, 100 / (minLeft + minMain + minRight));
		const safeMinLeft = minLeft * minimumScale;
		const safeMinRight = minRight * minimumScale;
		const safeMinMain = minMain * minimumScale;

		const newMain = Math.min(Math.max(safeMinMain, main), 100 - safeMinLeft - safeMinRight);
		const newLeft = hasInput ? Math.max(safeMinLeft, left) : 0;
		const newRight = Math.max(safeMinRight, right);
		const sideSpace = 100 - newMain;
		const sides = newLeft + newRight;
		const leftShare = newLeft / sides;
		const adjustedLeft = Math.min(
			sideSpace - safeMinRight,
			Math.max(safeMinLeft, newLeft + (sideSpace - sides) * leftShare),
		);

		return { left: adjustedLeft, main: newMain, right: sideSpace - adjustedLeft };
	};

	const persistPanelSize = () => {
		// Before the container is measured the sizes are placeholders, not something
		// the user chose — persisting them would overwrite their actual layout.
		if (!containerWidth.value || !isUsablePanelSize(panelWidthPercentage.value)) return;

		localStorage.setItem(localStorageKey.value, JSON.stringify(panelWidthPercentage.value));
	};

	const loadPanelSize = () => {
		if (!containerWidth.value) return;

		const storedPanelSizeString = localStorage.getItem(localStorageKey.value);
		const defaultSize = defaultPanelSize.value;
		if (storedPanelSizeString) {
			const storedPanelSize = jsonParse<NdvPanelsSize>(storedPanelSizeString, {
				fallbackValue: defaultSize,
			});
			panelWidthPercentage.value = safePanelWidth(
				isUsablePanelSize(storedPanelSize) ? storedPanelSize : defaultSize,
			);
		} else {
			panelWidthPercentage.value = safePanelWidth(defaultSize);
		}
	};

	const onResizeEnd = () => {
		persistPanelSize();
	};

	const resetPanelSize = () => {
		localStorage.removeItem(localStorageKey.value);
		panelWidthPercentage.value = safePanelWidth(defaultPanelSize.value);
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

	watch(containerWidth, (newWidth) => {
		if (!newWidth) return;

		loadPanelSize();
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
		resetPanelSize,
	};
}
