import { type ResizeData } from '@n8n/design-system';
import { useLocalStorage } from '@vueuse/core';
import { computed, type MaybeRef, ref, unref, watch } from 'vue';

type GetSize = number | ((containerSize: number) => number);

interface UseResizablePanelOptions {
	/**
	 * Container element, to which relative size is calculated (doesn't necessarily have to be DOM parent node)
	 */
	container: MaybeRef<HTMLElement | null>;
	/**
	 * Default size in pixels
	 */
	defaultSize: GetSize;
	/**
	 * Minimum size in pixels
	 */
	minSize?: GetSize;
	/**
	 * Maximum size in pixels
	 */
	maxSize?: GetSize;
	/**
	 * Which end of the container the resizable element itself is located
	 */
	position?: 'left' | 'bottom';
	/**
	 * If set to true, snaps to default size when resizing close to it
	 */
	snap?: boolean;
	/**
	 * If set to true, resizing beyond minSize sets size to 0 and isCollapsed to true
	 * until onResizeEnd is called
	 */
	allowCollapse?: boolean;
	/**
	 * If set to true, resizing beyond maxSize sets size to the container size and
	 * isFullSize to true until onResizeEnd is called
	 */
	allowFullSize?: boolean;
}

export function useResizablePanel(
	localStorageKey: string,
	{
		container,
		defaultSize,
		snap = true,
		minSize = 0,
		maxSize = (size) => size,
		position = 'left',
		allowCollapse,
		allowFullSize,
	}: UseResizablePanelOptions,
) {
	const containerSize = ref(0);
	const persistedSize = useLocalStorage(localStorageKey, -1, { writeDefaults: false });
	const isResizing = ref(false);
	const sizeOnResizeStart = ref<number>();
	const minSizeValue = computed(() => resolveSize(minSize, containerSize.value));
	const maxSizeValue = computed(() => resolveSize(maxSize, containerSize.value));
	const constrainedSize = computed(() => {
		const sizeInPixels =
			persistedSize.value >= 0 && persistedSize.value <= 1
				? containerSize.value * persistedSize.value
				: -1;

		if (isResizing.value && allowCollapse && sizeInPixels < 30) {
			return 0;
		}

		if (isResizing.value && allowFullSize && sizeInPixels > containerSize.value - 30) {
			return containerSize.value;
		}

		const defaultSizeValue = resolveSize(defaultSize, containerSize.value);

		if (Number.isNaN(sizeInPixels) || !Number.isFinite(sizeInPixels) || sizeInPixels < 0) {
			return defaultSizeValue;
		}

		return Math.max(
			minSizeValue.value,
			Math.min(
				snap && Math.abs(defaultSizeValue - sizeInPixels) < 30 ? defaultSizeValue : sizeInPixels,
				maxSizeValue.value,
			),
		);
	});

	function getSize(el: { width: number; height: number }) {
		return position === 'bottom' ? el.height : el.width;
	}

	function getOffsetSize(el: { offsetWidth: number; offsetHeight: number }) {
		return position === 'bottom' ? el.offsetHeight : el.offsetWidth;
	}

	function getValue(data: { x: number; y: number }) {
		return position === 'bottom' ? data.y : data.x;
	}

	function resolveSize(getter: GetSize, containerSizeValue: number): number {
		return typeof getter === 'number' ? getter : getter(containerSizeValue);
	}

	function onResize(data: ResizeData) {
		const containerRect = unref(container)?.getBoundingClientRect();
		const newSizeInPixels = Math.max(
			0,
			position === 'bottom'
				? (containerRect ? getSize(containerRect) : 0) - getValue(data)
				: getValue(data) - (containerRect ? getValue(containerRect) : 0),
		);

		isResizing.value = true;
		persistedSize.value = newSizeInPixels / containerSize.value;

		if (sizeOnResizeStart.value === undefined) {
			sizeOnResizeStart.value = persistedSize.value;
		}
	}

	function onResizeEnd() {
		// If resizing ends with either collapsing or maximizing the panel, restore size at the start of dragging
		if (
			(minSizeValue.value > 0 && constrainedSize.value <= 0) ||
			(maxSizeValue.value < containerSize.value && constrainedSize.value >= containerSize.value)
		) {
			persistedSize.value = sizeOnResizeStart.value;
		}

		sizeOnResizeStart.value = undefined;
		isResizing.value = false;
	}

	watch(
		() => unref(container),
		(el, _, onCleanUp) => {
			if (!el) {
				return;
			}

			const observer = new ResizeObserver(() => {
				containerSize.value = getOffsetSize(el);
			});

			observer.observe(el);

			containerSize.value = getOffsetSize(el);

			onCleanUp(() => observer.disconnect());
		},
		{ immediate: true },
	);

	return {
		isResizing: computed(() => isResizing.value),
		isCollapsed: computed(() => isResizing.value && constrainedSize.value <= 0),
		isFullSize: computed(() => isResizing.value && constrainedSize.value >= containerSize.value),
		size: constrainedSize,
		onResize,
		onResizeEnd,
	};
}
