import { type ResizeData } from '@n8n/design-system';
import { useLocalStorage } from '@vueuse/core';
import { computed, type MaybeRef, ref, unref, watch } from 'vue';

type GetSize = number | ((containerSize: number) => number);

interface UseResizerV2Options {
	/**
	 * Container element, to which relative size is calculated (doesn't necessarily have to be DOM parent node)
	 */
	container: MaybeRef<HTMLElement | null>;
	defaultSize: GetSize;
	minSize?: GetSize;
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
	}: UseResizerV2Options,
) {
	const containerSize = ref(0);
	const size = useLocalStorage(localStorageKey, -1, { writeDefaults: false });
	const isResizing = ref(false);
	const constrainedSize = computed(() => {
		if (isResizing.value && allowCollapse && size.value < 30) {
			return 0;
		}

		if (isResizing.value && allowFullSize && size.value > containerSize.value - 30) {
			return containerSize.value;
		}

		const defaultSizeValue = resolveSize(defaultSize, containerSize.value);

		if (Number.isNaN(size.value) || size.value < 0) {
			return defaultSizeValue;
		}

		const minSizeValue = resolveSize(minSize, containerSize.value);
		const maxSizeValue = resolveSize(maxSize, containerSize.value);

		return Math.max(
			minSizeValue,
			Math.min(
				snap && Math.abs(defaultSizeValue - size.value) < 30 ? defaultSizeValue : size.value,
				maxSizeValue,
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

		isResizing.value = true;
		size.value = Math.max(
			0,
			position === 'bottom'
				? (containerRect ? getSize(containerRect) : 0) - getValue(data)
				: getValue(data) - (containerRect ? getValue(containerRect) : 0),
		);
	}

	function onResizeEnd() {
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

	watch(containerSize, (newValue, oldValue) => {
		if (size.value > 0 && oldValue > 0) {
			// Update size to maintain proportion
			const ratio = size.value / oldValue;

			size.value = Math.round(newValue * ratio);
		}
	});

	return {
		isResizing: computed(() => isResizing.value),
		isCollapsed: computed(() => isResizing.value && constrainedSize.value <= 0),
		isFullSize: computed(() => isResizing.value && constrainedSize.value >= containerSize.value),
		size: constrainedSize,
		onResize,
		onResizeEnd,
	};
}
